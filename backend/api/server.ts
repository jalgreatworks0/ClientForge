/**
 * Express Server
 * Main server setup and configuration
 */

import { createServer, Server as HTTPServer } from 'http'

import express, { Application } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import compression from 'compression'

import { corsConfig } from '../../config/security/cors-config'
import { appConfig } from '../../config/app/app-config'
import { logger } from '../utils/logging/logger'
import { errorHandler, setupGlobalErrorHandlers } from '../utils/errors/error-handler'
import { performanceMonitoring } from '../middleware/performance-monitoring'
import { websocketService } from '../services/websocket/websocket.service'
import { queueService } from '../services/queue/queue.service'

import { configureRoutes } from './routes'

export class Server {
  private app: Application
  private httpServer: HTTPServer

  constructor() {
    this.app = express()
    this.httpServer = createServer(this.app)
    this.setupMiddleware()
    this.setupRoutes()
    this.setupErrorHandling()
    setupGlobalErrorHandlers()
    this.initializeServices()
  }

  /**
   * Initialize WebSocket and Queue services
   */
  private initializeServices(): void {
    try {
      // Initialize WebSocket server
      websocketService.initialize(this.httpServer)
      logger.info('[OK] WebSocket service initialized')

      // Initialize Job Queue service
      queueService.initialize()
      logger.info('[OK] Job Queue service initialized')
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
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
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

    // Performance monitoring middleware
    this.app.use(performanceMonitoring)

    logger.info('[OK] Middleware configured')
  }

  /**
   * Configure routes
   */
  private setupRoutes(): void {
    configureRoutes(this.app)
    logger.info('[OK] Routes configured')
  }

  /**
   * Configure error handling
   */
  private setupErrorHandling(): void {
    // 404 handler - must be after all routes
    this.app.use((req, res) => {
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
  }

  /**
   * Start server
   */
  public async start(): Promise<void> {
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
    return this.app
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
