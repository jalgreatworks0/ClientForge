/**
 * Express Server with Module Registry
 *
 * ✨ NEW: Modules register their own routes
 * Core server is pure infrastructure - no hardcoded route imports
 */

import { createServer, Server as HTTPServer } from 'http'

import express, { Application, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'

import { corsConfig } from '../../config/security/cors-config'
import { appConfig } from '../../config/app/app-config'
import { logger } from '../utils/logging/logger'
import { errorHandler, setupGlobalErrorHandlers } from '../utils/errors/error-handler'
import { performanceMonitoring } from '../middleware/performance-monitoring'
import { metricsMiddleware } from '../services/monitoring/metrics.service'
import { websocketService } from '../services/websocket/websocket.service'
import { queueService } from '../services/queue/queue.service'

import { ModuleRegistry } from '../core/modules/ModuleRegistry'
import { ModuleContext } from '../core/modules/ModuleContract'
import { eventBus } from '../core/modules/EventBus'
import { featureFlags } from '../core/modules/FeatureFlags'
import { getPool } from '../database/postgresql/pool'
import { esClient } from '../../config/database/elasticsearch-config'
import { queueRegistry } from '../../config/queue/bullmq.config'

export class Server {
  private app: Application
  private httpServer: HTTPServer
  private moduleRegistry: ModuleRegistry

  constructor(moduleRegistry: ModuleRegistry) {
    this.app = express()
    this.httpServer = createServer(this.app)
    this.moduleRegistry = moduleRegistry

    this.setupMiddleware()
    setupGlobalErrorHandlers()
  }

  /**
   * Initialize WebSocket and Queue services
   */
  private async initializeServices(): Promise<void> {
    try {
      // Initialize WebSocket server
      websocketService.initialize(this.httpServer)
      logger.info('[OK] WebSocket service initialized')

//       // Initialize Job Queue service
//       await Promise.race([queueService.initialize(), new Promise((resolve) => setTimeout(() => { logger.warn("Queue initialization timeout, continuing..."); resolve(); }, 10000))])
//       logger.info('[OK] Job Queue service initialized')
    } catch (error) {
      logger.error('Failed to initialize services', { error })
      throw error
    }
  }

  /**
   * Configure middleware
   */
  private setupMiddleware(): void {
    // Trust proxy (for running behind reverse proxy)
    this.app.set('trust proxy', 1)

    // Security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'http://localhost:3000', 'ws://localhost:3000'],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      })
    )

    // CORS
    this.app.use(cors(corsConfig))

    // Body parsing
    this.app.use(express.json({ limit: appConfig.maxRequestSize }))
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: appConfig.maxRequestSize,
      })
    )

    // Compression
    this.app.use(compression())

    // Prometheus metrics middleware (before performance monitoring)
    this.app.use(metricsMiddleware)

    // Performance monitoring middleware
    this.app.use(performanceMonitoring)

    logger.info('[OK] Middleware configured')
  }

  /**
   * Start server
   */
  public async start(): Promise<void> {
    // Initialize services before starting HTTP server
    await this.initializeServices()

    // Create module context (what each module gets)
    const context: ModuleContext = {
      db: getPool(),
      esClient,
      queueRegistry: {
        getQueue: (name: string) => queueRegistry.getQueue(name),
        createQueue: (name: string, options?: any) => queueRegistry.createQueue(name, options),
        createWorker: (queueName: string, processor: any, options?: any) =>
          queueRegistry.createWorker(queueName, processor, options),
      },
      events: eventBus,
      logger,
      featureFlags: {
        isEnabled: featureFlags.isEnabled.bind(featureFlags),
        getConfig: featureFlags.getConfig.bind(featureFlags),
      },
      getModule: (name: string) => this.moduleRegistry.getModule(name),
      env: process.env,
      config: appConfig,
    }

    // Initialize all modules (migrations, init, event handlers)
    await this.moduleRegistry.initializeAll(context)

    // Let each module register its routes
    logger.info('[Server] Registering module routes...')
    for (const module of this.moduleRegistry.getModules()) {
      logger.info(`[Server] ⏳ Registering routes for module: ${module.name}`)
      module.registerRoutes(this.app, context)
      logger.info(`[Server] ✅ Routes registered for module: ${module.name}`)

      // Register jobs if module has them
      if (module.registerJobs) {
        logger.info(`[Server] ⏳ Registering jobs for module: ${module.name}`)
        await module.registerJobs(context)
        logger.info(`[Server] ✅ Jobs registered for module: ${module.name}`)
      }
    }

    // Module system health & info endpoints
    this.app.get('/api/v1/health', async (req: Request, res: Response) => {
      const health: any = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        modules: {},
        features: {},
      }

      for (const module of this.moduleRegistry.getModules()) {
        if (module.healthCheck) {
          try {
            health.modules[module.name] = await module.healthCheck(context)
          } catch (error) {
            health.modules[module.name] = false
          }
        } else {
          health.modules[module.name] = 'no-check'
        }
      }

      const flags = featureFlags.getAllFlags()
      for (const [name, config] of flags) {
        health.features[name] = config.enabled
      }

      const allHealthy = Object.values(health.modules).every(v => v === true || v === 'no-check')
      health.status = allHealthy ? 'healthy' : 'degraded'

      res.status(allHealthy ? 200 : 503).json(health)
    })

    this.app.get('/api/v1/modules', async (req: Request, res: Response) => {
      const modules = this.moduleRegistry.getModules().map(m => ({
        name: m.name,
        version: m.version,
        dependencies: m.dependencies,
        optionalDependencies: m.optionalDependencies || [],
        metadata: m.metadata,
      }))

      res.json({
        data: modules,
        loadOrder: this.moduleRegistry.getLoadOrder().map(m => m.name),
      })
    })

    this.app.get('/api/v1/events/stats', async (req: Request, res: Response) => {
      res.json({
        data: eventBus.getStats(),
      })
    })

    // 404 handler - must be after all routes
    this.app.use((req: Request, res: Response) => {
      res.status(404).json({
        success: false,
        error: {
          message: 'Route not found',
          statusCode: 404,
          path: req.path,
        },
      })
    })

    // Global error handler - must be last
    this.app.use(errorHandler)

    logger.info('[OK] Error handling configured')

    return new Promise((resolve) => {
      this.httpServer.listen(appConfig.port, () => {
        logger.info(`[READY] Server running on port ${appConfig.port}`)
        logger.info(`[ENV] Environment: ${appConfig.env}`)
        logger.info(`[API] API Version: ${appConfig.apiVersion}`)
        logger.info(`[URL] URL: ${appConfig.url}`)
        resolve()
      })
    })
  }

  /**
   * Stop server gracefully
   */
  public async stop(): Promise<void> {
    try {
      // Shutdown services first
      await websocketService.shutdown()
      logger.info('WebSocket service shut down')

      await queueService.shutdown()
      logger.info('Job Queue service shut down')
    } catch (error) {
      logger.error('Error shutting down services', { error })
    }

    return new Promise((resolve, reject) => {
      this.httpServer.close((err) => {
        if (err) {
          logger.error('Failed to stop server', { error: err })
          reject(err)
        } else {
          logger.info('Server stopped gracefully')
          resolve()
        }
      })
    })
  }

  /**
   * Get Express app instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Get HTTP server instance
   */
  public getHttpServer(): HTTPServer {
    return this.httpServer;
  }
}

/**
 * Start server if this file is executed directly
 */
if (require.main === module) {
  const server = new Server()

  server.start().catch((error) => {
    logger.error('Failed to start server', { error })
    process.exit(1)
  })

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down gracefully...')
    await server.stop()
    process.exit(0)
  })
}
