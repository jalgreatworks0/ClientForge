#!/usr/bin/env tsx
/**
 * Analyze Search Queries
 * Analyzes search telemetry to identify improvement opportunities
 *
 * Usage:
 *   npx tsx scripts/search/analyze-search-queries.ts
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

async function analyzeSearchQueries(): Promise<void> {
  console.log('╔═══════════════════════════════════════════════════════════════════╗')
  console.log('║     Search Query Analysis - ClientForge CRM                      ║')
  console.log('╚═══════════════════════════════════════════════════════════════════╝\n')

  const client = await pool.connect()

  try {
    // Overall stats
    console.log('1. Overall Search Statistics\n')

    const statsResult = await client.query(`
      SELECT
        COUNT(*) as total_searches,
        COUNT(DISTINCT tenant_id) as active_tenants,
        COUNT(DISTINCT query_lowercase) as unique_queries,
        ROUND(AVG(result_count), 2) as avg_results,
        ROUND(AVG(response_time_ms), 2) as avg_response_time,
        ROUND(100.0 * COUNT(CASE WHEN clicked = true THEN 1 END) / NULLIF(COUNT(*), 0), 2) as click_through_rate
      FROM search_telemetry
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `)

    const stats = statsResult.rows[0]
    console.log(`  Total Searches (30d): ${stats.total_searches}`)
    console.log(`  Active Tenants: ${stats.active_tenants}`)
    console.log(`  Unique Queries: ${stats.unique_queries}`)
    console.log(`  Avg Results: ${stats.avg_results}`)
    console.log(`  Avg Response Time: ${stats.avg_response_time}ms`)
    console.log(`  Click-Through Rate: ${stats.click_through_rate}%\n`)

    // Top queries
    console.log('2. Top 10 Search Queries\n')

    const topQueriesResult = await client.query(`
      SELECT
        query_lowercase as query,
        COUNT(*) as count,
        ROUND(AVG(result_count), 2) as avg_results,
        ROUND(AVG(response_time_ms), 2) as avg_response_time
      FROM search_telemetry
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY query_lowercase
      ORDER BY count DESC
      LIMIT 10
    `)

    for (const row of topQueriesResult.rows) {
      console.log(`  "${row.query}" - ${row.count} searches, ${row.avg_results} avg results`)
    }

    // Zero result queries
    console.log('\n3. Top Zero-Result Queries (Synonym Opportunities)\n')

    const zeroResultResult = await client.query(`
      SELECT
        query_lowercase as query,
        COUNT(*) as count
      FROM search_telemetry
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND result_count = 0
      GROUP BY query_lowercase
      HAVING COUNT(*) >= 3
      ORDER BY count DESC
      LIMIT 10
    `)

    if (zeroResultResult.rows.length === 0) {
      console.log('  (no frequent zero-result queries found)\n')
    } else {
      for (const row of zeroResultResult.rows) {
        console.log(`  "${row.query}" - ${row.count} zero-result searches`)
      }
    }

    // Slow queries
    console.log('\n4. Slow Search Queries (>500ms)\n')

    const slowQueriesResult = await client.query(`
      SELECT
        query_lowercase as query,
        COUNT(*) as count,
        ROUND(AVG(response_time_ms), 2) as avg_time,
        MAX(response_time_ms) as max_time
      FROM search_telemetry
      WHERE created_at >= NOW() - INTERVAL '30 days'
        AND response_time_ms > 500
      GROUP BY query_lowercase
      ORDER BY avg_time DESC
      LIMIT 10
    `)

    if (slowQueriesResult.rows.length === 0) {
      console.log('  (no slow queries found - great!)\n')
    } else {
      for (const row of slowQueriesResult.rows) {
        console.log(`  "${row.query}" - ${row.avg_time}ms avg (max: ${row.max_time}ms), ${row.count} times`)
      }
    }

    // Click-through analysis
    console.log('\n5. Click-Through Analysis\n')

    const clickResult = await client.query(`
      SELECT
        ROUND(100.0 * COUNT(CASE WHEN clicked = true THEN 1 END) / NULLIF(COUNT(*), 0), 2) as ctr,
        ROUND(AVG(CASE WHEN clicked = true THEN clicked_index END), 2) as avg_click_position
      FROM search_telemetry
      WHERE created_at >= NOW() - INTERVAL '30 days'
    `)

    const clickStats = clickResult.rows[0]
    console.log(`  Click-Through Rate: ${clickStats.ctr}%`)
    console.log(`  Avg Click Position: ${clickStats.avg_click_position || 'N/A'}\n`)

    // Recommendations
    console.log('═══════════════════════════════════════════════════════════════════')
    console.log('\n📊 Recommendations\n')

    if (parseFloat(stats.click_through_rate) < 30) {
      console.log('  ⚠️  Low Click-Through Rate (<30%)')
      console.log('      - Review search relevance scoring')
      console.log('      - Consider adding synonym support')
      console.log('      - Check if results match user intent\n')
    }

    if (zeroResultResult.rows.length > 0) {
      console.log('  📝 Add Synonyms for Zero-Result Queries')
      console.log('      Top candidates:')
      for (const row of zeroResultResult.rows.slice(0, 5)) {
        console.log(`      - "${row.query}" (${row.count} searches)`)
      }
      console.log('')
    }

    if (slowQueriesResult.rows.length > 0) {
      console.log('  ⚡ Optimize Slow Queries')
      console.log('      - Review Elasticsearch index settings')
      console.log('      - Consider adding more specific filters')
      console.log('      - Check index shard health\n')
    }

    if (parseFloat(stats.avg_response_time) > 200) {
      console.log('  🚀 Improve Response Time (>200ms avg)')
      console.log('      - Review Elasticsearch cluster performance')
      console.log('      - Consider caching frequently searched queries')
      console.log('      - Check network latency\n')
    }

    console.log('✅ Analysis complete!\n')

  } catch (error: any) {
    console.error('\n✗ Analysis failed:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run
analyzeSearchQueries().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
