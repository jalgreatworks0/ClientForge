/**
 * Auth Module
 * Authentication and authorization module
 */

import { Express } from 'express';

import { IModule, ModuleContext, ModuleHealth } from '../../core/modules/ModuleContract';
import { logger } from '../../utils/logging/logger';
import authRoutes from '../../api/rest/v1/routes/auth-routes';

export class AuthModule implements IModule {
  name = 'auth';
  version = '1.0.0';
  dependencies: string[] = []; // Auth has no dependencies

  metadata = {
    description: 'Authentication and authorization with JWT + sessions',
    author: 'ClientForge Team',
    tags: ['auth', 'security', 'jwt'],
  };

  async initialize(context: ModuleContext): Promise<void> {
    context.logger.info('Auth module initialized');

    // Register feature flag for optional 2FA
    context.featureFlags.register('two-factor-auth', {
      enabled: false,
      rolloutPercentage: 0,
    });
  }

  registerRoutes(app: Express, context: ModuleContext): void {
    // Auth routes are already configured in the router
    // Just mount them at the base path
    app.use('/api/v1/auth', authRoutes);

    context.logger.info('Auth routes registered');
  }

  async healthCheck(context: ModuleContext): Promise<ModuleHealth> {
    try {
      // Simple health check: verify users table exists
      const result = await context.db.query('SELECT 1 FROM users LIMIT 1');
      return { status: 'ok', message: 'Users table accessible' };
    } catch (error) {
      return {
        status: 'down',
        message: 'Users table not accessible',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  async shutdown(): Promise<void> {
    // Cleanup if needed
    logger.info('[Auth] Module shutdown complete');
  }
}

// Export singleton
export const authModule = new AuthModule();
