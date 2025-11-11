#!/usr/bin/env tsx
/**
 * Elasticsearch Tenant Isolation Canary Test
 * Validates that tenant data isolation is working correctly
 * Tests cross-tenant query prevention and filtered alias functionality
 *
 * Usage:
 *   npx tsx scripts/elasticsearch/canary-test.ts
 */

import { Client } from '@elastic/elasticsearch'
import * as dotenv from 'dotenv'
import { randomUUID } from 'crypto'

dotenv.config()

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USER ? {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD || ''
  } : undefined
})

interface TestContact {
  id: string
  tenant_id: string
  name: string
  email: string
  created_at: string
}

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: any
}

const results: TestResult[] = []

function recordTest(name: string, passed: boolean, message: string, details?: any): void {
  results.push({ name, passed, message, details })
  const icon = passed ? '✓' : '✗'
  const color = passed ? '' : ''
  console.log(`${color}${icon} ${name}`)
  console.log(`  ${message}`)
  if (details) {
    console.log(`  Details: ${JSON.stringify(details, null, 2)}`)
  }
  console.log('')
}

async function canaryTest(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║   Elasticsearch Tenant Isolation Canary Test                 ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  // Test tenant IDs
  const tenant1Id = randomUUID()
  const tenant2Id = randomUUID()
  const tenant3Id = randomUUID()

  console.log(`Test Tenant IDs:`)
  console.log(`  Tenant 1: ${tenant1Id}`)
  console.log(`  Tenant 2: ${tenant2Id}`)
  console.log(`  Tenant 3: ${tenant3Id}\n`)

  try {
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 1: Verify Elasticsearch is reachable
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 1: Verify Elasticsearch Connection')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      const health = await client.cluster.health()
      recordTest(
        'Elasticsearch Connection',
        health.status !== 'red',
        `Cluster status: ${health.status}`,
        { nodes: health.number_of_nodes, active_shards: health.active_shards }
      )
    } catch (error: any) {
      recordTest('Elasticsearch Connection', false, `Failed to connect: ${error.message}`)
      throw error
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 2: Verify contacts index exists
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 2: Verify Contacts Index')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const writeAliasExists = await client.indices.existsAlias({ name: 'contacts-write' })

    if (!writeAliasExists) {
      recordTest('Contacts Write Alias', false, 'contacts-write alias does not exist. Run: npx tsx scripts/elasticsearch/setup-ilm.ts')
      throw new Error('Setup required')
    }

    recordTest('Contacts Write Alias', true, 'contacts-write alias exists')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 3: Index test documents for multiple tenants
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 3: Index Test Documents')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const testContacts: TestContact[] = [
      {
        id: randomUUID(),
        tenant_id: tenant1Id,
        name: 'Alice Johnson',
        email: 'alice@tenant1.com',
        created_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        tenant_id: tenant1Id,
        name: 'Bob Smith',
        email: 'bob@tenant1.com',
        created_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        tenant_id: tenant2Id,
        name: 'Charlie Brown',
        email: 'charlie@tenant2.com',
        created_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        tenant_id: tenant2Id,
        name: 'Diana Prince',
        email: 'diana@tenant2.com',
        created_at: new Date().toISOString()
      },
      {
        id: randomUUID(),
        tenant_id: tenant3Id,
        name: 'Eve Anderson',
        email: 'eve@tenant3.com',
        created_at: new Date().toISOString()
      }
    ]

    console.log('Indexing test documents...')
    for (const contact of testContacts) {
      await client.index({
        index: 'contacts-write',
        id: contact.id,
        body: contact,
        refresh: 'wait_for' // Wait for document to be searchable
      })
      console.log(`  • Indexed ${contact.name} (Tenant: ${contact.tenant_id.substring(0, 8)}...)`)
    }

    recordTest('Test Document Indexing', true, `Indexed ${testContacts.length} test contacts`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 4: Query without tenant filter (should return all)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 4: Query Without Tenant Filter')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const allContactsResponse = await client.search({
      index: 'contacts-write',
      body: {
        query: { match_all: {} }
      }
    })

    const allContactsCount = allContactsResponse.hits.hits.length

    recordTest(
      'Query Without Tenant Filter',
      allContactsCount >= testContacts.length,
      `Retrieved ${allContactsCount} contacts (expected >= ${testContacts.length})`,
      { total: allContactsResponse.hits.total }
    )

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 5: Verify tenant-specific aliases exist
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 5: Verify Tenant-Specific Aliases')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    const tenant1Alias = `contacts-tenant-${tenant1Id}`
    const tenant2Alias = `contacts-tenant-${tenant2Id}`
    const tenant3Alias = `contacts-tenant-${tenant3Id}`

    const aliasesExist = [tenant1Alias, tenant2Alias, tenant3Alias]
    let aliasesFound = 0

    for (const alias of aliasesExist) {
      try {
        const exists = await client.indices.existsAlias({ name: alias })
        if (exists) {
          aliasesFound++
          console.log(`  ✓ Alias ${alias} exists`)
        } else {
          console.log(`  ✗ Alias ${alias} does NOT exist`)
        }
      } catch (error: any) {
        console.log(`  ✗ Error checking alias ${alias}: ${error.message}`)
      }
    }

    if (aliasesFound === 0) {
      recordTest(
        'Tenant Aliases Exist',
        false,
        'No tenant aliases found. Run: npx tsx scripts/elasticsearch/create-tenant-aliases.ts'
      )
    } else {
      recordTest('Tenant Aliases Exist', aliasesFound === 3, `Found ${aliasesFound}/3 tenant aliases`)
    }

    console.log('')

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 6: Query via tenant-specific alias (Tenant 1)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 6: Query Via Tenant 1 Alias')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (aliasesFound > 0) {
      try {
        const tenant1Response = await client.search({
          index: tenant1Alias,
          body: { query: { match_all: {} } }
        })

        const tenant1Contacts = tenant1Response.hits.hits
        const allBelongToTenant1 = tenant1Contacts.every(
          (hit: any) => hit._source.tenant_id === tenant1Id
        )

        recordTest(
          'Tenant 1 Isolation',
          allBelongToTenant1 && tenant1Contacts.length === 2,
          `Retrieved ${tenant1Contacts.length} contacts, all belong to Tenant 1`,
          { expected: 2, actual: tenant1Contacts.length }
        )
      } catch (error: any) {
        recordTest('Tenant 1 Isolation', false, `Error: ${error.message}`)
      }
    } else {
      recordTest('Tenant 1 Isolation', false, 'Skipped: Alias does not exist')
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 7: Query via tenant-specific alias (Tenant 2)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 7: Query Via Tenant 2 Alias')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (aliasesFound > 0) {
      try {
        const tenant2Response = await client.search({
          index: tenant2Alias,
          body: { query: { match_all: {} } }
        })

        const tenant2Contacts = tenant2Response.hits.hits
        const allBelongToTenant2 = tenant2Contacts.every(
          (hit: any) => hit._source.tenant_id === tenant2Id
        )

        recordTest(
          'Tenant 2 Isolation',
          allBelongToTenant2 && tenant2Contacts.length === 2,
          `Retrieved ${tenant2Contacts.length} contacts, all belong to Tenant 2`,
          { expected: 2, actual: tenant2Contacts.length }
        )
      } catch (error: any) {
        recordTest('Tenant 2 Isolation', false, `Error: ${error.message}`)
      }
    } else {
      recordTest('Tenant 2 Isolation', false, 'Skipped: Alias does not exist')
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 8: Attempt cross-tenant query (should fail or return empty)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 8: Cross-Tenant Query Prevention')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    if (aliasesFound > 0) {
      try {
        // Try to query Tenant 2's data via Tenant 1's alias
        const crossTenantResponse = await client.search({
          index: tenant1Alias,
          body: {
            query: {
              term: { tenant_id: tenant2Id }
            }
          }
        })

        const crossTenantHits = crossTenantResponse.hits.hits.length

        recordTest(
          'Cross-Tenant Query Prevention',
          crossTenantHits === 0,
          crossTenantHits === 0
            ? 'Cross-tenant query correctly returned 0 results'
            : `WARNING: Cross-tenant query returned ${crossTenantHits} results!`,
          { expected: 0, actual: crossTenantHits }
        )
      } catch (error: any) {
        recordTest('Cross-Tenant Query Prevention', false, `Error: ${error.message}`)
      }
    } else {
      recordTest('Cross-Tenant Query Prevention', false, 'Skipped: Alias does not exist')
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 9: Verify tenant_id field exists in mapping
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 9: Verify tenant_id Field Mapping')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    try {
      const mapping = await client.indices.getMapping({ index: 'contacts-write' })
      const firstIndex = Object.keys(mapping)[0]
      const properties = mapping[firstIndex].mappings.properties

      const hasTenantIdField = 'tenant_id' in properties

      recordTest(
        'tenant_id Field Mapping',
        hasTenantIdField,
        hasTenantIdField
          ? `tenant_id field exists (type: ${properties.tenant_id.type})`
          : 'tenant_id field is missing from mapping'
      )
    } catch (error: any) {
      recordTest('tenant_id Field Mapping', false, `Error: ${error.message}`)
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // TEST 10: Cleanup test documents
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('Test 10: Cleanup Test Documents')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

    console.log('Deleting test documents...')
    let deletedCount = 0

    for (const contact of testContacts) {
      try {
        await client.delete({
          index: 'contacts-write',
          id: contact.id,
          refresh: 'wait_for'
        })
        deletedCount++
      } catch (error: any) {
        console.log(`  ⚠ Failed to delete ${contact.name}: ${error.message}`)
      }
    }

    recordTest('Cleanup Test Documents', deletedCount === testContacts.length, `Deleted ${deletedCount}/${testContacts.length} test documents`)

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // SUMMARY
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('\n📊 Test Summary\n')

    const totalTests = results.length
    const passedTests = results.filter(r => r.passed).length
    const failedTests = totalTests - passedTests
    const passRate = ((passedTests / totalTests) * 100).toFixed(1)

    console.log(`Total Tests: ${totalTests}`)
    console.log(`Passed: ${passedTests} (${passRate}%)`)
    console.log(`Failed: ${failedTests}\n`)

    if (failedTests > 0) {
      console.log('❌ Failed Tests:\n')
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  • ${r.name}`)
        console.log(`    ${r.message}\n`)
      })
    }

    if (passedTests === totalTests) {
      console.log('✅ All tests passed! Tenant isolation is working correctly.\n')
    } else {
      console.log('⚠️  Some tests failed. Review the failures above.\n')
      console.log('Common issues:')
      console.log('  1. Tenant aliases not created: Run npx tsx scripts/elasticsearch/create-tenant-aliases.ts')
      console.log('  2. ILM not set up: Run npx tsx scripts/elasticsearch/setup-ilm.ts')
      console.log('  3. Elasticsearch not running: Check connection settings\n')
    }

    // Exit with failure code if any tests failed
    if (failedTests > 0) {
      process.exit(1)
    }

  } catch (error: any) {
    console.error('\n✗ Canary test failed:', error.message)
    if (error.meta?.body) {
      console.error('  Details:', JSON.stringify(error.meta.body, null, 2))
    }
    process.exit(1)
  }
}

// Run
canaryTest().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
