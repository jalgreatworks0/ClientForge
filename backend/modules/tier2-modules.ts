/**
 * Tier 2 Modules Registration
 * Email, Notifications, Activities, Search
 *
 * NOTE: These modules are legacy and being migrated to the new ModuleRegistry system.
 * Routes for these features are already registered by the Core module.
 */

import { EventEmitter } from 'events';
import { Server as HTTPServer } from 'http';

import { logger } from '../utils/logging/logger';

// Global event emitter for inter-module communication
export const globalEventEmitter = new EventEmitter();
globalEventEmitter.setMaxListeners(50); // Increase for many modules

/**
 * Initialize Tier 2 modules
 *
 * TEMPORARY: Tier 2 modules use a different architecture than the main ModuleRegistry system.
 * For now, we skip initialization because:
 * 1. Routes are already registered by the Core module
 * 2. WebSocket is already initialized by Server
 * 3. Event handlers can be added to Core module when needed
 *
 * TODO: Migrate notifications, activities, and search modules to IModule interface
 */
export async function initializeTier2Modules(httpServer: HTTPServer): Promise<void> {
  try {
    logger.info('[Tier 2] Tier 2 modules initialization skipped (routes already registered by Core module)');
    logger.info('[Tier 2] WebSocket service already initialized by Server');
    logger.info('[Tier 2] All Tier 2 systems ready');
  } catch (error: any) {
    logger.error('[Tier 2] Failed to initialize Tier 2 modules', {
      error: error.message,
      stack: error.stack,
    });
    // Don't fail the whole app if Tier 2 modules fail
    logger.warn('[Tier 2] Continuing without Tier 2 modules');
  }
}

/**
 * Shutdown Tier 2 modules
 */
export async function shutdownTier2Modules(): Promise<void> {
  logger.info('[Tier 2] Shutting down Tier 2 modules...');
  // Cleanup if needed
}
