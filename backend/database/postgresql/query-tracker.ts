/**
 * Query Performance Tracker
 * Wraps database queries with performance tracking
 */

import { Pool, QueryResult, QueryResultRow } from 'pg'

import { logger } from '../../utils/logging/logger'

interface QueryContext {
  queryName?: string
  tenantId?: string
  userId?: string
}

// Configuration
const SLOW_QUERY_THRESHOLD_MS = 100
const LOG_TO_DATABASE = process.env.LOG_QUERY_PERF_TO_DB === 'true'

/**
 * Execute a tracked query
 * Measures execution time and logs slow queries
 */
export async function trackedQuery<T extends QueryResultRow = any>(
  pool: Pool,
  queryText: string,
  params: any[] = [],
  context: QueryContext = {}
): Promise<QueryResult<T>> {
  const startTime = Date.now()
  const startHrTime = process.hrtime()

  try {
    // Execute the query
    const result = await pool.query<T>(queryText, params)

    // Calculate execution time
    const hrDiff = process.hrtime(startHrTime)
    const executionTimeMs = Math.round(hrDiff[0] * 1000 + hrDiff[1] / 1000000)

    // Log slow queries
    if (executionTimeMs > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow database query detected', {
        queryName: context.queryName || 'unnamed',
        executionTimeMs,
        threshold: SLOW_QUERY_THRESHOLD_MS,
        rowCount: result.rowCount,
        tenantId: context.tenantId,
        userId: context.userId,
      })

      // Log to database if enabled
      if (LOG_TO_DATABASE) {
        logQueryPerformance(pool, {
          queryName: context.queryName || 'unnamed',
          executionTimeMs,
          queryText,
          params,
          tenantId: context.tenantId,
          userId: context.userId,
        }).catch((error) => {
          logger.error('Failed to log query performance', { error })
        })
      }
    } else {
      // Log all queries at debug level
      logger.debug('Query executed', {
        queryName: context.queryName || 'unnamed',
        executionTimeMs,
        rowCount: result.rowCount,
      })
    }

    return result
  } catch (error) {
    // Calculate execution time even for failed queries
    const hrDiff = process.hrtime(startHrTime)
    const executionTimeMs = Math.round(hrDiff[0] * 1000 + hrDiff[1] / 1000000)

    logger.error('Query execution failed', {
      queryName: context.queryName || 'unnamed',
      executionTimeMs,
      error,
      tenantId: context.tenantId,
      userId: context.userId,
    })

    throw error
  }
}

/**
 * Log query performance to database
 */
async function logQueryPerformance(
  pool: Pool,
  data: {
    queryName: string
    executionTimeMs: number
    queryText: string
    params: any[]
    tenantId?: string
    userId?: string
  }
): Promise<void> {
  try {
    await pool.query(
      `
      INSERT INTO query_performance_log (
        query_name,
        execution_time_ms,
        query_text,
        params,
        tenant_id,
        user_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        data.queryName,
        data.executionTimeMs,
        data.queryText,
        JSON.stringify(data.params),
        data.tenantId || null,
        data.userId || null,
      ]
    )
  } catch (error) {
    // Don't throw - logging should never break the app
    logger.error('Failed to log query performance to database', { error })
  }
}

/**
 * Execute multiple queries in a transaction with tracking
 */
export async function trackedTransaction<T>(
  pool: Pool,
  callback: (client: any) => Promise<T>,
  context: QueryContext = {}
): Promise<T> {
  const startTime = Date.now()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback(client)
    await client.query('COMMIT')

    const executionTimeMs = Date.now() - startTime

    logger.debug('Transaction completed', {
      queryName: context.queryName || 'transaction',
      executionTimeMs,
      tenantId: context.tenantId,
      userId: context.userId,
    })

    if (executionTimeMs > SLOW_QUERY_THRESHOLD_MS) {
      logger.warn('Slow transaction detected', {
        queryName: context.queryName || 'transaction',
        executionTimeMs,
        threshold: SLOW_QUERY_THRESHOLD_MS,
      })
    }

    return result
  } catch (error) {
    await client.query('ROLLBACK')
    const executionTimeMs = Date.now() - startTime

    logger.error('Transaction failed and rolled back', {
      queryName: context.queryName || 'transaction',
      executionTimeMs,
      error,
      tenantId: context.tenantId,
      userId: context.userId,
    })

    throw error
  } finally {
    client.release()
  }
}

/**
 * Get query performance statistics from database
 */
export async function getQueryPerformanceStats(
  pool: Pool,
  options: {
    limit?: number
    minExecutionTime?: number
    tenantId?: string
    since?: Date
  } = {}
): Promise<any[]> {
  const {
    limit = 50,
    minExecutionTime = 0,
    tenantId,
    since = new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  } = options

  const query = `
    SELECT
      query_name,
      COUNT(*) as execution_count,
      AVG(execution_time_ms)::integer as avg_execution_time,
      MIN(execution_time_ms) as min_execution_time,
      MAX(execution_time_ms) as max_execution_time,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY execution_time_ms)::integer as median_execution_time,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY execution_time_ms)::integer as p95_execution_time,
      PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY execution_time_ms)::integer as p99_execution_time
    FROM query_performance_log
    WHERE created_at >= $1
      AND execution_time_ms >= $2
      ${tenantId ? 'AND tenant_id = $3' : ''}
    GROUP BY query_name
    ORDER BY avg_execution_time DESC
    LIMIT $${tenantId ? 4 : 3}
  `

  const params = tenantId
    ? [since, minExecutionTime, tenantId, limit]
    : [since, minExecutionTime, limit]

  try {
    const result = await pool.query(query, params)
    return result.rows
  } catch (error) {
    logger.error('Failed to get query performance stats', { error })
    return []
  }
}

/**
 * Get slowest queries
 */
export async function getSlowestQueries(
  pool: Pool,
  limit: number = 20
): Promise<any[]> {
  const query = `
    SELECT
      query_name,
      execution_time_ms,
      query_text,
      params,
      tenant_id,
      user_id,
      created_at
    FROM query_performance_log
    WHERE created_at >= NOW() - INTERVAL '24 hours'
    ORDER BY execution_time_ms DESC
    LIMIT $1
  `

  try {
    const result = await pool.query(query, [limit])
    return result.rows
  } catch (error) {
    logger.error('Failed to get slowest queries', { error })
    return []
  }
}
