#!/usr/bin/env tsx
/**
 * Check PostgreSQL Extensions and Configuration
 * Verifies if pg_stat_statements is available and configured
 *
 * Usage:
 *   npx tsx scripts/database/check-pg-extensions.ts
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

interface ExtensionInfo {
  name: string
  installed: boolean
  available: boolean
  version?: string
}

async function checkExtensions(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║     PostgreSQL Extensions Check - ClientForge CRM             ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const client = await pool.connect()

  try {
    // Check PostgreSQL version
    const versionResult = await client.query('SELECT version()')
    console.log('PostgreSQL Version:')
    console.log(`  ${versionResult.rows[0].version}\n`)

    // Check available extensions
    console.log('Checking Extensions...\n')

    const extensionsToCheck = [
      'pg_stat_statements',
      'pgstattuple',
      'pg_trgm',
      'btree_gin',
      'btree_gist'
    ]

    const extensions: ExtensionInfo[] = []

    for (const extName of extensionsToCheck) {
      // Check if installed
      const installedQuery = `
        SELECT extname, extversion
        FROM pg_extension
        WHERE extname = $1
      `
      const installedResult = await client.query(installedQuery, [extName])
      const installed = installedResult.rows.length > 0

      // Check if available
      const availableQuery = `
        SELECT name, default_version
        FROM pg_available_extensions
        WHERE name = $1
      `
      const availableResult = await client.query(availableQuery, [extName])
      const available = availableResult.rows.length > 0

      extensions.push({
        name: extName,
        installed,
        available,
        version: installed ? installedResult.rows[0].extversion :
                 available ? availableResult.rows[0].default_version : undefined
      })
    }

    // Display results
    console.log('Extension              Status      Version')
    console.log('═══════════════════════════════════════════════════════════════')

    for (const ext of extensions) {
      const status = ext.installed ? '✓ Installed' :
                     ext.available ? '○ Available' :
                     '✗ Not Available'
      const version = ext.version || 'N/A'

      console.log(`${ext.name.padEnd(22)} ${status.padEnd(12)} ${version}`)
    }

    console.log('═══════════════════════════════════════════════════════════════\n')

    // Check pg_stat_statements specifically
    const pgStatStmts = extensions.find(e => e.name === 'pg_stat_statements')

    if (pgStatStmts?.installed) {
      console.log('✓ pg_stat_statements is INSTALLED and ready to use\n')

      // Check if it's configured in shared_preload_libraries
      const preloadQuery = `SHOW shared_preload_libraries`
      const preloadResult = await client.query(preloadQuery)
      const preloadLibs = preloadResult.rows[0].shared_preload_libraries

      if (preloadLibs.includes('pg_stat_statements')) {
        console.log('✓ pg_stat_statements is in shared_preload_libraries\n')
      } else {
        console.log('⚠ WARNING: pg_stat_statements NOT in shared_preload_libraries')
        console.log('  This extension requires a PostgreSQL restart with:')
        console.log('  shared_preload_libraries = \'pg_stat_statements\'')
        console.log('  in postgresql.conf\n')
      }

      // Get some stats
      const statsQuery = `
        SELECT COUNT(*) as query_count,
               SUM(calls) as total_calls,
               ROUND(SUM(total_exec_time)::numeric, 2) as total_time_ms
        FROM pg_stat_statements
      `
      try {
        const statsResult = await client.query(statsQuery)
        const stats = statsResult.rows[0]

        console.log('pg_stat_statements Statistics:')
        console.log(`  Queries tracked: ${stats.query_count}`)
        console.log(`  Total calls: ${stats.total_calls}`)
        console.log(`  Total execution time: ${stats.total_time_ms} ms\n`)
      } catch (err: any) {
        console.log('⚠ Cannot query pg_stat_statements (may need to call pg_stat_statements_reset())\n')
      }
    } else if (pgStatStmts?.available) {
      console.log('⚠ pg_stat_statements is AVAILABLE but not installed\n')
      console.log('To install:')
      console.log('  1. Add to postgresql.conf: shared_preload_libraries = \'pg_stat_statements\'')
      console.log('  2. Restart PostgreSQL')
      console.log('  3. Run: CREATE EXTENSION pg_stat_statements;\n')
    } else {
      console.log('✗ pg_stat_statements is NOT AVAILABLE')
      console.log('  Consider using pgBadger for slow query analysis\n')
    }

    // Check current settings
    console.log('Current Configuration:')
    const settingsToCheck = [
      'log_min_duration_statement',
      'log_statement',
      'log_duration',
      'track_activities',
      'track_counts'
    ]

    for (const setting of settingsToCheck) {
      try {
        const result = await client.query(`SHOW ${setting}`)
        console.log(`  ${setting}: ${result.rows[0][setting]}`)
      } catch (err) {
        console.log(`  ${setting}: Unable to check`)
      }
    }

    console.log('')

  } catch (error: any) {
    console.error('Error checking extensions:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run
checkExtensions().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
