#!/usr/bin/env tsx
/**
 * Add Performance Indexes
 * Adds missing indexes based on common query patterns and foreign keys
 *
 * Usage:
 *   npx tsx scripts/database/add-performance-indexes.ts
 */

import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

interface IndexToCreate {
  table: string
  columns: string[]
  name: string
  type?: 'btree' | 'gin' | 'gist'
  where?: string
  reason: string
}

async function addPerformanceIndexes(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║     Add Performance Indexes - ClientForge CRM                 ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const client = await pool.connect()

  try {
    // Indexes to create based on common query patterns
    const indexes: IndexToCreate[] = [
      // Tenant isolation indexes (CRITICAL)
      {
        table: 'contacts',
        columns: ['tenant_id', 'created_at'],
        name: 'idx_contacts_tenant_created',
        reason: 'List contacts by tenant ordered by creation date'
      },
      {
        table: 'accounts',
        columns: ['tenant_id', 'created_at'],
        name: 'idx_accounts_tenant_created',
        reason: 'List accounts by tenant ordered by creation date'
      },
      {
        table: 'deals',
        columns: ['tenant_id', 'created_at'],
        name: 'idx_deals_tenant_created',
        reason: 'List deals by tenant ordered by creation date'
      },
      {
        table: 'deals',
        columns: ['tenant_id', 'stage_id'],
        name: 'idx_deals_tenant_stage',
        reason: 'Filter deals by tenant and stage (pipeline views)'
      },
      {
        table: 'deals',
        columns: ['tenant_id', 'expected_close_date'],
        name: 'idx_deals_tenant_close_date',
        reason: 'Deals forecast and upcoming closes'
      },
      {
        table: 'tasks',
        columns: ['tenant_id', 'due_date', 'status'],
        name: 'idx_tasks_tenant_due_status',
        reason: 'Task lists filtered by due date and status'
      },
      {
        table: 'tasks',
        columns: ['tenant_id', 'assigned_to_id'],
        name: 'idx_tasks_tenant_assigned',
        reason: 'Tasks assigned to specific users'
      },
      {
        table: 'activities',
        columns: ['tenant_id', 'entity_type', 'entity_id'],
        name: 'idx_activities_tenant_entity',
        reason: 'Activity history for specific entities'
      },
      {
        table: 'activities',
        columns: ['tenant_id', 'created_at'],
        name: 'idx_activities_tenant_created',
        reason: 'Recent activity feed'
      },

      // Foreign key indexes (IMPORTANT)
      {
        table: 'contacts',
        columns: ['account_id'],
        name: 'idx_contacts_account',
        reason: 'Join contacts with accounts'
      },
      {
        table: 'contacts',
        columns: ['owner_id'],
        name: 'idx_contacts_owner',
        reason: 'Filter contacts by owner/sales rep'
      },
      {
        table: 'deals',
        columns: ['pipeline_id'],
        name: 'idx_deals_pipeline',
        reason: 'Filter deals by pipeline'
      },
      {
        table: 'deals',
        columns: ['contact_id'],
        name: 'idx_deals_contact',
        reason: 'Find deals for a contact'
      },
      {
        table: 'deals',
        columns: ['account_id'],
        name: 'idx_deals_account',
        reason: 'Find deals for an account'
      },
      {
        table: 'deals',
        columns: ['owner_id'],
        name: 'idx_deals_owner',
        reason: 'Filter deals by owner/sales rep'
      },
      {
        table: 'deal_stages',
        columns: ['pipeline_id', 'order_index'],
        name: 'idx_deal_stages_pipeline_order',
        reason: 'Get stages for a pipeline in order'
      },
      {
        table: 'tasks',
        columns: ['entity_type', 'entity_id'],
        name: 'idx_tasks_entity',
        reason: 'Find tasks for an entity'
      },
      {
        table: 'notes',
        columns: ['entity_type', 'entity_id'],
        name: 'idx_notes_entity',
        reason: 'Find notes for an entity'
      },
      {
        table: 'comments',
        columns: ['entity_type', 'entity_id'],
        name: 'idx_comments_entity',
        reason: 'Find comments for an entity'
      },
      {
        table: 'tags',
        columns: ['entity_type', 'entity_id'],
        name: 'idx_tags_entity',
        reason: 'Find tags for an entity'
      },
      {
        table: 'files',
        columns: ['tenant_id', 'entity_type', 'entity_id'],
        name: 'idx_files_tenant_entity',
        reason: 'Find files for an entity'
      },
      {
        table: 'email_threads',
        columns: ['tenant_id', 'contact_id'],
        name: 'idx_email_threads_tenant_contact',
        reason: 'Email threads for a contact'
      },
      {
        table: 'email_messages',
        columns: ['thread_id', 'received_at'],
        name: 'idx_email_messages_thread_date',
        reason: 'Messages in a thread ordered by date'
      },

      // Search/filter indexes
      {
        table: 'contacts',
        columns: ['email'],
        name: 'idx_contacts_email',
        reason: 'Search contacts by email'
      },
      {
        table: 'contacts',
        columns: ['phone'],
        name: 'idx_contacts_phone',
        reason: 'Search contacts by phone'
      },
      {
        table: 'users',
        columns: ['email'],
        name: 'idx_users_email',
        reason: 'User lookup by email (login)'
      },
      {
        table: 'users',
        columns: ['tenant_id', 'status'],
        name: 'idx_users_tenant_status',
        reason: 'Active users for a tenant'
      },

      // Partial indexes for common filters
      {
        table: 'deals',
        columns: ['tenant_id', 'updated_at'],
        name: 'idx_deals_tenant_updated_open',
        where: 'status = \'open\'',
        reason: 'Recently updated open deals (dashboard)'
      },
      {
        table: 'tasks',
        columns: ['tenant_id', 'due_date'],
        name: 'idx_tasks_tenant_due_incomplete',
        where: 'status != \'completed\'',
        reason: 'Incomplete tasks by due date'
      },
    ]

    console.log(`Planning to create ${indexes.length} indexes...\n`)

    let created = 0
    let skipped = 0
    let failed = 0

    for (const index of indexes) {
      try {
        // Check if index already exists
        const checkQuery = `
          SELECT 1 FROM pg_indexes
          WHERE schemaname = 'public'
            AND tablename = $1
            AND indexname = $2
        `
        const exists = await client.query(checkQuery, [index.table, index.name])

        if (exists.rows.length > 0) {
          console.log(`⊙ ${index.name} (already exists)`)
          skipped++
          continue
        }

        // Create index
        const columnsList = index.columns.join(', ')
        const indexType = index.type || 'btree'
        const whereClause = index.where ? ` WHERE ${index.where}` : ''

        const createQuery = `
          CREATE INDEX CONCURRENTLY IF NOT EXISTS ${index.name}
          ON ${index.table} USING ${indexType} (${columnsList})${whereClause}
        `

        console.log(`+ Creating ${index.name}...`)
        console.log(`  Table: ${index.table}`)
        console.log(`  Columns: ${columnsList}`)
        console.log(`  Reason: ${index.reason}`)

        await client.query(createQuery)

        console.log(`  ✓ Created successfully\n`)
        created++

      } catch (error: any) {
        console.log(`  ✗ Failed: ${error.message}\n`)
        failed++
      }
    }

    console.log('═══════════════════════════════════════════════════════════════')
    console.log('\n📊 Summary:\n')
    console.log(`  Total planned: ${indexes.length}`)
    console.log(`  Created: ${created}`)
    console.log(`  Skipped (exists): ${skipped}`)
    console.log(`  Failed: ${failed}\n`)

    if (created > 0) {
      console.log('✅ Performance indexes have been added!')
      console.log('   Query performance should improve for:')
      console.log('   - Tenant-filtered queries')
      console.log('   - Foreign key joins')
      console.log('   - Dashboard queries')
      console.log('   - Common filters (status, date ranges, etc.)\n')
    }

    if (failed > 0) {
      console.log('⚠️  Some indexes failed to create.')
      console.log('   This may be due to:')
      console.log('   - Tables not existing yet')
      console.log('   - Column name mismatches')
      console.log('   - Permission issues\n')
    }

    console.log('📝 Next Steps:')
    console.log('   1. Run ANALYZE to update statistics: ANALYZE;')
    console.log('   2. Monitor query performance improvements')
    console.log('   3. Review slow query log after changes')
    console.log('   4. Add more indexes based on actual query patterns\n')

  } catch (error: any) {
    console.error('\n✗ Error adding indexes:', error.message)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

// Run
addPerformanceIndexes().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
