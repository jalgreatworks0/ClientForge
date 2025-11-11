#!/usr/bin/env tsx
/**
 * Analyze Tables
 * Updates PostgreSQL statistics for query planner
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

async function analyzeTables(): Promise<void> {
  const client = await pool.connect()

  try {
    console.log('Running ANALYZE on all tables...\n')
    await client.query('ANALYZE')
    console.log('✓ Database statistics updated\n')
  } catch (error: any) {
    console.error('✗ Error:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

analyzeTables().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
