/**
 * MongoDB Configuration
 * Logs, events, and flexible schema data
 */

import { MongoClient, MongoClientOptions, Db } from 'mongodb'

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
      console.log('✅ MongoDB connected')

      // Handle connection events
      client.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error)
      })

      client.on('close', () => {
        console.log('⚠️ MongoDB connection closed')
      })

      client.on('reconnect', () => {
        console.log('✅ MongoDB reconnected')
      })
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error)
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
    console.log('MongoDB connection closed')
  }
}

/**
 * Test MongoDB connection
 */
export async function testMongoConnection(): Promise<boolean> {
  try {
    const mongoClient = await getMongoClient()
    await mongoClient.db('admin').command({ ping: 1 })
    console.log('✅ MongoDB connection test successful')
    return true
  } catch (error) {
    console.error('❌ MongoDB connection test failed:', error)
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
      const collectionExists = (await database.listCollections({ name: collectionName }).toArray()).length > 0

      if (!collectionExists) {
        await database.createCollection(collectionName)
        console.log(`✅ Created MongoDB collection: ${collectionName}`)
      }
    }

    // Create indexes
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

    console.log('✅ MongoDB collections and indexes initialized')
  } catch (error) {
    console.error('❌ Failed to initialize MongoDB collections:', error)
    throw error
  }
}

export default mongodbConfig
