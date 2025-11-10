/**
 * Database Utilities
 * Wrapper functions for database operations to provide a consistent interface
 * for AI tools and other services that need simple database access
 */

import { getPool } from '../database/postgresql/pool'

import { logger } from './logging/logger'

/**
 * Execute a query that modifies data (INSERT, UPDATE, DELETE)
 * Compatible with SQLite-style queries but executes on PostgreSQL
 */
export async function dbRun(
  sql: string,
  params: any[] = []
): Promise<{ lastID?: number; changes: number }> {
  try {
    const pool = getPool()

    // Convert SQLite datetime('now') to PostgreSQL NOW()
    // Convert SQLite-style placeholders (?) to PostgreSQL-style ($1, $2, etc.)
    let paramIndex = 1
    const pgSql = sql
      .replace(/datetime\('now'\)/g, 'NOW()')
      .replace(/\?/g, () => `$${paramIndex++}`)

    // For INSERT queries, try to return the inserted ID
    if (sql.trim().toUpperCase().startsWith('INSERT')) {
      const result = await pool.query(pgSql + ' RETURNING id', params)
      return {
        lastID: result.rows[0]?.id,
        changes: result.rowCount || 0,
      }
    }

    // For UPDATE/DELETE queries
    const result = await pool.query(pgSql, params)
    return {
      changes: result.rowCount || 0,
    }
  } catch (error) {
    logger.error('Database run operation failed', { sql, params, error })
    throw error
  }
}

/**
 * Execute a query that returns a single row
 */
export async function dbGet<T = any>(
  sql: string,
  params: any[] = []
): Promise<T | undefined> {
  try {
    const pool = getPool()

    // Convert SQLite-style placeholders to PostgreSQL-style
    let paramIndex = 1
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)

    const result = await pool.query(pgSql, params)
    return result.rows[0] as T | undefined
  } catch (error) {
    logger.error('Database get operation failed', { sql, params, error })
    throw error
  }
}

/**
 * Execute a query that returns multiple rows
 */
export async function dbAll<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  try {
    const pool = getPool()

    // Convert SQLite-style placeholders to PostgreSQL-style
    let paramIndex = 1
    const pgSql = sql.replace(/\?/g, () => `$${paramIndex++}`)

    const result = await pool.query(pgSql, params)
    return result.rows as T[]
  } catch (error) {
    logger.error('Database all operation failed', { sql, params, error })
    throw error
  }
}

/**
 * Execute a raw query (for advanced use cases)
 */
export async function dbQuery<T = any>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  return dbAll<T>(sql, params)
}

/**
 * Execute a transaction
 */
export async function dbTransaction<T>(
  callback: () => Promise<T>
): Promise<T> {
  const pool = getPool()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const result = await callback()
    await client.query('COMMIT')
    return result
  } catch (error) {
    await client.query('ROLLBACK')
    logger.error('Transaction failed and was rolled back', { error })
    throw error
  } finally {
    client.release()
  }
}
