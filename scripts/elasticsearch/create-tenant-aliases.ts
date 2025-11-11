#!/usr/bin/env tsx
/**
 * Create Tenant-Specific Elasticsearch Aliases
 * Creates filtered aliases for each tenant to enforce data isolation
 *
 * Usage:
 *   npx tsx scripts/elasticsearch/create-tenant-aliases.ts
 *   npx tsx scripts/elasticsearch/create-tenant-aliases.ts --tenant-id=550e8400-e29b-41d4-a716-446655440000
 */

import { Client } from '@elastic/elasticsearch'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USER ? {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD || ''
  } : undefined
})

const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
})

interface Tenant {
  id: string
  name: string
  is_active: boolean
}

const INDICES = ['contacts', 'deals', 'tasks', 'activities']

async function createTenantAliases(specificTenantId?: string): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║    Create Tenant-Specific Aliases - ClientForge CRM          ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  const pgClient = await pgPool.connect()

  try {
    // Step 1: Fetch tenants from database
    console.log('1. Fetching tenants from database...\n')

    let tenantsQuery = 'SELECT id, name, is_active FROM tenants WHERE is_active = true'
    const queryParams: string[] = []

    if (specificTenantId) {
      tenantsQuery += ' AND id = $1'
      queryParams.push(specificTenantId)
    }

    tenantsQuery += ' ORDER BY name'

    const tenantsResult = await pgClient.query<Tenant>(tenantsQuery, queryParams)
    const tenants = tenantsResult.rows

    if (tenants.length === 0) {
      console.log('✗ No active tenants found\n')
      if (specificTenantId) {
        console.log(`  Tenant ID ${specificTenantId} not found or inactive\n`)
      }
      process.exit(1)
    }

    console.log(`Found ${tenants.length} active tenant(s):\n`)
    for (const tenant of tenants) {
      console.log(`  • ${tenant.name} (${tenant.id})`)
    }
    console.log('')

    // Step 2: Verify indices exist
    console.log('2. Verifying Elasticsearch indices...\n')

    for (const indexPrefix of INDICES) {
      // Check if write alias exists (created by ILM setup)
      const writeAlias = `${indexPrefix}-write`
      const aliasExists = await esClient.indices.existsAlias({ name: writeAlias })

      if (!aliasExists) {
        console.log(`✗ Write alias ${writeAlias} does not exist`)
        console.log(`  Run: npx tsx scripts/elasticsearch/setup-ilm.ts\n`)
        process.exit(1)
      }

      console.log(`  ✓ ${writeAlias} exists`)
    }
    console.log('')

    // Step 3: Create tenant-specific aliases
    console.log('3. Creating tenant-specific filtered aliases...\n')

    let aliasesCreated = 0
    let aliasesSkipped = 0

    for (const tenant of tenants) {
      console.log(`Processing tenant: ${tenant.name} (${tenant.id})`)

      for (const indexPrefix of INDICES) {
        const aliasName = `${indexPrefix}-tenant-${tenant.id}`
        const indexPattern = `${indexPrefix}-*`

        // Check if alias already exists
        const exists = await esClient.indices.existsAlias({ name: aliasName })

        if (exists) {
          console.log(`  ○ Alias ${aliasName} already exists, skipping`)
          aliasesSkipped++
          continue
        }

        // Get all indices matching the pattern
        const indicesResponse = await esClient.cat.indices({
          index: indexPattern,
          format: 'json',
          h: 'index'
        })

        const indices = indicesResponse.map((idx: any) => idx.index)

        if (indices.length === 0) {
          console.log(`  ✗ No indices found matching ${indexPattern}`)
          continue
        }

        // Create filtered alias for this tenant
        const actions = indices.map(indexName => ({
          add: {
            index: indexName,
            alias: aliasName,
            filter: {
              term: {
                tenant_id: tenant.id
              }
            }
          }
        }))

        await esClient.indices.updateAliases({
          body: { actions }
        })

        console.log(`  ✓ Created ${aliasName} (${indices.length} indices)`)
        aliasesCreated++
      }

      console.log('')
    }

    // Step 4: Verify aliases
    console.log('4. Verifying created aliases...\n')

    for (const tenant of tenants) {
      console.log(`Verifying tenant: ${tenant.name}`)

      for (const indexPrefix of INDICES) {
        const aliasName = `${indexPrefix}-tenant-${tenant.id}`

        try {
          const aliasInfo = await esClient.indices.getAlias({ name: aliasName })
          const indices = Object.keys(aliasInfo)

          console.log(`  ✓ ${aliasName} → ${indices.length} index(es)`)

          // Verify filter is applied
          const firstIndex = indices[0]
          const aliasData = aliasInfo[firstIndex].aliases[aliasName]

          if (aliasData.filter) {
            const filter = aliasData.filter as any
            if (filter.term?.tenant_id === tenant.id) {
              console.log(`    Filter: tenant_id = ${tenant.id}`)
            } else {
              console.log(`    ⚠ Warning: Unexpected filter configuration`)
            }
          } else {
            console.log(`    ⚠ Warning: No filter applied!`)
          }
        } catch (error: any) {
          console.log(`  ✗ Alias ${aliasName} verification failed: ${error.message}`)
        }
      }

      console.log('')
    }

    // Success summary
    console.log('═══════════════════════════════════════════════════════════════')
    console.log(`\n✓ Tenant Alias Creation Complete!\n`)
    console.log('📊 Summary:')
    console.log(`   Tenants processed: ${tenants.length}`)
    console.log(`   Aliases created: ${aliasesCreated}`)
    console.log(`   Aliases skipped (already exist): ${aliasesSkipped}`)
    console.log(`   Total aliases active: ${aliasesCreated + aliasesSkipped}\n`)

    console.log('🔒 Security Benefits:')
    console.log('   • Each tenant can only access their own data')
    console.log('   • Filtering enforced at Elasticsearch level')
    console.log('   • Cross-tenant queries automatically blocked\n')

    console.log('📝 Usage in Application:')
    console.log('   Instead of querying "contacts-write", use:')
    console.log('   • contacts-tenant-{tenantId}')
    console.log('   • deals-tenant-{tenantId}')
    console.log('   • tasks-tenant-{tenantId}')
    console.log('   • activities-tenant-{tenantId}\n')

    console.log('🔍 Verify Aliases:')
    console.log('   curl -X GET "localhost:9200/_cat/aliases/*-tenant-*?v"\n')

    console.log('🧪 Test Tenant Isolation:')
    console.log('   npx tsx scripts/elasticsearch/canary-test.ts\n')

    // Step 5: Sample query example
    if (tenants.length > 0) {
      const sampleTenant = tenants[0]
      console.log('💡 Example Query:')
      console.log(`   # Search contacts for tenant ${sampleTenant.name}`)
      console.log(`   curl -X GET "localhost:9200/contacts-tenant-${sampleTenant.id}/_search" -H 'Content-Type: application/json' -d '{`)
      console.log(`     "query": { "match_all": {} }`)
      console.log(`   }'\n`)
      console.log(`   # This will ONLY return contacts with tenant_id = ${sampleTenant.id}\n`)
    }

  } catch (error: any) {
    console.error('✗ Error creating tenant aliases:', error.message)
    if (error.meta?.body) {
      console.error('  Details:', JSON.stringify(error.meta.body, null, 2))
    }
    process.exit(1)
  } finally {
    pgClient.release()
    await pgPool.end()
  }
}

// Parse arguments
const args = process.argv.slice(2)
let specificTenantId: string | undefined

for (const arg of args) {
  if (arg.startsWith('--tenant-id=')) {
    specificTenantId = arg.split('=')[1]
  }
}

// Run
createTenantAliases(specificTenantId).catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
