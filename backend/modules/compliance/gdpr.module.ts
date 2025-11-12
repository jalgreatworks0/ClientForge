/**
 * GDPR Compliance Module
 * Handles data subject rights and consent management
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { Express } from 'express';

import { IModule, ModuleContext, ModuleHealth } from '../../core/modules/ModuleContract';
import gdprRoutes from '../../api/rest/v1/routes/gdpr-routes';
import { logger } from '../../utils/logging/logger';
import { GDPRService } from '../../services/compliance/gdpr.service';


export class GDPRModule implements IModule {
  name = 'gdpr';
  version = '1.0.0';
  dependencies: string[] = [];

  private gdprService: GDPRService;

  constructor() {
    this.gdprService = new GDPRService();
  }

  async initialize(context: ModuleContext): Promise<void> {
    logger.info('[GDPR Module] Initializing GDPR compliance module...');

    // Verify required environment variables
    this.verifyEnvironmentVariables(context);

    // Create required directories
    await this.createDirectories();

    // Run database migrations
    await this.runMigrations(context);

    logger.info('[GDPR Module] GDPR compliance module initialized successfully');
  }

  registerRoutes(app: Express, context: ModuleContext): void {
    logger.info('[GDPR Module] Registering GDPR routes...');

    // Register GDPR routes
    app.use('/api/v1/gdpr', gdprRoutes);

    logger.info('[GDPR Module] GDPR routes registered');
  }

  registerEventHandlers(context: ModuleContext): void {
    logger.info('[GDPR Module] Registering GDPR event handlers...');

    // Listen for user deletion events
    context.eventBus?.on('user:deleted', async (data: any) => {
      logger.info('[GDPR Module] User deletion event received', {
        userId: data.userId,
        tenantId: data.tenantId,
      });

      // Automatically create erasure request
      try {
        await this.gdprService.requestDataErasure(
          data.tenantId,
          data.email,
          data.deletedBy || data.userId
        );

        logger.info('[GDPR Module] Auto-created erasure request for deleted user', {
          userId: data.userId,
        });
      } catch (error: any) {
        logger.error('[GDPR Module] Failed to auto-create erasure request', {
          error: error.message,
          userId: data.userId,
        });
      }
    });

    // Listen for consent change events
    context.eventBus?.on('consent:changed', async (data: any) => {
      logger.info('[GDPR Module] Consent change event received', {
        userId: data.userId,
        consentType: data.consentType,
        granted: data.granted,
      });

      // Record consent in database
      try {
        await this.gdprService.recordConsent(
          data.tenantId,
          data.userId,
          data.consentType,
          data.granted,
          {
            ipAddress: data.ipAddress,
            userAgent: data.userAgent,
          }
        );
      } catch (error: any) {
        logger.error('[GDPR Module] Failed to record consent', {
          error: error.message,
        });
      }
    });

    logger.info('[GDPR Module] GDPR event handlers registered');
  }

  async healthCheck(): Promise<ModuleHealth> {
    try {
      // Check database connectivity
      await this.gdprService['pool'].query('SELECT 1');

      // Check if export directory is writable
      const exportDir = path.join(process.cwd(), 'storage', 'gdpr-exports');
      await fs.access(exportDir, fs.constants.W_OK);

      return {
        status: 'ok',
        message: 'GDPR module healthy',
        details: {
          database: 'connected',
          exportDirectory: 'writable',
        },
      };
    } catch (error: any) {
      logger.error('[GDPR Module] Health check failed', {
        error: error.message,
      });

      return {
        status: 'down',
        message: 'Health check failed',
        details: {
          error: error.message,
        },
      };
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[GDPR Module] Shutting down GDPR module...');

    // No cleanup needed - pool is managed by main application

    logger.info('[GDPR Module] GDPR module shut down successfully');
  }

  // =============================================================================
  // PRIVATE HELPER METHODS
  // =============================================================================

  private verifyEnvironmentVariables(context: ModuleContext): void {
    const required = ['DATABASE_URL'];

    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `[GDPR Module] Missing required environment variables: ${missing.join(', ')}`
      );
    }

    logger.info('[GDPR Module] Environment variables verified');
  }

  private async createDirectories(): Promise<void> {
    const directories = [
      path.join(process.cwd(), 'storage', 'gdpr-exports'),
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.info(`[GDPR Module] Created directory: ${dir}`);
      } catch (error: any) {
        logger.error(`[GDPR Module] Failed to create directory: ${dir}`, {
          error: error.message,
        });
        throw error;
      }
    }
  }

  private async runMigrations(context: ModuleContext): Promise<void> {
    logger.info('[GDPR Module] Running GDPR database migrations...');

    try {
      const migrationPath = path.join(
        process.cwd(),
        'database',
        'migrations',
        '014_gdpr_compliance.sql'
      );

      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

      // Execute migration
      await this.gdprService['pool'].query(migrationSQL);

      logger.info('[GDPR Module] Database migrations completed');
    } catch (error: any) {
      // If migration file doesn't exist or migration fails, log warning and continue
      // The tables may already exist from a previous migration
      logger.warn('[GDPR Module] Migration skipped', {
        error: error.message,
        reason: 'Tables may already exist or migration file missing'
      });
    }
  }
}

// Export singleton instance
export const gdprModule = new GDPRModule();
