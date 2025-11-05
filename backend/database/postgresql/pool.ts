/**
 * PostgreSQL Connection Pool
 * Manages database connections with connection pooling
 */

import { Pool, PoolConfig } from 'pg'
import { logger } from '../../utils/logging/logger'

// Get database configuration from environment
const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/clientforge',
  max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
  min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
}

// Create singleton pool instance
let pool: Pool | null = null

/**
 * Get or create the PostgreSQL connection pool
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool(config)

    // Log pool errors
    pool.on('error', (err) => {
      logger.error('Unexpected database pool error', { error: err })
    })

    // Log successful connection (only once)
    pool.on('connect', () => {
      logger.debug('New database client connected to pool')
    })

    logger.info('✅ PostgreSQL connection pool initialized', {
      max: config.max,
      min: config.min,
    })
  }

  return pool
}

/**
 * Close the connection pool
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    logger.info('PostgreSQL connection pool closed')
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const testPool = getPool()
    const result = await testPool.query('SELECT NOW()')
    logger.info('✅ Database connection successful', {
      timestamp: result.rows[0].now,
    })
    return true
  } catch (error) {
    logger.error('❌ Database connection failed', { error })
    return false
  }
}
