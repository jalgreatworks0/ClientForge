/**
 * Initialize All Databases
 * Run this script to set up MongoDB collections and Elasticsearch indexes
 */

import { initializeMongoCollections } from '../../config/database/mongodb-config'
import { initializeSearchIndexes } from '../../config/database/elasticsearch-config'

async function initializeDatabases() {
  console.log('[INIT] Starting database initialization...')

  try {
    // Initialize MongoDB collections with indexes and TTL
    console.log('[MONGO] Initializing MongoDB collections...')
    await initializeMongoCollections()
    console.log('[OK] MongoDB collections initialized')

    // Initialize Elasticsearch indexes
    console.log('[ELASTIC] Initializing Elasticsearch indexes...')
    await initializeSearchIndexes()
    console.log('[OK] Elasticsearch indexes initialized')

    console.log('[SUCCESS] All databases initialized successfully')
    process.exit(0)
  } catch (error) {
    console.error('[ERROR] Database initialization failed:', error)
    process.exit(1)
  }
}

initializeDatabases()
