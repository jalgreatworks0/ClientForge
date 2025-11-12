/**
 * Module Contract - Interface for all ClientForge modules
 * Every module must implement IModule to be loadable
 */

import { EventEmitter } from 'events';

import { Express } from 'express';
import { Pool } from 'pg';
import { Queue } from 'bullmq';
import { Client as ElasticsearchClient } from '@elastic/elasticsearch';

export interface ModuleContext {
  // Database access
  db: Pool;

  // Elasticsearch client
  esClient: ElasticsearchClient;

  // Queue registry (BullMQ)
  queueRegistry: {
    getQueue(name: string): Queue | undefined;
    createQueue(name: string, options?: any): Promise<Queue>;
    createWorker(queueName: string, processor: any, options?: any): any;
  };

  // Event bus for inter-module communication
  events: EventEmitter;

  // Logger with module namespace
  logger: {
    info(msg: string, data?: any): void;
    warn(msg: string, data?: any): void;
    error(msg: string, data?: any): void;
    debug(msg: string, data?: any): void;
  };

  // Feature flags
  featureFlags: {
    isEnabled(flag: string, userId?: string, tenantId?: string): Promise<boolean>;
    getConfig(flag: string): Promise<any>;
  };

  // Get other modules (dependency injection)
  getModule(name: string): IModule | undefined;

  // Environment variables
  env: NodeJS.ProcessEnv;

  // App configuration
  config: any;
}

export interface IModule {
  /**
   * Unique module identifier
   * Examples: 'contacts', 'deals', 'email', 'reporting', 'campaigns'
   */
  name: string;

  /**
   * Module version (semver)
   */
  version: string;

  /**
   * Module dependencies (other modules required)
   * Module won't load if dependencies are missing
   */
  dependencies: string[];

  /**
   * Optional dependencies (modules that enhance this module if present)
   */
  optionalDependencies?: string[];

  /**
   * Initialize module (called on server start)
   * Use this to:
   * - Set up event listeners
   * - Initialize caches
   * - Start background tasks
   */
  initialize(context: ModuleContext): Promise<void>;

  /**
   * Register HTTP routes with Express
   * Module registers its own routes - no need to edit core files!
   */
  registerRoutes(app: Express, context: ModuleContext): void;

  /**
   * Register background jobs/workers (optional)
   */
  registerJobs?(context: ModuleContext): Promise<void>;

  /**
   * Register event handlers (optional)
   * Listen to events from other modules
   */
  registerEventHandlers?(context: ModuleContext): void;

  /**
   * Run database migrations (optional)
   * Create/update tables for this module
   */
  migrate?(context: ModuleContext): Promise<void>;

  /**
   * Graceful shutdown (optional)
   * Clean up resources when server stops
   */
  shutdown?(): Promise<void>;

  /**
   * Health check (optional)
   * Return module health status
   */
  healthCheck?(context: ModuleContext): Promise<ModuleHealth>;

  /**
   * Module metadata (optional)
   */
  metadata?: {
    description?: string;
    author?: string;
    homepage?: string;
    tags?: string[];
  };
}

export interface IModuleRegistry {
  /**
   * Register a module
   */
  register(module: IModule): void;

  /**
   * Get a registered module by name
   */
  getModule(name: string): IModule | undefined;

  /**
   * Get all registered modules
   */
  getModules(): IModule[];

  /**
   * Initialize all modules in dependency order
   */
  initializeAll(context: ModuleContext): Promise<void>;

  /**
   * Unregister a module at runtime
   */
  unregister(name: string): void;

  /**
   * Gracefully shutdown all modules
   */
  shutdownAll(): Promise<void>;

  /**
   * Check if module is registered
   */
  hasModule(name: string): boolean;

  /**
   * Get module load order (respects dependencies)
   */
  getLoadOrder(): IModule[];
}

export interface ModuleHealth {
  status: 'ok' | 'degraded' | 'down';
  message?: string;
  details?: Record<string, any>;
}

export interface ModuleError extends Error {
  moduleName: string;
  phase: 'register' | 'initialize' | 'migrate' | 'routes' | 'jobs' | 'shutdown';
}
