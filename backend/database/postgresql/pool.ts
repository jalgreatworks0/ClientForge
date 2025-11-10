/**
 * PostgreSQL Connection Pool
 * Manages database connections with connection pooling
 */

import { Pool, PoolConfig } from 'pg'

import { logger } from '../../utils/logging/logger'

// Get database configuration from environment
const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/clientforge',
  max: parseInt(process.env.DATABASE_POOL_MAX || '20', 10), // Increased for better concurrency
  min: parseInt(process.env.DATABASE_POOL_MIN || '5', 10), // Increased minimum for faster response
  idleTimeoutMillis: parseInt(process.env.DATABASE_IDLE_TIMEOUT || '30000', 10),
  connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECT_TIMEOUT || '5000', 10), // Increased timeout
  statement_timeout: parseInt(process.env.DATABASE_STATEMENT_TIMEOUT || '30000', 10), // 30s query timeout
  query_timeout: parseInt(process.env.DATABASE_QUERY_TIMEOUT || '30000', 10), // 30s query timeout
  application_name: 'ClientForge-CRM',
  // Enable keep-alive to detect dead connections
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
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

    logger.info('[OK] PostgreSQL connection pool initialized', {
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
    logger.info('[OK] Database connection successful', {
      timestamp: result.rows[0].now,
    })
    return true
  } catch (error) {
    logger.error('[ERROR] Database connection failed', { error })
    return false
  }
}

/**
 * Get connection pool statistics
 */
export function getPoolStats() {
  if (!pool) {
    return null
  }

  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
    maxConnections: config.max,
    minConnections: config.min,
    utilization: pool.totalCount > 0 ? ((pool.totalCount - pool.idleCount) / pool.totalCount) * 100 : 0,
  }
}

/**
 * Monitor pool health and log warnings
 */
export function monitorPoolHealth(): void {
  if (!pool) return

  const stats = getPoolStats()
  if (!stats) return

  // Warn if pool utilization is high
  if (stats.utilization > 80) {
    logger.warn('High database connection pool utilization', stats)
  }

  // Warn if there are waiting clients
  if (stats.waitingCount > 0) {
    logger.warn('Clients waiting for database connections', stats)
  }

  // Warn if we're at max capacity
  if (stats.totalCount >= (config.max || 20)) {
    logger.warn('Database connection pool at maximum capacity', stats)
  }
}

// Monitor pool health every 30 seconds
setInterval(() => {
  monitorPoolHealth()
}, 30000)
