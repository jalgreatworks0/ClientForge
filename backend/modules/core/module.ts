/**
 * Core Module
 * Wraps all existing routes in a single module for initial migration
 * This allows us to use the module system without rewriting every route file
 */

import { Express } from 'express';
import { register } from 'prom-client';

import { IModule, ModuleContext, ModuleHealth } from '../../core/modules/ModuleContract';
import { logger } from '../../utils/logging/logger';
import { getPool } from '../../database/postgresql/pool';
import { performanceStatsEndpoint } from '../../middleware/performance-monitoring';


// Import all existing routes
import authRoutes from '../../api/rest/v1/routes/auth-routes';
import healthRoutes from '../../api/rest/v1/routes/health-routes';
import contactsRoutes from '../../api/rest/v1/routes/contacts-routes';
import accountsRoutes from '../../api/rest/v1/routes/accounts-routes';
import dealsRoutes from '../../api/rest/v1/routes/deals-routes';
import pipelinesRoutes from '../../api/rest/v1/routes/pipelines-routes';
import dealStagesRoutes from '../../api/rest/v1/routes/deal-stages-routes';
import tasksRoutes from '../../api/rest/v1/routes/tasks-routes';
import activitiesRoutes from '../../api/rest/v1/routes/activities-routes';
import notesRoutes from '../../api/rest/v1/routes/notes-routes';
import commentsRoutes from '../../api/rest/v1/routes/comments-routes';
import tagsRoutes from '../../api/rest/v1/routes/tags-routes';
import customFieldsRoutes from '../../api/rest/v1/routes/custom-fields-routes';
import aiRoutes from '../../api/rest/v1/routes/ai-routes';
import aiFeaturesRoutes from '../../api/rest/v1/routes/ai-features-routes';
import searchRoutes from '../../api/rest/v1/routes/search-routes';
import emailRoutes from '../../api/rest/v1/routes/email-routes';
import filesRoutes from '../../api/rest/v1/routes/files-routes';
import emailTrackingRoutes from '../../api/rest/v1/routes/email-tracking-routes';
import analyticsSimpleRoutes from '../../api/rest/v1/routes/analytics-simple-routes';
import { createAnalyticsRoutes } from '../../api/rest/v1/routes/analytics-routes';
import ssoRoutes from '../../api/rest/v1/routes/sso-routes';
import notificationsRoutes from '../../api/rest/v1/routes/notifications-routes';
import activityTimelineRoutes from '../../api/rest/v1/routes/activity-timeline-routes';
import searchV2Routes from '../../api/rest/v1/routes/search-v2-routes';

export class CoreModule implements IModule {
  name = 'core';
  version = '1.0.0';
  dependencies: string[] = [];

  metadata = {
    description: 'Core CRM functionality - all existing routes wrapped in module system',
    author: 'ClientForge Team',
    tags: ['core', 'crm', 'contacts', 'deals', 'analytics'],
  };

  async initialize(context: ModuleContext): Promise<void> {
    context.logger.info('Core module initialized - wrapping existing routes');
  }

  registerRoutes(app: Express, context: ModuleContext): void {
    const apiPrefix = `/api/v1`;

    context.logger.info('[Core] Registering health routes...');
    // Health check routes (no auth required)
    app.use(`${apiPrefix}/health`, healthRoutes);

    context.logger.info('[Core] Registering performance routes...');
    // Performance stats endpoint (no auth required - for monitoring)
    app.get(`${apiPrefix}/performance`, performanceStatsEndpoint);

    context.logger.info('[Core] Registering metrics endpoint...');
    // Prometheus metrics endpoint (no auth required - for Prometheus scraping)
    app.get('/metrics', async (req, res) => {
      try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
      } catch (error) {
        res.status(500).end(error);
      }
    });

    context.logger.info('[Core] Registering auth routes...');
    // Authentication routes (public)
    app.use(`${apiPrefix}/auth`, authRoutes);
    app.use(`${apiPrefix}/auth`, ssoRoutes); // SSO & MFA routes

    context.logger.info('[Core] Registering AI routes...');
    // AI routes (authentication required) - Albedo AI assistant
    app.use(`${apiPrefix}/ai`, aiRoutes);
    app.use(`${apiPrefix}/ai`, aiFeaturesRoutes);

    context.logger.info('[Core] Registering search routes...');
    // Search routes (authentication required) - Elasticsearch unified search
    app.use(`${apiPrefix}/search`, searchRoutes);

    context.logger.info('[Core] Registering email routes...');
    // Email integration routes (authentication required) - Gmail & Outlook
    app.use(`${apiPrefix}/email`, emailRoutes);
    app.use(`${apiPrefix}/email-tracking`, emailTrackingRoutes);

    context.logger.info('[Core] Registering file routes...');
    // File storage routes (authentication required) - Secure signed URLs only
    app.use(`${apiPrefix}/files`, filesRoutes);

    context.logger.info('[Core] Registering CRM routes...');
    // CRM routes (authentication required)
    app.use(`${apiPrefix}/contacts`, contactsRoutes);
    app.use(`${apiPrefix}/accounts`, accountsRoutes);
    app.use(`${apiPrefix}/deals`, dealsRoutes);
    app.use(`${apiPrefix}/pipelines`, pipelinesRoutes);
    app.use(`${apiPrefix}/deal-stages`, dealStagesRoutes);
    app.use(`${apiPrefix}/tasks`, tasksRoutes);
    app.use(`${apiPrefix}/activities`, activitiesRoutes);

    context.logger.info('[Core] Registering metadata routes...');
    // Metadata routes (authentication required)
    app.use(`${apiPrefix}/notes`, notesRoutes);
    app.use(`${apiPrefix}/comments`, commentsRoutes);
    app.use(`${apiPrefix}/tags`, tagsRoutes);
    app.use(`${apiPrefix}/custom-fields`, customFieldsRoutes);

    context.logger.info('[Core] Registering analytics routes (simple)...');
    // Analytics routes (authentication required)
    app.use(`${apiPrefix}/analytics`, analyticsSimpleRoutes);
    context.logger.info('[Core] Getting database pool for analytics...');
    const pool = getPool();
    context.logger.info('[Core] Creating analytics routes with pool...');
    app.use(`${apiPrefix}/analytics`, createAnalyticsRoutes(pool));

    // Tier 2 Systems Routes
    app.use(`${apiPrefix}/notifications`, notificationsRoutes);
    app.use(`${apiPrefix}/timeline`, activityTimelineRoutes);
    app.use(`${apiPrefix}/search/v2`, searchV2Routes);

    context.logger.info('Core module routes registered (all existing endpoints)');
  }

  async healthCheck(context: ModuleContext): Promise<ModuleHealth> {
    try {
      // Check database connection
      const result = await context.db.query('SELECT 1');
      return result.rows.length > 0
        ? { status: 'ok', message: 'Database connection healthy' }
        : { status: 'down', message: 'Database query returned no rows' };
    } catch (error) {
      return {
        status: 'down',
        message: 'Database connection failed',
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[Core] Module shutdown complete');
  }
}

// Export singleton
export const coreModule = new CoreModule();
