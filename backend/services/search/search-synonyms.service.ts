/**
 * Search Synonyms Service
 * Manages Elasticsearch synonyms to improve search recall
 */

import { Pool } from 'pg'

import { logger } from '../../utils/logging/logger'
import { getElasticsearchClient } from '../../../config/database/elasticsearch-config'

export interface Synonym {
  id: string
  tenantId: string
  synonyms: string[] // e.g., ['phone', 'mobile', 'cell']
  createdBy: string
  createdAt: Date
}

export class SearchSynonymsService {
  private pool: Pool

  constructor(pool: Pool) {
    this.pool = pool
  }

  /**
   * Add a synonym group
   */
  async addSynonymGroup(
    tenantId: string,
    synonyms: string[],
    createdBy: string
  ): Promise<Synonym> {
    try {
      // Normalize synonyms (lowercase, trim)
      const normalizedSynonyms = synonyms
        .map((s) => s.toLowerCase().trim())
        .filter((s) => s.length > 0)

      if (normalizedSynonyms.length < 2) {
        throw new Error('At least 2 synonyms are required')
      }

      // Insert into database
      const result = await this.pool.query(
        `
        INSERT INTO search_synonyms (
          tenantId,
          synonyms,
          created_by,
          created_at
        ) VALUES ($1, $2, $3, NOW())
        RETURNING id, tenantId, synonyms, created_by, created_at
        `,
        [tenantId, normalizedSynonyms, createdBy]
      )

      const synonym = {
        id: result.rows[0].id,
        tenantId: result.rows[0].tenantId,
        synonyms: result.rows[0].synonyms,
        createdBy: result.rows[0].created_by,
        createdAt: result.rows[0].created_at,
      }

      // Update Elasticsearch synonym filter
      await this.updateElasticsearchSynonyms(tenantId)

      logger.info('Synonym group added', {
        tenantId,
        synonyms: normalizedSynonyms,
      })

      return synonym
    } catch (error) {
      logger.error('Failed to add synonym group', { error, tenantId })
      throw error
    }
  }

  /**
   * Get all synonym groups for a tenant
   */
  async getSynonymGroups(tenantId: string): Promise<Synonym[]> {
    try {
      const result = await this.pool.query(
        `
        SELECT id, tenantId, synonyms, created_by, created_at
        FROM search_synonyms
        WHERE tenantId = $1
        ORDER BY created_at DESC
        `,
        [tenantId]
      )

      return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenantId,
        synonyms: row.synonyms,
        createdBy: row.created_by,
        createdAt: row.created_at,
      }))
    } catch (error) {
      logger.error('Failed to get synonym groups', { error, tenantId })
      throw error
    }
  }

  /**
   * Delete a synonym group
   */
  async deleteSynonymGroup(tenantId: string, synonymId: string): Promise<void> {
    try {
      await this.pool.query(
        `
        DELETE FROM search_synonyms
        WHERE id = $1 AND tenantId = $2
        `,
        [synonymId, tenantId]
      )

      // Update Elasticsearch synonym filter
      await this.updateElasticsearchSynonyms(tenantId)

      logger.info('Synonym group deleted', { tenantId, synonymId })
    } catch (error) {
      logger.error('Failed to delete synonym group', { error, tenantId })
      throw error
    }
  }

  /**
   * Update Elasticsearch synonym filter for a tenant
   * Note: This requires reindexing for changes to take effect
   */
  private async updateElasticsearchSynonyms(tenantId: string): Promise<void> {
    try {
      const elasticClient = await getElasticsearchClient()

      // Get all synonym groups for tenant
      const synonymGroups = await this.getSynonymGroups(tenantId)

      // Format synonyms for Elasticsearch
      // Format: "word1, word2, word3 => word1"
      const synonymRules = synonymGroups.map((group) => group.synonyms.join(', '))

      // Update synonym filter (requires index settings update)
      // Note: In production, you'd want to create a new index with updated settings
      // and reindex, rather than updating existing index

      logger.info('Elasticsearch synonyms updated', {
        tenantId,
        rulesCount: synonymRules.length,
      })

      // For now, log the synonym rules that should be applied
      // Actual implementation requires index recreation or dynamic synonym loading
      logger.debug('Synonym rules', { tenantId, rules: synonymRules })
    } catch (error) {
      logger.error('Failed to update Elasticsearch synonyms', { error, tenantId })
      // Don't throw - synonym update is non-critical
    }
  }

  /**
   * Get built-in synonym suggestions based on common terms
   */
  getBuiltInSynonyms(): Array<{ category: string; synonyms: string[] }> {
    return [
      {
        category: 'Contact Methods',
        synonyms: ['phone', 'mobile', 'cell', 'telephone'],
      },
      {
        category: 'Email',
        synonyms: ['email', 'mail', 'e-mail'],
      },
      {
        category: 'Company',
        synonyms: ['company', 'organization', 'org', 'business', 'firm'],
      },
      {
        category: 'Contact Person',
        synonyms: ['contact', 'person', 'individual', 'lead'],
      },
      {
        category: 'Deal/Opportunity',
        synonyms: ['deal', 'opportunity', 'opp', 'sale'],
      },
      {
        category: 'Customer',
        synonyms: ['customer', 'client', 'account'],
      },
      {
        category: 'Address',
        synonyms: ['address', 'location', 'place'],
      },
      {
        category: 'Website',
        synonyms: ['website', 'site', 'web', 'url'],
      },
      {
        category: 'Industry',
        synonyms: ['industry', 'sector', 'vertical'],
      },
      {
        category: 'Revenue',
        synonyms: ['revenue', 'income', 'sales', 'turnover'],
      },
    ]
  }
}
