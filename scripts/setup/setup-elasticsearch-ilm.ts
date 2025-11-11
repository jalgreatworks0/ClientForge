/**
 * Elasticsearch ILM (Index Lifecycle Management) Setup Script
 * Configures production-ready index lifecycle policies for ClientForge CRM
 *
 * Run with: npx tsx scripts/setup/setup-elasticsearch-ilm.ts
 */

import { Client } from '@elastic/elasticsearch';
import { getElasticsearchClient } from '../../config/database/elasticsearch-config';

const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  success: (msg: string) => console.log(`✅ ${msg}`)
};

/**
 * Create ILM policy with hot/warm/delete phases
 */
async function createILMPolicy(client: Client) {
  logger.info('Creating ILM policy: crm_policy');

  try {
    await client.ilm.putLifecycle({
      name: 'crm_policy',
      body: {
        policy: {
          phases: {
            // HOT phase: Active writes and searches
            hot: {
              min_age: '0ms',
              actions: {
                rollover: {
                  max_age: '30d',
                  max_size: '50GB',
                  max_docs: 10000000
                },
                set_priority: {
                  priority: 100
                }
              }
            },
            // WARM phase: Read-only, optimized for queries
            warm: {
              min_age: '30d',
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
            // DELETE phase: Remove old data
            delete: {
              min_age: '90d',
              actions: {
                delete: {}
              }
            }
          }
        }
      }
    });

    logger.success('ILM policy created successfully');
  } catch (error: any) {
    if (error.meta?.statusCode === 400 && error.body?.error?.type === 'resource_already_exists_exception') {
      logger.info('ILM policy already exists, updating...');
      // Policy exists, this is fine
    } else {
      throw error;
    }
  }
}

/**
 * Create index template with strict mappings and ILM settings
 */
async function createIndexTemplate(client: Client, entityType: string) {
  logger.info(`Creating index template for: ${entityType}`);

  const mappings: Record<string, any> = {
    contacts: {
      dynamic: 'strict',
      properties: {
        tenant_id: { type: 'keyword' },
        id: { type: 'keyword' },
        first_name: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        last_name: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        email: {
          type: 'keyword',
          index: false
        },
        email_normalized: {
          type: 'keyword',
          normalizer: 'lowercase_normalizer'
        },
        company: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        title: { type: 'text' },
        phone: { type: 'keyword', index: false },
        lifecycle_stage: { type: 'keyword' },
        lead_status: { type: 'keyword' },
        lead_score: { type: 'integer' },
        tags: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        last_contacted_at: { type: 'date' },
        search_text: {
          type: 'text',
          analyzer: 'standard'
        }
      }
    },
    deals: {
      dynamic: 'strict',
      properties: {
        tenant_id: { type: 'keyword' },
        id: { type: 'keyword' },
        title: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        amount: { type: 'double' },
        currency: { type: 'keyword' },
        stage_id: { type: 'keyword' },
        pipeline_id: { type: 'keyword' },
        probability: { type: 'integer' },
        expected_close_date: { type: 'date' },
        is_closed: { type: 'boolean' },
        is_won: { type: 'boolean' },
        owner_id: { type: 'keyword' },
        account_id: { type: 'keyword' },
        contact_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        search_text: {
          type: 'text',
          analyzer: 'standard'
        }
      }
    },
    accounts: {
      dynamic: 'strict',
      properties: {
        tenant_id: { type: 'keyword' },
        id: { type: 'keyword' },
        name: {
          type: 'text',
          fields: { keyword: { type: 'keyword' } }
        },
        industry: { type: 'keyword' },
        website: { type: 'keyword', index: false },
        phone: { type: 'keyword', index: false },
        email: { type: 'keyword', index: false },
        employee_count: { type: 'integer' },
        annual_revenue: { type: 'double' },
        owner_id: { type: 'keyword' },
        created_at: { type: 'date' },
        updated_at: { type: 'date' },
        search_text: {
          type: 'text',
          analyzer: 'standard'
        }
      }
    }
  };

  try {
    await client.indices.putIndexTemplate({
      name: `${entityType}_template`,
      body: {
        index_patterns: [`${entityType}-*`],
        template: {
          settings: {
            'index.lifecycle.name': 'crm_policy',
            'index.lifecycle.rollover_alias': entityType,
            'index.number_of_shards': 2,
            'index.number_of_replicas': 1,
            'index.refresh_interval': '5s',
            // Slow query logging
            'index.search.slowlog.threshold.query.warn': '10s',
            'index.search.slowlog.threshold.query.info': '5s',
            'index.search.slowlog.threshold.fetch.warn': '1s',
            'index.search.slowlog.threshold.fetch.info': '500ms',
            // Indexing slowlog
            'index.indexing.slowlog.threshold.index.warn': '10s',
            'index.indexing.slowlog.threshold.index.info': '5s',
            // Custom normalizer for lowercase
            'analysis': {
              'normalizer': {
                'lowercase_normalizer': {
                  'type': 'custom',
                  'filter': ['lowercase']
                }
              }
            }
          },
          mappings: mappings[entityType] || mappings.contacts
        },
        priority: 100
      }
    });

    logger.success(`Index template created for: ${entityType}`);
  } catch (error: any) {
    if (error.meta?.statusCode === 400) {
      logger.info(`Index template already exists for: ${entityType}`);
    } else {
      throw error;
    }
  }
}

/**
 * Create initial write index with alias
 */
async function createInitialIndex(client: Client, entityType: string) {
  const indexName = `${entityType}-000001`;
  const aliasName = entityType;

  logger.info(`Creating initial index: ${indexName}`);

  try {
    // Check if alias already exists
    const aliasExists = await client.indices.existsAlias({ name: aliasName });

    if (aliasExists) {
      logger.info(`Alias ${aliasName} already exists, skipping index creation`);
      return;
    }

    // Create the first index
    await client.indices.create({
      index: indexName,
      body: {
        aliases: {
          [aliasName]: {
            is_write_index: true
          }
        }
      }
    });

    logger.success(`Initial index created: ${indexName}`);
  } catch (error: any) {
    if (error.meta?.statusCode === 400 && error.body?.error?.type === 'resource_already_exists_exception') {
      logger.info(`Index ${indexName} already exists`);
    } else {
      throw error;
    }
  }
}

/**
 * Create tenant-specific filtered alias
 */
async function createTenantAlias(client: Client, entityType: string, tenantId: string) {
  const aliasName = `${entityType}-${tenantId}`;

  logger.info(`Creating tenant alias: ${aliasName}`);

  try {
    await client.indices.putAlias({
      index: `${entityType}-*`,
      name: aliasName,
      body: {
        filter: {
          term: { tenant_id: tenantId }
        }
      }
    });

    logger.success(`Tenant alias created: ${aliasName}`);
  } catch (error: any) {
    logger.error(`Failed to create tenant alias: ${aliasName}`, error.message);
    throw error;
  }
}

/**
 * Verify ILM policy is working
 */
async function verifyILMPolicy(client: Client) {
  logger.info('Verifying ILM policy...');

  try {
    const response = await client.ilm.getLifecycle({ name: 'crm_policy' });
    logger.success('ILM policy verified');
    logger.info('Policy details:', JSON.stringify(response, null, 2));
  } catch (error: any) {
    logger.error('Failed to verify ILM policy', error.message);
    throw error;
  }
}

/**
 * Get index statistics
 */
async function getIndexStats(client: Client, entityType: string) {
  logger.info(`Getting index statistics for: ${entityType}`);

  try {
    const stats = await client.indices.stats({
      index: `${entityType}-*`
    });

    logger.info(`Index statistics for ${entityType}:`, {
      total_docs: stats._all?.primaries?.docs?.count,
      total_size: stats._all?.primaries?.store?.size_in_bytes,
      indices_count: Object.keys(stats.indices || {}).length
    });
  } catch (error: any) {
    if (error.meta?.statusCode === 404) {
      logger.info(`No indices found for: ${entityType}`);
    } else {
      logger.error('Failed to get index stats', error.message);
    }
  }
}

/**
 * Main setup function
 */
async function main() {
  logger.info('Starting Elasticsearch ILM setup...');

  try {
    const client = await getElasticsearchClient();

    // Step 1: Create ILM policy
    await createILMPolicy(client);

    // Step 2: Create index templates for each entity type
    const entityTypes = ['contacts', 'deals', 'accounts'];
    for (const entityType of entityTypes) {
      await createIndexTemplate(client, entityType);
      await createInitialIndex(client, entityType);
    }

    // Step 3: Verify ILM policy
    await verifyILMPolicy(client);

    // Step 4: Get statistics
    for (const entityType of entityTypes) {
      await getIndexStats(client, entityType);
    }

    logger.success('Elasticsearch ILM setup completed successfully!');
    logger.info('');
    logger.info('Next steps:');
    logger.info('1. Create tenant-specific aliases when tenants are created');
    logger.info('2. Update search queries to use tenant aliases for isolation');
    logger.info('3. Monitor ILM policy execution in Kibana or via API');
    logger.info('4. Adjust rollover thresholds based on actual usage');

  } catch (error: any) {
    logger.error('ILM setup failed', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().then(() => process.exit(0));
}

export {
  createILMPolicy,
  createIndexTemplate,
  createInitialIndex,
  createTenantAlias,
  verifyILMPolicy,
  getIndexStats
};
