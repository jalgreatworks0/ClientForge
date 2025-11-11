#!/usr/bin/env tsx
/**
 * Analyze Slow Queries
 * Reports on slow queries from pg_stat_statements
 *
 * Usage:
 *   npx tsx scripts/database/analyze-slow-queries.ts [--min-time=100] [--limit=20]
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

interface QueryStats {
  query: string
  calls: number
  total_time_ms: number
  mean_time_ms: number
  max_time_ms: number
  rows: number
  pct_total_time: number
}

async function analyzeSlowQueries(minTime: number = 100, limit: number = 20): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║        Slow Query Analysis - ClientForge CRM                  ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const client = await pool.connect()

  try {
    // Check if pg_stat_statements is enabled
    const extCheck = await client.query(`
      SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
    `)

    if (extCheck.rows.length === 0) {
      console.log('✗ pg_stat_statements extension is not enabled')
      console.log('  Run: npx tsx scripts/database/setup-slow-query-monitoring.ts\n')
      process.exit(1)
    }

    // Get overall statistics
    console.log('Overview:\n')
    const overallStats = await client.query(`
      SELECT
        COUNT(*) as unique_queries,
        SUM(calls) as total_calls,
        ROUND(CAST(SUM(total_exec_time) AS numeric), 2) as total_time_ms,
        ROUND(CAST(AVG(mean_exec_time) AS numeric), 2) as avg_mean_time
      FROM pg_stat_statements
    `)

    const overall = overallStats.rows[0]
    console.log(`  Unique queries: ${overall.unique_queries}`)
    console.log(`  Total calls: ${overall.total_calls}`)
    console.log(`  Total execution time: ${overall.total_time_ms} ms`)
    console.log(`  Average mean time: ${overall.avg_mean_time} ms\n`)

    // Get slow queries
    console.log(`Slow Queries (mean time > ${minTime}ms):\n`)

    const slowQueriesQuery = `
      SELECT
        query,
        calls,
        ROUND(CAST(total_exec_time AS numeric), 2) as total_time_ms,
        ROUND(CAST(mean_exec_time AS numeric), 2) as mean_time_ms,
        ROUND(CAST(max_exec_time AS numeric), 2) as max_time_ms,
        rows,
        ROUND(100.0 * total_exec_time / SUM(total_exec_time) OVER (), 2) as pct_total_time
      FROM pg_stat_statements
      WHERE mean_exec_time > $1
        AND query NOT LIKE '%pg_stat_statements%'
      ORDER BY mean_exec_time DESC
      LIMIT $2
    `

    const slowQueries = await client.query<QueryStats>(slowQueriesQuery, [minTime, limit])

    if (slowQueries.rows.length === 0) {
      console.log(`  No queries found with mean time > ${minTime}ms\n`)
      console.log('  This is good! All queries are performing well.\n')
    } else {
      console.log(`Found ${slowQueries.rows.length} slow queries:\n`)

      for (let i = 0; i < slowQueries.rows.length; i++) {
        const q = slowQueries.rows[i]
        console.log(`${i + 1}. Mean: ${q.mean_time_ms}ms | Max: ${q.max_time_ms}ms | Calls: ${q.calls} | ${q.pct_total_time}% of total time`)
        console.log(`   Rows: ${q.rows} | Total time: ${q.total_time_ms}ms`)
        console.log(`   Query: ${q.query.substring(0, 150)}${q.query.length > 150 ? '...' : ''}`)
        console.log('')
      }
    }

    // Get queries by total time (most impactful)
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('\nTop 10 Queries by Total Time (Most Impactful):\n')

    const impactfulQuery = `
      SELECT
        query,
        calls,
        ROUND(CAST(total_exec_time AS numeric), 2) as total_time_ms,
        ROUND(CAST(mean_exec_time AS numeric), 2) as mean_time_ms,
        ROUND(100.0 * total_exec_time / SUM(total_exec_time) OVER (), 2) as pct_total_time,
        rows
      FROM pg_stat_statements
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_exec_time DESC
      LIMIT 10
    `

    const impactfulQueries = await client.query<QueryStats>(impactfulQuery)

    for (let i = 0; i < impactfulQueries.rows.length; i++) {
      const q = impactfulQueries.rows[i]
      console.log(`${i + 1}. ${q.pct_total_time}% | Total: ${q.total_time_ms}ms | Mean: ${q.mean_time_ms}ms | Calls: ${q.calls}`)
      console.log(`   Query: ${q.query.substring(0, 150)}${q.query.length > 150 ? '...' : ''}`)
      console.log('')
    }

    // Recommendations
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('\n📝 Recommendations:\n')

    if (slowQueries.rows.length > 0) {
      console.log('1. Investigate slow queries:')
      console.log('   - Run EXPLAIN ANALYZE on queries with high mean time')
      console.log('   - Check for missing indexes')
      console.log('   - Look for sequential scans on large tables')
      console.log('   - Consider query optimization\n')

      console.log('2. For high-impact queries (high total time):')
      console.log('   - These are called frequently and accumulate time')
      console.log('   - Even small optimizations have big impact')
      console.log('   - Consider caching results if appropriate\n')

      console.log('3. Check individual query performance:')
      console.log('   EXPLAIN (ANALYZE, BUFFERS) <your-query>;')
      console.log('')
    } else {
      console.log('✓ All queries performing well (mean time < 100ms)')
      console.log('  Continue monitoring and set alerts for regressions\n')
    }

    console.log('🔍 Deep Dive Commands:')
    console.log('   SELECT * FROM monitoring.slow_queries;')
    console.log('   SELECT * FROM monitoring.top_queries_by_total_time;')
    console.log('   SELECT monitoring.reset_query_stats();  -- Reset and start fresh\n')

  } catch (error: any) {
    console.error('✗ Error analyzing queries:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Parse arguments
const args = process.argv.slice(2)
let minTime = 100
let limit = 20

for (const arg of args) {
  if (arg.startsWith('--min-time=')) {
    minTime = parseInt(arg.split('=')[1], 10)
  } else if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1], 10)
  }
}

// Run
analyzeSlowQueries(minTime, limit).catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
