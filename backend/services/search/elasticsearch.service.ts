/**
 * Elasticsearch Search Service
 * Provides full-text search across all entities
 * Falls back to PostgreSQL full-text search if Elasticsearch unavailable
 */

import { Client } from '@elastic/elasticsearch';
import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

export interface SearchQuery {
  query: string;
  filters?: SearchFilters;
  pagination?: SearchPagination;
  sorting?: SearchSorting;
}

export interface SearchFilters {
  entityTypes?: string[]; // contact, deal, company, etc.
  tags?: string[];
  assignedTo?: string[];
  createdAfter?: Date;
  createdBefore?: Date;
  customFilters?: Record<string, any>;
}

export interface SearchPagination {
  limit?: number;
  offset?: number;
}

export interface SearchSorting {
  field: string;
  order: 'asc' | 'desc';
}

export interface SearchResult {
  id: string;
  entityType: string;
  title: string;
  description?: string;
  score: number;
  highlights?: string[];
  data: Record<string, any>;
  createdAt: Date;
  updatedAt?: Date;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took: number; // milliseconds
  aggregations?: Record<string, any>;
}

export class ElasticsearchService {
  private client: Client | null = null;
  private pool: Pool;
  private enabled: boolean = false;
  private readonly indexName = 'clientforge';

  constructor() {
    this.pool = getPool();
    this.initialize();
  }

  /**
   * Initialize Elasticsearch client
   */
  private initialize(): void {
    try {
      const elasticsearchUrl = process.env.ELASTICSEARCH_URL;
      const elasticsearchApiKey = process.env.ELASTICSEARCH_API_KEY;

      if (!elasticsearchUrl) {
        logger.warn('[Elasticsearch] URL not configured - falling back to PostgreSQL search');
        return;
      }

      this.client = new Client({
        node: elasticsearchUrl,
        auth: elasticsearchApiKey
          ? { apiKey: elasticsearchApiKey }
          : undefined,
      });

      this.enabled = true;

      logger.info('[Elasticsearch] Client initialized', {
        node: elasticsearchUrl,
      });
    } catch (error: any) {
      logger.error('[Elasticsearch] Failed to initialize client', {
        error: error.message,
      });
    }
  }

  /**
   * Search across all entities
   */
  async search(
    tenantId: string,
    searchQuery: SearchQuery
  ): Promise<SearchResponse> {
    const startTime = Date.now();

    if (this.enabled && this.client) {
      return this.searchElasticsearch(tenantId, searchQuery, startTime);
    } else {
      return this.searchPostgreSQL(tenantId, searchQuery, startTime);
    }
  }

  /**
   * Search using Elasticsearch
   */
  private async searchElasticsearch(
    tenantId: string,
    searchQuery: SearchQuery,
    startTime: number
  ): Promise<SearchResponse> {
    try {
      const { query, filters, pagination, sorting } = searchQuery;
      const { limit = 20, offset = 0 } = pagination || {};

      // Build Elasticsearch query
      const must: any[] = [
        { term: { tenantId: tenantId } },
        {
          multi_match: {
            query,
            fields: ['title^3', 'description^2', 'content', 'email', 'phone', 'tags'],
            fuzziness: 'AUTO',
          },
        },
      ];

      // Apply filters
      if (filters?.entityTypes && filters.entityTypes.length > 0) {
        must.push({ terms: { entity_type: filters.entityTypes } });
      }

      if (filters?.tags && filters.tags.length > 0) {
        must.push({ terms: { tags: filters.tags } });
      }

      if (filters?.assignedTo && filters.assignedTo.length > 0) {
        must.push({ terms: { assigned_to: filters.assignedTo } });
      }

      if (filters?.createdAfter || filters?.createdBefore) {
        const range: any = {};
        if (filters.createdAfter) range.gte = filters.createdAfter.toISOString();
        if (filters.createdBefore) range.lte = filters.createdBefore.toISOString();
        must.push({ range: { created_at: range } });
      }

      const response = await this.client!.search({
        index: this.indexName,
        body: {
          query: { bool: { must } },
          from: offset,
          size: limit,
          sort: sorting
            ? [{ [sorting.field]: { order: sorting.order } }]
            : [{ _score: { order: 'desc' } }],
          highlight: {
            fields: {
              title: {},
              description: {},
              content: {},
            },
          },
          aggregations: {
            entity_types: {
              terms: { field: 'entity_type.keyword' },
            },
            tags: {
              terms: { field: 'tags.keyword', size: 20 },
            },
          },
        },
      });

      const results: SearchResult[] = response.hits.hits.map((hit: any) => ({
        id: hit._id,
        entityType: hit._source.entity_type,
        title: hit._source.title,
        description: hit._source.description,
        score: hit._score,
        highlights: hit.highlight
          ? Object.values(hit.highlight).flat() as string[]
          : undefined,
        data: hit._source,
        createdAt: new Date(hit._source.created_at),
        updatedAt: hit._source.updated_at
          ? new Date(hit._source.updated_at)
          : undefined,
      }));

      const took = Date.now() - startTime;

      logger.info('[Elasticsearch] Search completed', {
        query,
        total: response.hits.total,
        took,
      });

      return {
        results,
        total: typeof response.hits.total === 'object'
          ? response.hits.total.value
          : response.hits.total,
        took,
        aggregations: response.aggregations,
      };
    } catch (error: any) {
      logger.error('[Elasticsearch] Search failed, falling back to PostgreSQL', {
        error: error.message,
      });
      return this.searchPostgreSQL(tenantId, searchQuery, startTime);
    }
  }

