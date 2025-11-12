#!/usr/bin/env tsx
/**
 * Elasticsearch ILM (Index Lifecycle Management) Setup
 * Creates ILM policy for automatic index rollover and lifecycle management
 *
 * Usage:
 *   npx tsx scripts/elasticsearch/setup-ilm.ts
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

const ILM_POLICY_NAME = 'clientforge-crm-policy'

async function setupILM(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║        Elasticsearch ILM Setup - ClientForge CRM              ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  try {
    // Step 1: Create ILM Policy
    console.log('1. Creating ILM Policy...')

    const ilmPolicy = {
      policy: {
        phases: {
          hot: {
            min_age: '0ms',
            actions: {
              rollover: {
                max_primary_shard_size: '50gb',
                max_age: '30d',
                max_docs: 10000000
              },
              set_priority: {
                priority: 100
              }
            }
          },
          warm: {
            min_age: '7d',
            actions: {
              set_priority: {
                priority: 50
              },
              shrink: {
                number_of_shards: 1
              },
              forcemerge: {
                max_num_segments: 1
              }
            }
          },
          cold: {
            min_age: '30d',
            actions: {
              set_priority: {
                priority: 0
              },
              freeze: {}
            }
          },
          delete: {
            min_age: '90d',
            actions: {
              delete: {}
            }
          }
        }
      }
    }

    await client.ilm.putLifecycle({
      name: ILM_POLICY_NAME,
      body: ilmPolicy
    })

    console.log(`   ✓ Created ILM policy: ${ILM_POLICY_NAME}`)
    console.log('   Policy phases:')
    console.log('     - Hot: Rollover at 50GB/30d/10M docs')
    console.log('     - Warm: After 7d, shrink + forcemerge')
    console.log('     - Cold: After 30d, freeze')
    console.log('     - Delete: After 90d\n')

    // Step 2: Create Index Templates with ILM
    console.log('2. Creating Index Templates...\n')

    const templates = [
      {
        name: 'contacts-template',
        pattern: 'contacts-*',
        shards: 2,
        replicas: 1
      },
      {
        name: 'deals-template',
        pattern: 'deals-*',
        shards: 2,
        replicas: 1
      },
      {
        name: 'tasks-template',
        pattern: 'tasks-*',
        shards: 1,
        replicas: 1
      },
      {
        name: 'activities-template',
        pattern: 'activities-*',
        shards: 1,
        replicas: 1
      }
    ]

    for (const template of templates) {
      const templateBody = {
        index_patterns: [template.pattern],
        template: {
          settings: {
            number_of_shards: template.shards,
            number_of_replicas: template.replicas,
            'index.lifecycle.name': ILM_POLICY_NAME,
            'index.lifecycle.rollover_alias': template.name.replace('-template', '-write')
          },
          mappings: {
            properties: {
              tenant_id: {
                type: 'keyword'
              },
              created_at: {
                type: 'date'
              },
              updated_at: {
                type: 'date'
              }
            }
          }
        },
        priority: 100
      }

      await client.indices.putIndexTemplate({
        name: template.name,
        ...templateBody as any
      })

      console.log(`   ✓ Created template: ${template.name}`)
      console.log(`     Patterns: ${template.pattern}`)
      console.log(`     Rollover alias: ${template.name.replace('-template', '-write')}`)
      console.log(`     Shards: ${template.shards}, Replicas: ${template.replicas}\n`)
    }

    // Step 3: Create initial indices with write aliases
    console.log('3. Creating Initial Indices with Write Aliases...\n')

    const indices = [
      { name: 'contacts-000001', alias: 'contacts-write' },
      { name: 'deals-000001', alias: 'deals-write' },
      { name: 'tasks-000001', alias: 'tasks-write' },
      { name: 'activities-000001', alias: 'activities-write' }
    ]

    for (const index of indices) {
      // Check if index already exists
      const exists = await client.indices.exists({ index: index.name })

      if (exists) {
        console.log(`   ○ Index ${index.name} already exists, skipping`)
      } else {
        await client.indices.create({
          index: index.name,
          body: {
            aliases: {
              [index.alias]: {
                is_write_index: true
              }
            }
          }
        })
        console.log(`   ✓ Created index: ${index.name}`)
        console.log(`     Write alias: ${index.alias}`)
      }
    }

    console.log('')

    // Step 4: Verify Setup
    console.log('4. Verifying Setup...\n')

    const policyResponse = await client.ilm.getLifecycle({ name: ILM_POLICY_NAME })
    console.log(`   ✓ ILM policy ${ILM_POLICY_NAME} verified`)

    const templateResponse = await client.indices.getIndexTemplate({
      name: 'contacts-template,deals-template,tasks-template,activities-template'
    })
    console.log(`   ✓ ${templateResponse.index_templates.length} templates verified`)

    const aliasResponse = await client.cat.aliases({
      format: 'json',
      name: 'contacts-write,deals-write,tasks-write,activities-write'
    })
    console.log(`   ✓ ${aliasResponse.length} write aliases verified\n`)

    // Success summary
    console.log('═══════════════════════════════════════════════════════════════')
    console.log('\n✓ ILM Setup Complete!\n')
    console.log('📊 Configuration:')
    console.log(`   ILM Policy: ${ILM_POLICY_NAME}`)
    console.log('   Index Templates: 4 (contacts, deals, tasks, activities)')
    console.log('   Write Aliases: 4')
    console.log('   Initial Indices: 4 (*-000001)\n')

    console.log('📝 Usage:')
    console.log('   Write to: contacts-write, deals-write, etc.')
    console.log('   Rollover will happen automatically at 50GB/30d/10M docs\n')

    console.log('🔍 Verify:')
    console.log('   curl -X GET "localhost:9200/_cat/indices/*-000001?v"')
    console.log('   curl -X GET "localhost:9200/_cat/aliases/*-write?v"')
    console.log('   curl -X GET "localhost:9200/_ilm/policy/clientforge-crm-policy"\n')

    console.log('🚀 Manual Rollover (for testing):')
    console.log('   curl -X POST "localhost:9200/contacts-write/_rollover"\n')

  } catch (error: any) {
    console.error('✗ Error setting up ILM:', error.message)
    if (error.meta?.body) {
      console.error('  Details:', JSON.stringify(error.meta.body, null, 2))
    }
    process.exit(1)
  }
}

// Run
setupILM().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
