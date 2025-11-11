#!/usr/bin/env tsx
/**
 * Elasticsearch Status Checker
 * Checks current Elasticsearch configuration, indices, and tenant setup
 *
 * Usage:
 *   npx tsx scripts/elasticsearch/check-es-status.ts
 */

import { Client } from '@elastic/elasticsearch'
import * as dotenv from 'dotenv'

dotenv.config()

const client = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: process.env.ELASTICSEARCH_USER ? {
    username: process.env.ELASTICSEARCH_USER,
    password: process.env.ELASTICSEARCH_PASSWORD || ''
  } : undefined
})

async function checkElasticsearchStatus(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║     Elasticsearch Status Check - ClientForge CRM              ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  try {
    // 1. Check cluster health
    console.log('1. Cluster Health:')
    const health = await client.cluster.health()
    console.log(`   Status: ${health.status}`)
    console.log(`   Nodes: ${health.number_of_nodes}`)
    console.log(`   Active Shards: ${health.active_shards}`)
    console.log(`   Relocating Shards: ${health.relocating_shards}`)
    console.log(`   Unassigned Shards: ${health.unassigned_shards}\n`)

    // 2. Check Elasticsearch version
    console.log('2. Elasticsearch Version:')
    const info = await client.info()
    console.log(`   Version: ${info.version.number}`)
    console.log(`   Lucene: ${info.version.lucene_version}\n`)

    // 3. List all indices
    console.log('3. Current Indices:')
    const indices = await client.cat.indices({ format: 'json', h: 'index,docs.count,store.size,health' })

    if (indices.length === 0) {
      console.log('   No indices found\n')
    } else {
      console.log('   Index                    Docs      Size      Health')
      console.log('   ───────────────────────────────────────────────────')
      for (const index of indices) {
        const indexName = index.index || 'unknown'
        const docsCount = index['docs.count'] || '0'
        const storeSize = index['store.size'] || '0b'
        const indexHealth = index.health || 'unknown'

        console.log(`   ${indexName.padEnd(22)} ${String(docsCount).padStart(8)} ${String(storeSize).padStart(10)} ${indexHealth}`)
      }
      console.log('')
    }

    // 4. Check for ILM policies
    console.log('4. ILM Policies:')
    try {
      const policies = await client.ilm.getLifecycle()
      const policyNames = Object.keys(policies)

      if (policyNames.length === 0) {
        console.log('   No ILM policies found\n')
      } else {
        console.log(`   Found ${policyNames.length} policies:`)
        for (const name of policyNames.slice(0, 10)) {
          console.log(`   - ${name}`)
        }
        if (policyNames.length > 10) {
          console.log(`   ... and ${policyNames.length - 10} more`)
        }
        console.log('')
      }
    } catch (error: any) {
      console.log('   Unable to retrieve ILM policies (may not be supported)\n')
    }

    // 5. Check index templates
    console.log('5. Index Templates:')
    try {
      const templates = await client.indices.getIndexTemplate()

      if (templates.index_templates.length === 0) {
        console.log('   No index templates found\n')
      } else {
        console.log(`   Found ${templates.index_templates.length} templates:`)
        for (const template of templates.index_templates.slice(0, 10)) {
          console.log(`   - ${template.name}: ${template.index_template.index_patterns.join(', ')}`)
        }
        if (templates.index_templates.length > 10) {
          console.log(`   ... and ${templates.index_templates.length - 10} more`)
        }
        console.log('')
      }
    } catch (error: any) {
      console.log('   Unable to retrieve index templates\n')
    }

    // 6. Check aliases
    console.log('6. Index Aliases:')
    const aliases = await client.cat.aliases({ format: 'json', h: 'alias,index' })

    if (aliases.length === 0) {
      console.log('   No aliases found\n')
    } else {
      console.log(`   Found ${aliases.length} aliases:`)
      for (const alias of aliases.slice(0, 15)) {
        console.log(`   ${alias.alias} → ${alias.index}`)
      }
      if (aliases.length > 15) {
        console.log(`   ... and ${aliases.length - 15} more`)
      }
      console.log('')
    }

    // 7. Check for tenant_id field in contacts index
    console.log('7. Tenant Isolation Check:')
    const contactsIndices = indices.filter((idx: any) =>
      idx.index && idx.index.startsWith('contacts')
    )

    if (contactsIndices.length === 0) {
      console.log('   ⚠ No contacts indices found')
      console.log('   Tenant isolation cannot be verified\n')
    } else {
      for (const index of contactsIndices.slice(0, 3)) {
        const indexName = index.index
        try {
          const mapping = await client.indices.getMapping({ index: indexName })
          const properties = mapping[indexName]?.mappings?.properties || {}

          if (properties.tenant_id) {
            console.log(`   ✓ ${indexName}: tenant_id field exists (${properties.tenant_id.type})`)
          } else {
            console.log(`   ✗ ${indexName}: tenant_id field MISSING`)
          }
        } catch (error) {
          console.log(`   ? ${indexName}: Unable to check mapping`)
        }
      }
      console.log('')
    }

    // 8. Sample document check
    console.log('8. Sample Documents:')
    if (contactsIndices.length > 0) {
      const sampleIndex = contactsIndices[0].index
      try {
        const search = await client.search({
          index: sampleIndex,
          size: 1,
          body: {
            query: { match_all: {} }
          }
        })

        if (search.hits.hits.length > 0) {
          const doc = search.hits.hits[0]._source as any
          console.log(`   Sample from ${sampleIndex}:`)
          console.log(`   - Has tenant_id: ${doc.tenant_id ? 'YES' : 'NO'}`)
          if (doc.tenant_id) {
            console.log(`   - Tenant ID: ${doc.tenant_id}`)
          }
          console.log(`   - Fields: ${Object.keys(doc).slice(0, 10).join(', ')}`)
        } else {
          console.log(`   No documents in ${sampleIndex}`)
        }
      } catch (error) {
        console.log(`   Unable to sample documents from ${sampleIndex}`)
      }
    } else {
      console.log('   No indices to sample')
    }
    console.log('')

    // Summary
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('\n📊 Summary:\n')
    console.log(`✓ Cluster: ${health.status}`)
    console.log(`✓ Version: ${info.version.number}`)
    console.log(`  Indices: ${indices.length}`)
    console.log(`  Aliases: ${aliases.length}`)

    const hasTenantField = contactsIndices.length > 0
    if (hasTenantField) {
      console.log('  Tenant isolation: Needs verification')
    } else {
      console.log('  Tenant isolation: Not configured')
    }
    console.log('')

    console.log('📝 Next Steps:')
    console.log('   1. Create ILM policy for index lifecycle')
    console.log('   2. Set up index templates with tenant_id')
    console.log('   3. Create rollover aliases')
    console.log('   4. Implement tenant filtering middleware')
    console.log('   5. Run canary test for tenant isolation\n')

  } catch (error: any) {
    console.error('✗ Error connecting to Elasticsearch:', error.message)
    console.error('  Check ELASTICSEARCH_URL in .env file')
    console.error(`  Current URL: ${process.env.ELASTICSEARCH_URL || 'http://localhost:9200'}\n`)
    process.exit(1)
  }
}

// Run
checkElasticsearchStatus().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
