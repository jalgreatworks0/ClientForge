/**
 * Custom Fields Module
 */

import { IModule, ModuleContext, ModuleHealth } from '../../core/modules/ModuleContract';
import { Express } from 'express';
import customFieldsRoutes from '../../api/rest/v1/routes/custom-fields-routes';
import { logger } from '../../utils/logging/logger';
import { CustomFieldService } from '../../services/custom-fields/custom-field.service';
import * as fs from 'fs/promises';
import * as path from 'path';

export class CustomFieldsModule implements IModule {
  name = 'custom-fields';
  version = '1.0.0';
  dependencies: string[] = [];

  private customFieldService: CustomFieldService;

  constructor() {
    this.customFieldService = new CustomFieldService();
  }

  async initialize(context: ModuleContext): Promise<void> {
    logger.info('[CustomFields Module] Initializing...');
    await this.runMigrations(context);
    logger.info('[CustomFields Module] Initialized');
  }

  registerRoutes(app: Express, context: ModuleContext): void {
    app.use('/api/v1/custom-fields', customFieldsRoutes);
    logger.info('[CustomFields Module] Routes registered');
  }

  registerEventHandlers(context: ModuleContext): void {
    const entityTypes = ['contact', 'deal', 'company', 'lead', 'ticket', 'project'];
    entityTypes.forEach((entityType) => {
      context.eventBus?.on(`${entityType}:deleted`, async (data: any) => {
        const fields = await this.customFieldService.getCustomFields(data.tenantId, entityType);
        for (const field of fields) {
          await this.customFieldService.deleteCustomFieldValue(data.tenantId, field.id, data.entityId);
        }
      });
    });
  }

  async healthCheck(): Promise<ModuleHealth> {
    try {
      await this.customFieldService['pool'].query('SELECT 1');
      return { status: 'ok', message: 'Custom Fields module healthy', details: { database: 'connected' } };
    } catch (error: any) {
      return { status: 'down', message: 'Health check failed', details: { error: error.message } };
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[CustomFields Module] Shutdown');
  }

  private async runMigrations(context: ModuleContext): Promise<void> {
    try {
      const migrationPath = path.join(process.cwd(), 'database', 'migrations', '015_custom_fields.sql');
      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');
      await this.customFieldService['pool'].query(migrationSQL);
      logger.info('[CustomFields Module] Migrations completed');
    } catch (error: any) {
      // If migration file doesn't exist or migration fails, log warning and continue
      // The tables may already exist from a previous migration
      logger.warn('[CustomFields Module] Migration skipped', {
        error: error.message,
        reason: 'Tables may already exist or migration file missing'
      });
    }
  }
}

export const customFieldsModule = new CustomFieldsModule();
