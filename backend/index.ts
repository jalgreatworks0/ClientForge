/**
 * Server Entry Point
 * Initializes and starts the Express server
 */

import { Server } from './api/server'
import { logger } from './utils/logging/logger'
import { appConfig } from '../config/app/app-config'

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting ClientForge CRM server...', {
      environment: appConfig.env,
      nodeVersion: process.version,
    })

    const server = new Server()
    await server.start()

    logger.info('Server initialization complete', {
      port: appConfig.port,
      apiVersion: appConfig.apiVersion,
      environment: appConfig.env,
    })
  } catch (error) {
    logger.error('Failed to start server', { error })
    process.exit(1)
  }
}

// Start the server
startServer()
