/**
 * Server Entry Point
 * Initializes and starts the Express server
 */

// Load environment variables from .env file
import dotenv from 'dotenv'
dotenv.config()

import { appConfig } from '../config/app/app-config'
import { initializeMongoCollections } from '../config/database/mongodb-config'
import { initializeSearchIndexes } from '../config/database/elasticsearch-config'

import { logger } from './utils/logging/logger'
import { Server } from './api/server'

/**
 * Start the server
 */
async function startServer(): Promise<void> {
  try {
    logger.info('Starting ClientForge CRM server...', {
      environment: appConfig.env,
      nodeVersion: process.version,
    })

    // Initialize MongoDB collections with indexes and TTL
    try {
      await initializeMongoCollections()
      logger.info('[OK] MongoDB collections initialized')
    } catch (error) {
      logger.warn('[WARNING] MongoDB initialization failed (non-critical):', error)
    }

    // Initialize Elasticsearch indexes
    try {
      await initializeSearchIndexes()
      logger.info('[OK] Elasticsearch indexes initialized')
    } catch (error) {
      logger.warn('[WARNING] Elasticsearch initialization failed (non-critical):', error)
    }

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
