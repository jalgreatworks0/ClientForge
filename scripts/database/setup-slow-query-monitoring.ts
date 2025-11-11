#!/usr/bin/env tsx
/**
 * Setup Slow Query Monitoring
 * Enables pg_stat_statements and creates monitoring infrastructure
 *
 * Usage:
 *   npx tsx scripts/database/setup-slow-query-monitoring.ts
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

async function setupSlowQueryMonitoring(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║   Setup Slow Query Monitoring - ClientForge CRM               ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const client = await pool.connect()

  try {
    // Step 1: Check if pg_stat_statements is available
    console.log('1. Checking pg_stat_statements availability...')
    const availableQuery = `
      SELECT name FROM pg_available_extensions WHERE name = 'pg_stat_statements'
    `
    const availableResult = await client.query(availableQuery)

    if (availableResult.rows.length === 0) {
      console.log('✗ pg_stat_statements is not available in this PostgreSQL installation')
      console.log('\n📝 FALLBACK OPTIONS:')
      console.log('   1. Use pgBadger for log analysis')
      console.log('   2. Enable query logging with log_min_duration_statement')
      console.log('')
      process.exit(1)
    }

    console.log('✓ pg_stat_statements is available\n')

    // Step 2: Try to install the extension
    console.log('2. Installing pg_stat_statements extension...')
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS pg_stat_statements')
      console.log('✓ pg_stat_statements extension installed\n')
    } catch (err: any) {
      console.log('✗ Failed to install extension:', err.message)
      console.log('\n📝 REQUIRED CONFIGURATION:')
      console.log('   PostgreSQL needs to be started with:')
      console.log('   shared_preload_libraries = \'pg_stat_statements\'')
      console.log('')
      console.log('   For Docker:')
      console.log('   docker-compose.yml:')
      console.log('     services:')
      console.log('       postgres:')
      console.log('         command: postgres -c shared_preload_libraries=\'pg_stat_statements\'')
      console.log('')
      console.log('   Then restart PostgreSQL and run this script again.')
      console.log('')
      process.exit(1)
    }

    // Step 3: Create monitoring schema and views
    console.log('3. Creating monitoring schema and views...')

    await client.query('CREATE SCHEMA IF NOT EXISTS monitoring')

    // Create query performance view
    await client.query(`
      CREATE OR REPLACE VIEW monitoring.query_performance AS
      SELECT
        query,
        calls,
        ROUND(CAST(total_exec_time AS numeric), 2) as total_time_ms,
        ROUND(CAST(mean_exec_time AS numeric), 2) as mean_time_ms,
        ROUND(CAST(min_exec_time AS numeric), 2) as min_time_ms,
        ROUND(CAST(max_exec_time AS numeric), 2) as max_time_ms,
        ROUND(CAST(stddev_exec_time AS numeric), 2) as stddev_time_ms,
        rows,
        ROUND(CAST(100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS numeric), 2) AS cache_hit_ratio
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
    `)

    // Create slow queries view
    await client.query(`
      CREATE OR REPLACE VIEW monitoring.slow_queries AS
      SELECT
        query,
        calls,
        ROUND(CAST(total_exec_time AS numeric), 2) as total_time_ms,
        ROUND(CAST(mean_exec_time AS numeric), 2) as mean_time_ms,
        ROUND(CAST(max_exec_time AS numeric), 2) as max_time_ms,
        rows,
        ROUND(CAST(100.0 * total_exec_time / SUM(total_exec_time) OVER () AS numeric), 2) as pct_total_time
      FROM pg_stat_statements
      WHERE mean_exec_time > 100
        AND query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
    `)

    // Create top queries by total time view
    await client.query(`
      CREATE OR REPLACE VIEW monitoring.top_queries_by_total_time AS
      SELECT
        query,
        calls,
        ROUND(CAST(total_exec_time AS numeric), 2) as total_time_ms,
        ROUND(CAST(mean_exec_time AS numeric), 2) as mean_time_ms,
        ROUND(CAST(100.0 * total_exec_time / SUM(total_exec_time) OVER () AS numeric), 2) as pct_total_time,
        rows,
        ROUND((CAST(rows AS numeric) / NULLIF(calls, 0)), 2) as rows_per_call
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT 50
    `)

    // Create reset function
    await client.query(`
      CREATE OR REPLACE FUNCTION monitoring.reset_query_stats()
      RETURNS void AS $$
      BEGIN
        PERFORM pg_stat_statements_reset();
      END;
      $$ LANGUAGE plpgsql
    `)

    console.log('✓ Created monitoring schema with 3 views\n')

    // Step 4: Query current stats
    console.log('4. Checking current query statistics...')
    const statsQuery = `
      SELECT COUNT(*) as query_count,
             COALESCE(SUM(calls), 0) as total_calls,
             ROUND(CAST(COALESCE(SUM(total_exec_time), 0) AS numeric), 2) as total_time_ms
      FROM pg_stat_statements
    `
    const statsResult = await client.query(statsQuery)
    const stats = statsResult.rows[0]

    console.log(`  Queries tracked: ${stats.query_count}`)
    console.log(`  Total calls: ${stats.total_calls}`)
    console.log(`  Total execution time: ${stats.total_time_ms} ms\n`)

    // Step 5: Show top 5 slow queries
    console.log('5. Top 5 queries by mean execution time:')
    const topQueriesResult = await client.query(`
      SELECT
        LEFT(query, 80) as query_preview,
        calls,
        ROUND(CAST(mean_exec_time AS numeric), 2) as mean_ms
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT 5
    `)

    if (topQueriesResult.rows.length === 0) {
      console.log('  No queries recorded yet (run some queries first)\n')
    } else {
      for (const row of topQueriesResult.rows) {
        console.log(`  ${row.mean_ms}ms (${row.calls} calls): ${row.query_preview}...`)
      }
      console.log('')
    }

    // Success summary
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('✓ Slow query monitoring setup complete!\n')
    console.log('📊 Available Views:')
    console.log('   • monitoring.query_performance    - All queries by mean time')
    console.log('   • monitoring.slow_queries          - Queries with mean > 100ms')
    console.log('   • monitoring.top_queries_by_total_time - Most impactful queries\n')
    console.log('🔍 Query Examples:')
    console.log('   SELECT * FROM monitoring.slow_queries LIMIT 20;')
    console.log('   SELECT * FROM monitoring.top_queries_by_total_time;')
    console.log('   SELECT monitoring.reset_query_stats();  -- Reset statistics\n')
    console.log('📈 Grafana Integration:')
    console.log('   Use these views as data sources for slow query panels\n')

  } catch (error: any) {
    console.error('✗ Error during setup:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run
setupSlowQueryMonitoring().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