  /**
   * Search using PostgreSQL full-text search (fallback)
   */
  private async searchPostgreSQL(
    tenantId: string,
    searchQuery: SearchQuery,
    startTime: number
  ): Promise<SearchResponse> {
    try {
      const { query, filters, pagination, sorting } = searchQuery;
      const { limit = 20, offset = 0 } = pagination || {};

      // Build SQL query
      let sql = `
        WITH search_results AS (
          -- Search contacts
          SELECT
            c.id,
            'contact' as entity_type,
            CONCAT(c.first_name, ' ', c.last_name) as title,
            c.email as description,
            ts_rank(
              to_tsvector('english', CONCAT(c.first_name, ' ', c.last_name, ' ', COALESCE(c.email, ''), ' ', COALESCE(c.phone, ''))),
              plainto_tsquery('english', $1)
            ) as score,
            jsonb_build_object(
              'id', c.id,
              'firstName', c.first_name,
              'lastName', c.last_name,
              'email', c.email,
              'phone', c.phone,
              'company', c.company_name
            ) as data,
            c.created_at,
            c.updated_at
          FROM contacts c
          WHERE c.tenantId = $2
            AND to_tsvector('english', CONCAT(c.first_name, ' ', c.last_name, ' ', COALESCE(c.email, ''), ' ', COALESCE(c.phone, ''))) @@ plainto_tsquery('english', $1)

          UNION ALL

          -- Search deals
          SELECT
            d.id,
            'deal' as entity_type,
            d.name as title,
            d.description,
            ts_rank(
              to_tsvector('english', CONCAT(d.name, ' ', COALESCE(d.description, ''))),
              plainto_tsquery('english', $1)
            ) as score,
            jsonb_build_object(
              'id', d.id,
              'name', d.name,
              'value', d.value,
              'stage', d.stage,
              'probability', d.probability
            ) as data,
            d.created_at,
            d.updated_at
          FROM deals d
          WHERE d.tenantId = $2
            AND to_tsvector('english', CONCAT(d.name, ' ', COALESCE(d.description, ''))) @@ plainto_tsquery('english', $1)

          UNION ALL

          -- Search tasks
          SELECT
            t.id,
            'task' as entity_type,
            t.title,
            t.description,
            ts_rank(
              to_tsvector('english', CONCAT(t.title, ' ', COALESCE(t.description, ''))),
              plainto_tsquery('english', $1)
            ) as score,
            jsonb_build_object(
              'id', t.id,
              'title', t.title,
              'status', t.status,
              'priority', t.priority,
              'dueDate', t.due_date
            ) as data,
            t.created_at,
            t.updated_at
          FROM tasks t
          WHERE t.tenantId = $2
            AND to_tsvector('english', CONCAT(t.title, ' ', COALESCE(t.description, ''))) @@ plainto_tsquery('english', $1)

          UNION ALL

          -- Search notes
          SELECT
            n.id,
            'note' as entity_type,
            n.title,
            n.content as description,
            ts_rank(
              to_tsvector('english', CONCAT(n.title, ' ', COALESCE(n.content, ''))),
              plainto_tsquery('english', $1)
            ) as score,
            jsonb_build_object(
              'id', n.id,
              'title', n.title,
              'content', n.content
            ) as data,
            n.created_at,
            n.updated_at
          FROM notes n
          WHERE n.tenantId = $2
            AND to_tsvector('english', CONCAT(n.title, ' ', COALESCE(n.content, ''))) @@ plainto_tsquery('english', $1)
        )
        SELECT * FROM search_results
        WHERE score > 0
      `;

      // Apply entity type filter
      if (filters?.entityTypes && filters.entityTypes.length > 0) {
        const entityTypesParam = filters.entityTypes.map((t) => `'${t}'`).join(',');
        sql += ` AND entity_type IN (${entityTypesParam})`;
      }

      // Apply sorting
      if (sorting) {
        sql += ` ORDER BY ${sorting.field} ${sorting.order}`;
      } else {
        sql += ` ORDER BY score DESC, created_at DESC`;
      }

      // Apply pagination
      sql += ` LIMIT $3 OFFSET $4`;

      const result = await this.pool.query(sql, [query, tenantId, limit, offset]);

      // Get total count
      const countResult = await this.pool.query(
        `SELECT COUNT(*) FROM (${sql.replace(/LIMIT \$3 OFFSET \$4/, '')}) as total`,
        [query, tenantId]
      );

      const results: SearchResult[] = result.rows.map((row) => ({
        id: row.id,
        entityType: row.entity_type,
        title: row.title,
        description: row.description,
        score: parseFloat(row.score),
        data: row.data,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));

      const took = Date.now() - startTime;

      logger.info('[Elasticsearch] PostgreSQL search completed', {
        query,
        total: countResult.rows[0].count,
        took,
      });

      return {
        results,
        total: parseInt(countResult.rows[0].count, 10),
        took,
      };
    } catch (error: any) {
      logger.error('[Elasticsearch] PostgreSQL search failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Index a document
   */
  async index(
    entityType: string,
    entityId: string,
    document: Record<string, any>
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      logger.debug('[Elasticsearch] Indexing skipped (not enabled)');
      return;
    }

    try {
      await this.client.index({
        index: this.indexName,
        id: `${entityType}-${entityId}`,
        body: {
          ...document,
          entity_type: entityType,
          indexed_at: new Date().toISOString(),
        },
      });

      logger.debug('[Elasticsearch] Document indexed', {
        entityType,
        entityId,
      });
    } catch (error: any) {
      logger.error('[Elasticsearch] Failed to index document', {
        error: error.message,
        entityType,
        entityId,
      });
    }
  }

  /**
   * Update a document
   */
  async update(
    entityType: string,
    entityId: string,
    updates: Record<string, any>
  ): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.update({
        index: this.indexName,
        id: `${entityType}-${entityId}`,
        body: {
          doc: {
            ...updates,
            updated_at: new Date().toISOString(),
          },
        },
      });

      logger.debug('[Elasticsearch] Document updated', {
        entityType,
        entityId,
      });
    } catch (error: any) {
      logger.error('[Elasticsearch] Failed to update document', {
        error: error.message,
        entityType,
        entityId,
      });
    }
  }

  /**
   * Delete a document
   */
  async delete(entityType: string, entityId: string): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      await this.client.delete({
        index: this.indexName,
        id: `${entityType}-${entityId}`,
      });

      logger.debug('[Elasticsearch] Document deleted', {
        entityType,
        entityId,
      });
    } catch (error: any) {
      if (error.meta?.statusCode === 404) {
        // Document doesn't exist, that's okay
        return;
      }
      logger.error('[Elasticsearch] Failed to delete document', {
        error: error.message,
        entityType,
        entityId,
      });
    }
  }

  /**
   * Create index if it doesn't exist
   */
  async createIndex(): Promise<void> {
    if (!this.enabled || !this.client) {
      return;
    }

    try {
      const exists = await this.client.indices.exists({
        index: this.indexName,
      });

      if (!exists) {
        await this.client.indices.create({
          index: this.indexName,
          body: {
            settings: {
              number_of_shards: 1,
              number_of_replicas: 1,
              analysis: {
                analyzer: {
                  custom_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'asciifolding', 'stop', 'snowball'],
                  },
                },
              },
            },
            mappings: {
              properties: {
                tenantId: { type: 'keyword' },
                entity_type: { type: 'keyword' },
                title: { type: 'text', analyzer: 'custom_analyzer' },
                description: { type: 'text', analyzer: 'custom_analyzer' },
                content: { type: 'text', analyzer: 'custom_analyzer' },
                email: { type: 'keyword' },
                phone: { type: 'keyword' },
                tags: { type: 'keyword' },
                assigned_to: { type: 'keyword' },
                created_at: { type: 'date' },
                updated_at: { type: 'date' },
                indexed_at: { type: 'date' },
              },
            },
          },
        });

        logger.info('[Elasticsearch] Index created', {
          index: this.indexName,
        });
      }
    } catch (error: any) {
      logger.error('[Elasticsearch] Failed to create index', {
        error: error.message,
      });
    }
  }

  /**
   * Bulk index documents
   */
  async bulkIndex(documents: Array<{ entityType: string; entityId: string; document: Record<string, any> }>): Promise<void> {
    if (!this.enabled || !this.client || documents.length === 0) {
      return;
    }

    try {
      const body = documents.flatMap((doc) => [
        { index: { _index: this.indexName, _id: `${doc.entityType}-${doc.entityId}` } },
        {
          ...doc.document,
          entity_type: doc.entityType,
          indexed_at: new Date().toISOString(),
        },
      ]);

      const response = await this.client.bulk({ body });

      if (response.errors) {
        logger.warn('[Elasticsearch] Bulk index completed with errors', {
          total: documents.length,
          errors: response.items.filter((item: any) => item.index?.error),
        });
      } else {
        logger.info('[Elasticsearch] Bulk index completed', {
          total: documents.length,
        });
      }
    } catch (error: any) {
      logger.error('[Elasticsearch] Bulk index failed', {
        error: error.message,
      });
    }
  }
}

// Export singleton instance
export const elasticsearchService = new ElasticsearchService();
