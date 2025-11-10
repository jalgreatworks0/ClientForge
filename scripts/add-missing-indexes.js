/**
 * Add Missing Performance Indexes
 * Adds critical indexes identified in audit
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

async function addMissingIndexes() {
  const client = await pool.connect()

  try {
    console.log('🔄 Adding missing performance indexes...\n')

    // 1. Composite index on users(tenant_id, is_active)
    console.log('📊 Creating index: idx_users_tenant_active')
    try {
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_tenant_active
        ON users(tenant_id, is_active)
      `)
      console.log('  ✅ Created idx_users_tenant_active')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ℹ️  Index already exists')
      } else {
        throw error
      }
    }

    // 2. Index on activities.created_at
    console.log('\n📊 Creating index: idx_activities_created_at')
    try {
      await client.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_created_at
        ON activities(created_at DESC)
      `)
      console.log('  ✅ Created idx_activities_created_at')
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('  ℹ️  Index already exists')
      } else {
        throw error
      }
    }

    console.log('\n✅ All indexes added successfully!\n')

    // Verify indexes were created
    console.log('🔍 Verifying indexes...\n')

    const usersIndexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'users'
        AND indexname = 'idx_users_tenant_active'
    `)

    const activitiesIndexResult = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'activities'
        AND indexname = 'idx_activities_created_at'
    `)

    if (usersIndexResult.rows.length > 0) {
      console.log('✓ idx_users_tenant_active verified')
      console.log(`  ${usersIndexResult.rows[0].indexdef}`)
    }

    if (activitiesIndexResult.rows.length > 0) {
      console.log('\n✓ idx_activities_created_at verified')
      console.log(`  ${activitiesIndexResult.rows[0].indexdef}`)
    }

    console.log('\n✅ Index verification complete!\n')

  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addMissingIndexes()
