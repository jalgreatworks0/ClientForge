/**
 * PostgreSQL Database Configuration
 * Primary relational database for transactional data
 */

import { Pool, PoolConfig } from 'pg'

export interface PostgresConfig extends PoolConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  min: number
  max: number
  idleTimeoutMillis: number
  connectionTimeoutMillis: number
  ssl: boolean | { rejectUnauthorized: boolean }
}

// Build config object conditionally to handle optional password
const buildPostgresConfig = (): PostgresConfig => {
  const config: any = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'clientforge_crm',
    user: process.env.DB_USER || 'crm_admin',
    min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
    ssl: process.env.NODE_ENV === 'production'
      ? { rejectUnauthorized: false }
      : false,
  }

  // Only set password if defined (allows trust authentication)
  if (process.env.DB_PASSWORD !== undefined) {
    config.password = process.env.DB_PASSWORD
  }

  return config as PostgresConfig
}

export const postgresConfig: PostgresConfig = buildPostgresConfig()

/**
 * Create and export PostgreSQL connection pool
 */
let pool: Pool | null = null

export function getPostgresPool(): Pool {
  if (!pool) {
    pool = new Pool(postgresConfig)

    pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err)
      process.exit(-1)
    })

    pool.on('connect', () => {
      console.log('✅ PostgreSQL connected')
    })
  }

  return pool
}

/**
 * Close PostgreSQL connection pool
 */
export async function closePostgresPool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    console.log('PostgreSQL connection pool closed')
  }
}

/**
 * Test PostgreSQL connection
 */
export async function testPostgresConnection(): Promise<boolean> {
  try {
    const testPool = getPostgresPool()
    const result = await testPool.query('SELECT NOW()')
    console.log('✅ PostgreSQL connection test successful:', result.rows[0].now)
    return true
  } catch (error) {
    console.error('❌ PostgreSQL connection test failed:', error)
    return false
  }
}

export default postgresConfig
