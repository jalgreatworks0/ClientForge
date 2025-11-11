/**
 * Add Foreign Key and Performance Indexes
 * Critical indexes for tenant isolation, foreign keys, and query optimization
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

// Define all indexes to create
const indexes = [
  // Users table - already have tenant/active composite
  {
    name: 'idx_users_email_lower',
    table: 'users',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_email_lower ON users(LOWER(email))',
    reason: 'Case-insensitive email lookups for login'
  },

  // Contacts table
  {
    name: 'idx_contacts_tenant',
    table: 'contacts',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_tenant ON contacts(tenant_id) WHERE deleted_at IS NULL',
    reason: 'Tenant isolation for contacts list queries'
  },
  {
    name: 'idx_contacts_owner',
    table: 'contacts',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_owner ON contacts(owner_id) WHERE deleted_at IS NULL',
    reason: 'Foreign key index for owner lookups'
  },
  {
    name: 'idx_contacts_tenant_owner',
    table: 'contacts',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_tenant_owner ON contacts(tenant_id, owner_id) WHERE deleted_at IS NULL',
    reason: 'Composite index for tenant-scoped owner queries'
  },
  {
    name: 'idx_contacts_account',
    table: 'contacts',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_account ON contacts(account_id) WHERE deleted_at IS NULL',
    reason: 'Foreign key index for account relationships'
  },

  // Accounts table
  {
    name: 'idx_accounts_tenant',
    table: 'accounts',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_tenant ON accounts(tenant_id) WHERE deleted_at IS NULL',
    reason: 'Tenant isolation for accounts'
  },
  {
    name: 'idx_accounts_owner',
    table: 'accounts',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accounts_owner ON accounts(owner_id) WHERE deleted_at IS NULL',
    reason: 'Foreign key index for owner'
  },

  // Deals table
  {
    name: 'idx_deals_tenant',
    table: 'deals',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_tenant ON deals(tenant_id) WHERE deleted_at IS NULL',
    reason: 'Tenant isolation for deals'
  },
  {
    name: 'idx_deals_stage',
    table: 'deals',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_stage ON deals(stage_id) WHERE deleted_at IS NULL',
    reason: 'Foreign key index for pipeline stages'
  },
  {
    name: 'idx_deals_pipeline',
    table: 'deals',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_pipeline ON deals(tenant_id, stage_id, expected_close_date) WHERE deleted_at IS NULL',
    reason: 'Composite index for pipeline views'
  },
  {
    name: 'idx_deals_owner',
    table: 'deals',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_owner ON deals(owner_id) WHERE deleted_at IS NULL',
    reason: 'Foreign key index for owner'
  },
  {
    name: 'idx_deals_contact',
    table: 'deals',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_contact ON deals(contact_id) WHERE deleted_at IS NULL',
    reason: 'Foreign key index for contact relationships'
  },
  {
    name: 'idx_deals_account',
    table: 'deals',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_deals_account ON deals(account_id) WHERE deleted_at IS NULL',
    reason: 'Foreign key index for account relationships'
  },

  // Activities table - already have created_at DESC
  {
    name: 'idx_activities_tenant',
    table: 'activities',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_tenant ON activities(tenant_id)',
    reason: 'Tenant isolation for activities'
  },
  {
    name: 'idx_activities_user',
    table: 'activities',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_user ON activities(user_id)',
    reason: 'Foreign key index for user activities'
  },
  {
    name: 'idx_activities_recent',
    table: 'activities',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_activities_recent ON activities(tenant_id, created_at DESC)',
    reason: 'Composite index for recent activity feeds'
  },

  // Roles and permissions
  {
    name: 'idx_user_roles_user',
    table: 'user_roles',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_user ON user_roles(user_id)',
    reason: 'Foreign key index for user role lookups'
  },
  {
    name: 'idx_user_roles_role',
    table: 'user_roles',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_roles_role ON user_roles(role_id)',
    reason: 'Foreign key index for role membership'
  },

  // Tenants
  {
    name: 'idx_tenants_active',
    table: 'tenants',
    definition: 'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenants_active ON tenants(is_active)',
    reason: 'Filter active tenants'
  },
]

async function addIndexes() {
  const client = await pool.connect()

  try {
    console.log('🔄 Adding foreign key and performance indexes...\n')

    let created = 0
    let existed = 0
    let skipped = 0

    for (const index of indexes) {
      console.log(`📊 ${index.table}.${index.name}`)
      console.log(`   Reason: ${index.reason}`)

      try {
        // Check if table exists first
        const tableCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = $1
          )
        `, [index.table])

        if (!tableCheck.rows[0].exists) {
          console.log(`   ⚠️  Table '${index.table}' does not exist - skipping\n`)
          skipped++
          continue
        }

        // Check if index already exists
        const indexCheck = await client.query(`
          SELECT EXISTS (
            SELECT FROM pg_indexes
            WHERE schemaname = 'public'
            AND indexname = $1
          )
        `, [index.name])

        if (indexCheck.rows[0].exists) {
          console.log(`   ℹ️  Already exists\n`)
          existed++
          continue
        }

        // Create index
        await client.query(index.definition)
        console.log(`   ✅ Created\n`)
        created++

      } catch (error) {
        if (error.message.includes('already exists')) {
          console.log(`   ℹ️  Already exists\n`)
          existed++
        } else if (error.message.includes('does not exist')) {
          console.log(`   ⚠️  Column does not exist - skipping\n`)
          skipped++
        } else {
          console.error(`   ❌ Error: ${error.message}\n`)
          // Continue with other indexes
        }
      }
    }

    console.log('═'.repeat(60))
    console.log(`📈 Summary:`)
    console.log(`   ✅ Created: ${created}`)
    console.log(`   ℹ️  Already existed: ${existed}`)
    console.log(`   ⚠️  Skipped: ${skipped}`)
    console.log(`   📊 Total: ${indexes.length}`)
    console.log('═'.repeat(60))

    // Show final index count per table
    console.log('\n📊 Index counts by table:\n')

    const tableIndexCounts = await client.query(`
      SELECT
        tablename,
        COUNT(*) as index_count
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename IN ('users', 'contacts', 'accounts', 'deals', 'activities', 'tenants', 'user_roles')
      GROUP BY tablename
      ORDER BY tablename
    `)

    tableIndexCounts.rows.forEach(row => {
      console.log(`   ${row.tablename.padEnd(20)} ${row.index_count} indexes`)
    })

    console.log('\n✅ Index migration complete!\n')

  } catch (error) {
    console.error('❌ Fatal error:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

addIndexes()
