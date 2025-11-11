/**
 * Server Entry Point - Module Registry Powered
 *
 * ✨ NEW: Plugin architecture - modules self-register
 * To add a module: add 1 line
 * To remove a module: comment out 1 line
 */

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import { appConfig } from '../config/app/app-config';
import { initializeMongoCollections } from '../config/database/mongodb-config';
import { initializeSearchIndexes } from '../config/database/elasticsearch-config';

import { logger } from './utils/logging/logger';
import { Server } from './api/server';
import { moduleRegistry } from './core/modules/ModuleRegistry';

// Import all modules (they self-register)
import { coreModule } from './modules/core/module';
import { billingModule } from './modules/billing/billing.module';
import { gdprModule } from './modules/compliance/gdpr.module';
import { customFieldsModule } from './modules/custom-fields/custom-fields.module';
import { importExportModule } from './modules/import-export/import-export.module';
import { initializeTier2Modules } from './modules/tier2-modules';

/**
 * Start the server with module system
 */
async function startServer(): Promise<void> {
  try {
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('🚀 ClientForge CRM Server Starting (Module System)');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('Starting ClientForge CRM server...', {
      environment: appConfig.env,
      nodeVersion: process.version,
    });

    // Initialize MongoDB collections with indexes and TTL
    try {
      await initializeMongoCollections();
      logger.info('[OK] MongoDB collections initialized');

      // Verify collections were created successfully
      const { getMongoDatabase } = require('../config/database/mongodb-config');
      const db = await getMongoDatabase();
      const collections = await db.listCollections().toArray();
      const collectionNames = collections.map((c: any) => c.name);

      logger.info('[OK] MongoDB verification complete', {
        collections: collectionNames,
        count: collectionNames.length
      });

      // Ensure minimum required collections exist
      const requiredCollections = ['audit_logs', 'event_logs', 'error_logs', 'activity_logs'];
      const missingCollections = requiredCollections.filter(name => !collectionNames.includes(name));

      if (missingCollections.length > 0) {
        throw new Error(`MongoDB initialization incomplete: missing collections ${missingCollections.join(', ')}`);
      }
    } catch (error) {
      logger.error('[CRITICAL] MongoDB initialization failed - logging infrastructure unavailable', { error });
      process.exit(1);
    }

    // Initialize Elasticsearch indexes
    try {
      await initializeSearchIndexes();
      logger.info('[OK] Elasticsearch indexes initialized');
    } catch (error) {
      logger.warn('[WARNING] Elasticsearch initialization failed (non-critical):', error);
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MODULE REGISTRATION
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ✨ To add a module: add 1 line
    // ✨ To remove a module: comment out 1 line
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    logger.info('[ModuleRegistry] Registering modules...');

    // Core module (wraps all existing routes)
    // moduleRegistry.register(gdprModule);  // MOVED TO END
    moduleRegistry.register(customFieldsModule);
    moduleRegistry.register(importExportModule);
    moduleRegistry.register(billingModule);
    moduleRegistry.register(coreModule);  // MUST BE FIRST
    moduleRegistry.register(gdprModule);  // After core

    // Future modules can be added here:
    // moduleRegistry.register(reportingModule);
    // moduleRegistry.register(campaignsModule);
    // moduleRegistry.register(workflowsModule);

    const moduleCount = moduleRegistry.getModules().length;
    const moduleNames = moduleRegistry.getModules().map(m => `${m.name}@${m.version}`).join(', ');

    logger.info(`[ModuleRegistry] ✅ Modules registered: ${moduleCount}`);
    logger.info(`[ModuleRegistry] Modules: ${moduleNames}`);

    // Start server (will initialize modules)
    const server = new Server(moduleRegistry);
    await server.start();

    // Initialize Tier 2 modules (Email, Notifications, Activities, Search)
    logger.info('[Tier 2] Initializing Tier 2 systems...');
    await initializeTier2Modules(server.getHttpServer());
    logger.info('[Tier 2] All Tier 2 systems initialized');

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('✅ Server Ready');
    logger.info(`Port: ${appConfig.port}`);
    logger.info(`Environment: ${appConfig.env}`);
    logger.info(`API Version: ${appConfig.apiVersion}`);
    logger.info(`URL: ${appConfig.url}`);
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      try {
        // Shutdown all modules
        await moduleRegistry.shutdownAll();
        logger.info('[OK] All modules shut down');

        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error: any) {
    logger.error('Failed to start server', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start server
startServer();
