/**
 * Module Registry - Manages module lifecycle and dependencies
 * Handles: registration, dependency resolution, initialization, shutdown
 */

import { logger } from '../../utils/logging/logger';

import { IModule, IModuleRegistry, ModuleContext, ModuleError } from './ModuleContract';

export class ModuleRegistry implements IModuleRegistry {
  private modules: Map<string, IModule> = new Map();
  private initializedModules: Set<string> = new Set();
  private loadOrder: IModule[] = [];

  /**
   * Register a module
   * Validates module structure and dependencies
   */
  register(module: IModule): void {
    // Validation
    if (!module.name) {
      throw this.createError('Module name is required', 'unknown', 'register');
    }

    if (this.modules.has(module.name)) {
      throw this.createError(
        `Module '${module.name}' is already registered`,
        module.name,
        'register'
      );
    }

    if (!module.version) {
      throw this.createError(
        `Module '${module.name}' must have a version`,
        module.name,
        'register'
      );
    }

    if (!Array.isArray(module.dependencies)) {
      throw this.createError(
        `Module '${module.name}' dependencies must be an array`,
        module.name,
        'register'
      );
    }

    // Register module
    this.modules.set(module.name, module);
    logger.info(`[ModuleRegistry] Registered: ${module.name} v${module.version}`);

    if (module.metadata?.description) {
      logger.info(`[ModuleRegistry]   └─ ${module.metadata.description}`);
    }
  }

  /**
   * Get module by name
   */
  getModule(name: string): IModule | undefined {
    return this.modules.get(name);
  }

  /**
   * Get all registered modules
   */
  getModules(): IModule[] {
    return Array.from(this.modules.values());
  }

  /**
   * Check if module exists
   */
  hasModule(name: string): boolean {
    return this.modules.has(name);
  }

  /**
   * Get module load order (dependency-sorted)
   */
  getLoadOrder(): IModule[] {
    return this.loadOrder;
  }

  /**
   * Unregister a module at runtime
   * WARNING: Does not remove database tables or routes
   */
  unregister(name: string): void {
    if (!this.modules.has(name)) {
      logger.warn(`[ModuleRegistry] Cannot unregister unknown module: ${name}`);
      return;
    }

    // Check if other modules depend on this one
    const dependents = this.getModules().filter(m =>
      m.dependencies.includes(name)
    );

    if (dependents.length > 0) {
      const names = dependents.map(m => m.name).join(', ');
      throw this.createError(
        `Cannot unregister '${name}' - required by: ${names}`,
        name,
        'register'
      );
    }

    this.modules.delete(name);
    this.initializedModules.delete(name);
    logger.info(`[ModuleRegistry] Unregistered: ${name}`);
  }

