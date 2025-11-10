/**
 * Check Database Indexes
 */

require('dotenv').config()
const { Pool } = require('pg')

const poolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'clientforge',
  user: process.env.DB_USER || 'postgres',
}

if (process.env.DB_PASSWORD !== undefined) {
  poolConfig.password = process.env.DB_PASSWORD
}

const pool = new Pool(poolConfig)

async function checkIndexes() {
  try {
    console.log('🔄 Checking database indexes...\n')

    // Check indexes on critical tables
    const tables = ['users', 'contacts', 'deals', 'activities', 'roles', 'tenants']

    for (const table of tables) {
      const result = await pool.query(`
        SELECT
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = $1
        ORDER BY indexname;
      `, [table])

      console.log(`\n📊 Table: ${table}`)
      console.log('─'.repeat(80))

      if (result.rows.length === 0) {
        console.log(`  ⚠️  No indexes found (table may not exist)`)
      } else {
        result.rows.forEach(row => {
          console.log(`  ✓ ${row.indexname}`)
          console.log(`    ${row.indexdef}`)
        })
      }
    }

    // Check for missing critical indexes
    console.log('\n\n🔍 Checking for missing critical indexes...\n')

    const criticalIndexes = [
      {
        table: 'users',
        column: 'email',
        type: 'single',
        reason: 'Login lookups'
      },
      {
        table: 'users',
        columns: ['tenant_id', 'email'],
        type: 'composite',
        reason: 'Tenant-scoped user lookups'
      },
      {
        table: 'users',
        columns: ['tenant_id', 'is_active'],
        type: 'composite',
        reason: 'Active user queries'
      },
      {
        table: 'contacts',
        column: 'tenant_id',
        type: 'single',
        reason: 'Tenant isolation'
      },
      {
        table: 'deals',
        column: 'tenant_id',
        type: 'single',
        reason: 'Tenant isolation'
      },
      {
        table: 'activities',
        column: 'created_at',
        type: 'single',
        reason: 'Activity timeline queries'
      },
    ]

    for (const index of criticalIndexes) {
      const checkQuery = index.type === 'single'
        ? `SELECT COUNT(*) FROM pg_indexes WHERE tablename = $1 AND indexdef LIKE '%${index.column}%'`
        : `SELECT COUNT(*) FROM pg_indexes WHERE tablename = $1 AND indexdef LIKE '%${index.columns.join('%')}%'`

      const result = await pool.query(checkQuery, [index.table])
      const exists = parseInt(result.rows[0].count) > 0

      if (!exists) {
        console.log(`  ❌ MISSING: Index on ${index.table}.${index.type === 'single' ? index.column : index.columns.join(', ')}`)
        console.log(`     Reason: ${index.reason}`)
      } else {
        console.log(`  ✅ EXISTS: Index on ${index.table}.${index.type === 'single' ? index.column : index.columns.join(', ')}`)
      }
    }

    await pool.end()
    console.log('\n✅ Index check complete!\n')
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

checkIndexes()
