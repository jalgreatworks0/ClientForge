/**
 * MongoDB Configuration
 * Logs, events, and flexible schema data
 */

import { MongoClient, MongoClientOptions, Db } from 'mongodb'
import { logger } from '../../backend/utils/logging/logger'

export interface MongoDBConfig {
  uri: string
  dbName: string
  options: MongoClientOptions
}

export const mongodbConfig: MongoDBConfig = {
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/clientforge_logs',
  dbName: process.env.MONGODB_DB_NAME || 'clientforge_logs',
  options: {
    maxPoolSize: 10,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    retryReads: true,
  },
}

/**
 * Create and export MongoDB client
 */
let client: MongoClient | null = null
let db: Db | null = null

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(mongodbConfig.uri, mongodbConfig.options)

    try {
      await client.connect()
      logger.info('[MongoDB] Connected successfully')

      // Handle connection events
      client.on('error', (error) => {
        logger.error('[MongoDB] Connection error', { error: error instanceof Error ? error.message : String(error) })
      })

      client.on('close', () => {
        logger.warn('[MongoDB] Connection closed')
      })

      client.on('reconnect', () => {
        logger.info('[MongoDB] Reconnected successfully')
      })
    } catch (error) {
      logger.error('[MongoDB] Failed to connect', { error: error instanceof Error ? error.message : String(error) })
      throw error
    }
  }

  return client
}

/**
 * Get MongoDB database instance
 */
export async function getMongoDatabase(): Promise<Db> {
  if (!db) {
    const mongoClient = await getMongoClient()
    db = mongoClient.db(mongodbConfig.dbName)
  }

  return db
}

/**
 * Close MongoDB connection
 */
export async function closeMongoClient(): Promise<void> {
  if (client) {
    await client.close()
    client = null
    db = null
    logger.info('[MongoDB] Connection closed')
  }
}

/**
 * Test MongoDB connection
 */
export async function testMongoConnection(): Promise<boolean> {
  try {
    const mongoClient = await getMongoClient()
    await mongoClient.db('admin').command({ ping: 1 })
    logger.info('[MongoDB] Connection test successful')
    return true
  } catch (error) {
    logger.error('[MongoDB] Connection test failed', { error: error instanceof Error ? error.message : String(error) })
    return false
  }
}

/**
 * Initialize MongoDB collections and indexes
 */
export async function initializeMongoCollections(): Promise<void> {
  try {
    const database = await getMongoDatabase()

    // Create collections if they don't exist
    const collections = ['audit_logs', 'event_logs', 'error_logs', 'activity_logs']

    for (const collectionName of collections) {
      try {
        const collectionExists = (await database.listCollections({ name: collectionName }).toArray()).length > 0

        if (!collectionExists) {
          await database.createCollection(collectionName)
          logger.info(`[MongoDB] Created collection: ${collectionName}`)
        }
      } catch (collError) {
        // Skip authentication errors - MongoDB might not be configured with auth
        if (collError instanceof Error && collError.message.includes('authentication')) {
          logger.debug(`[MongoDB] Skipping collection ${collectionName} - authentication required`)
          continue
        }
        throw collError
      }
    }

    // Create indexes (skip if authentication error)
    try {
      await database.collection('audit_logs').createIndexes([
        { key: { tenant_id: 1, created_at: -1 } },
        { key: { user_id: 1, created_at: -1 } },
        { key: { action: 1, created_at: -1 } },
        { key: { created_at: -1 }, expireAfterSeconds: 7776000 }, // 90 days TTL
      ])

      await database.collection('event_logs').createIndexes([
        { key: { event_type: 1, created_at: -1 } },
        { key: { tenant_id: 1, created_at: -1 } },
        { key: { created_at: -1 }, expireAfterSeconds: 2592000 }, // 30 days TTL
      ])

      await database.collection('error_logs').createIndexes([
        { key: { level: 1, created_at: -1 } },
        { key: { tenant_id: 1, created_at: -1 } },
        { key: { created_at: -1 }, expireAfterSeconds: 2592000 }, // 30 days TTL
      ])

      logger.info('[MongoDB] Collections and indexes initialized')
    } catch (indexError) {
      // Skip authentication errors
      if (indexError instanceof Error && indexError.message.includes('authentication')) {
        logger.debug('[MongoDB] Skipping index creation - authentication required')
        return
      }
      throw indexError
    }
  } catch (error) {
    logger.error('[MongoDB] Failed to initialize collections', { error: error instanceof Error ? error.message : String(error) })
    throw error
  }
}

export default mongodbConfig