  /**
   * Initialize all modules in dependency order
   * Uses topological sort to ensure dependencies load first
   * Resilient: Logs errors for failed modules but continues with others
   */
  async initializeAll(context: ModuleContext): Promise<void> {
    logger.info('[ModuleRegistry] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('[ModuleRegistry] Starting module initialization');
    logger.info('[ModuleRegistry] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Resolve dependencies (topological sort)
    try {
      this.loadOrder = this.resolveDependencies();
      logger.info(`[ModuleRegistry] Load order: ${this.loadOrder.map(m => m.name).join(' → ')}`);
    } catch (error: any) {
      logger.error('[ModuleRegistry] Failed to resolve dependencies', { error: error.message });
      throw error;
    }

    // Initialize each module in order - resilient to individual failures
    const failedModules: string[] = [];
    for (const module of this.loadOrder) {
      try {
        await this.initializeModule(module, context);
      } catch (error: any) {
        // Log failure but continue with other modules
        failedModules.push(module.name);
        logger.warn(`[ModuleRegistry] Skipping module due to initialization error: ${module.name}`);
      }
    }

    logger.info('[ModuleRegistry] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    const successCount = this.initializedModules.size;
    const totalCount = this.modules.size;
    
    if (failedModules.length === 0) {
      logger.info(`[ModuleRegistry] ✅ All modules initialized (${successCount}/${totalCount})`);
    } else {
      logger.warn(`[ModuleRegistry] ⚠️ Partial initialization: ${successCount}/${totalCount} modules`);
      logger.warn(`[ModuleRegistry] Failed modules: ${failedModules.join(', ')}`);
      logger.warn(`[ModuleRegistry] Server will continue with available modules`);
    }
    logger.info('[ModuleRegistry] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /**
   * Initialize a single module
   * Resilient: Catches and logs errors without throwing migration errors
   */
  private async initializeModule(module: IModule, context: ModuleContext): Promise<void> {
    const startTime = Date.now();

    try {
      logger.info(`[ModuleRegistry] 🔄 Initializing: ${module.name}`);

      // Create module-specific context
      const moduleContext: ModuleContext = {
        ...context,
        logger: this.createModuleLogger(module.name, context.logger),
      };

      // Phase 1: Run migrations (non-blocking - skip if they fail)
      if (module.migrate) {
        logger.info(`[ModuleRegistry]   ├─ Running migrations...`);
        try {
          await module.migrate(moduleContext);
        } catch (migError: any) {
          logger.warn(`[ModuleRegistry]   ├─ ⚠️ Migrations failed: ${migError.message}`);
          logger.warn(`[ModuleRegistry]   ├─ Continuing anyway - migrations might be optional or already applied`);
          // Don't throw - continue initialization
        }
      }

      // Phase 2: Initialize module
      logger.info(`[ModuleRegistry]   ├─ Initializing...`);
      await module.initialize(moduleContext);

      // Phase 3: Register event handlers
      if (module.registerEventHandlers) {
        logger.info(`[ModuleRegistry]   ├─ Registering event handlers...`);
        await module.registerEventHandlers(moduleContext);
      }

      // Mark as initialized
      this.initializedModules.add(module.name);

      const duration = Date.now() - startTime;
      logger.info(`[ModuleRegistry]   └─ ✅ Complete (${duration}ms)`);

    } catch (error: any) {
      const duration = Date.now() - startTime;
      logger.error(`[ModuleRegistry]   └─ ❌ Failed (${duration}ms)`, {
        module: module.name,
        error: error.message,
        stack: error.stack,
      });

      // Re-throw to let caller decide what to do
      throw this.createError(
        `Failed to initialize: ${error.message}`,
        module.name,
        'initialize'
      );
    }
  }

  /**
   * Topological sort - resolve module dependencies
   * Ensures modules load in correct order
   */
  private resolveDependencies(): IModule[] {
    const sorted: IModule[] = [];
    const visited: Set<string> = new Set();
    const visiting: Set<string> = new Set();

    const visit = (moduleName: string, path: string[] = []): void => {
      // Already processed
      if (visited.has(moduleName)) return;

      // Circular dependency detected
      if (visiting.has(moduleName)) {
        const cycle = [...path, moduleName].join(' → ');
        throw new Error(`Circular dependency detected: ${cycle}`);
      }

      visiting.add(moduleName);
      const module = this.modules.get(moduleName);

      if (!module) {
        throw new Error(`Module not found: ${moduleName}`);
      }

      // Visit required dependencies first
      for (const dep of module.dependencies) {
        if (!this.modules.has(dep)) {
          throw new Error(
            `Module '${moduleName}' requires missing dependency '${dep}'`
          );
        }
        visit(dep, [...path, moduleName]);
      }

      // Check optional dependencies (warn if missing, don't fail)
      if (module.optionalDependencies) {
        for (const optDep of module.optionalDependencies) {
          if (!this.modules.has(optDep)) {
            logger.warn(
              `[ModuleRegistry] Module '${moduleName}' has missing optional dependency '${optDep}'`
            );
          }
        }
      }

      visiting.delete(moduleName);
      visited.add(moduleName);
      sorted.push(module);
    };

    // Visit all modules
    for (const [moduleName] of this.modules) {
      visit(moduleName);
    }

    return sorted;
  }

  /**
   * Graceful shutdown - shut down modules in reverse order
   */
  async shutdownAll(): Promise<void> {
    logger.info('[ModuleRegistry] Starting graceful shutdown...');

    // Shutdown in reverse order (dependencies last)
    const modules = [...this.loadOrder].reverse();

    for (const module of modules) {
      if (module.shutdown) {
        try {
          logger.info(`[ModuleRegistry] Shutting down: ${module.name}`);
          await module.shutdown();
          logger.info(`[ModuleRegistry]   └─ ✅ ${module.name} stopped`);
        } catch (error: any) {
          logger.error(`[ModuleRegistry]   └─ ❌ Error shutting down ${module.name}`, {
            error: error.message,
          });
        }
      }
    }

    logger.info('[ModuleRegistry] All modules shut down');
  }

  /**
   * Create module-specific logger
   */
  private createModuleLogger(moduleName: string, baseLogger: any): any {
    return {
      info: (msg: string, data?: any) =>
        baseLogger.info(`[${moduleName}] ${msg}`, data),
      warn: (msg: string, data?: any) =>
        baseLogger.warn(`[${moduleName}] ${msg}`, data),
      error: (msg: string, data?: any) =>
        baseLogger.error(`[${moduleName}] ${msg}`, data),
      debug: (msg: string, data?: any) =>
        baseLogger.debug(`[${moduleName}] ${msg}`, data),
    };
  }

  /**
   * Create typed error
   */
  private createError(message: string, moduleName: string, phase: any): ModuleError {
    const error = new Error(message) as ModuleError;
    error.moduleName = moduleName;
    error.phase = phase;
    return error;
  }
}

// Export singleton
export const moduleRegistry = new ModuleRegistry();
