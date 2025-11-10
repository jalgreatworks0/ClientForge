/**
 * Elasticsearch Configuration
 * Full-text search and advanced query capabilities
 */

import { Client, ClientOptions } from '@elastic/elasticsearch'

export interface ElasticsearchConfig {
  url: string
  apiKey?: string
  options: ClientOptions
}

export const elasticsearchConfig: ElasticsearchConfig = {
  url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  apiKey: process.env.ELASTICSEARCH_API_KEY,
  options: {
    node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    ...(process.env.ELASTICSEARCH_API_KEY && {
      auth: {
        apiKey: process.env.ELASTICSEARCH_API_KEY,
      },
    }),
    maxRetries: 3,
    requestTimeout: 30000,
    sniffOnStart: false,
    sniffInterval: false,
  },
}

/**
 * Create and export Elasticsearch client
 */
let elasticClient: Client | null = null

export async function getElasticsearchClient(): Promise<Client> {
  if (!elasticClient) {
    elasticClient = new Client(elasticsearchConfig.options)

    try {
      // Test connection
      const info = await elasticClient.info()
      console.log('[OK] Elasticsearch connected:', info.version?.number)
    } catch (error) {
      console.error('❌ Failed to connect to Elasticsearch:', error)
      elasticClient = null
      throw error
    }
  }

  return elasticClient
}

/**
 * Close Elasticsearch connection
 */
export async function closeElasticsearchClient(): Promise<void> {
  if (elasticClient) {
    await elasticClient.close()
    elasticClient = null
    console.log('Elasticsearch connection closed')
  }
}

/**
 * Test Elasticsearch connection
 */
export async function testElasticsearchConnection(): Promise<boolean> {
  try {
    const client = await getElasticsearchClient()
    await client.ping()
    console.log('✅ Elasticsearch connection test successful')
    return true
  } catch (error) {
    console.error('❌ Elasticsearch connection test failed:', error)
    return false
  }
}

/**
 * Index mapping definitions
 */
const indexMappings = {
  contacts: {
    properties: {
      id: { type: 'keyword' },
      tenant_id: { type: 'keyword' },
      first_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      last_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      email: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      phone: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      company_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      full_text: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
  accounts: {
    properties: {
      id: { type: 'keyword' },
      tenant_id: { type: 'keyword' },
      name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      website: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      industry: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      description: { type: 'text' },
      full_text: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
  deals: {
    properties: {
      id: { type: 'keyword' },
      tenant_id: { type: 'keyword' },
      name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      account_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      contact_name: {
        type: 'text',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      stage: {
        type: 'keyword',
        fields: {
          text: { type: 'text' },
        },
      },
      amount: {
        type: 'double',
      },
      full_text: {
        type: 'text',
        analyzer: 'standard',
        fields: {
          keyword: { type: 'keyword' },
        },
      },
      created_at: { type: 'date' },
      updated_at: { type: 'date' },
    },
  },
}

/**
 * Initialize Elasticsearch indexes
 */
export async function initializeSearchIndexes(): Promise<void> {
  try {
    const client = await getElasticsearchClient()
    const indexNames = Object.keys(indexMappings) as Array<
      keyof typeof indexMappings
    >

    for (const indexName of indexNames) {
      try {
        // Check if index exists
        const exists = await client.indices.exists({ index: indexName })

        if (!exists) {
          // Create index with mappings
          await client.indices.create({
            index: indexName,
            body: {
              mappings: indexMappings[indexName],
              settings: {
                number_of_shards: 1,
                number_of_replicas: 1,
                analysis: {
                  analyzer: {
                    standard: {
                      type: 'standard',
                    },
                  },
                },
              },
            },
          })
          console.log(`✅ Created Elasticsearch index: ${indexName}`)
        } else {
          console.log(`ℹ️ Elasticsearch index already exists: ${indexName}`)
        }

        // Create index aliases for versioning
        try {
          await client.indices.putAlias({
            index: indexName,
            name: `${indexName}-current`,
          })
        } catch (error: any) {
          if (error.statusCode !== 400) {
            throw error
          }
          // Alias might already exist
        }
      } catch (error) {
        console.error(
          `❌ Failed to initialize Elasticsearch index ${indexName}:`,
          error,
        )
        throw error
      }
    }

    console.log('✅ Elasticsearch indexes and aliases initialized')
  } catch (error) {
    console.error('❌ Failed to initialize Elasticsearch indexes:', error)
    throw error
  }
}

export default elasticsearchConfig
