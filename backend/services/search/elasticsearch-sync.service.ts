/**
 * Elasticsearch Sync Service
 *
 * Handles synchronization of contacts, accounts, and deals with Elasticsearch
 * Manages indexing, updating, and deleting documents for full-text search
 *
 * @module services/search/elasticsearch-sync
 */

import { Client } from '@elastic/elasticsearch'

import { getElasticsearchClient } from '../../../config/database/elasticsearch-config'
import { logger } from '../../utils/logging/logger'

/**
 * Document types for Elasticsearch
 */
export interface ContactDocument {
  id: string
  tenant_id: string
  first_name: string
  last_name: string
  email: string
  phone?: string
  company_name?: string
  full_text: string
  created_at: Date
  updated_at: Date
}

export interface AccountDocument {
  id: string
  tenant_id: string
  name: string
  website?: string
  industry?: string
  description?: string
  full_text: string
  created_at: Date
  updated_at: Date
}

export interface DealDocument {
  id: string
  tenant_id: string
  name: string
  account_name: string
  contact_name: string
  stage: string
  amount?: number
  full_text: string
  created_at: Date
  updated_at: Date
}

/**
 * Sync operation types
 */
export type SyncOperation = 'create' | 'update' | 'delete'

/**
 * Elasticsearch Sync Service
 * Handles all search index synchronization operations
 */
export class ElasticsearchSyncService {
  private client: Client | null = null

  constructor() {
    this.initialize()
  }

  /**
   * Initialize the Elasticsearch client
   */
  private async initialize(): Promise<void> {
    try {
      this.client = await getElasticsearchClient()
    } catch (error) {
      logger.error('Failed to initialize Elasticsearch client', { error })
      throw error
    }
  }

  /**
   * Ensure client is initialized
   */
  private async ensureClient(): Promise<Client> {
    if (!this.client) {
      this.client = await getElasticsearchClient()
    }
    return this.client
  }

  /**
   * Build full-text search field from multiple fields
   * Concatenates and cleans text for better search results
   */
  private buildSearchText(...texts: (string | undefined)[]): string {
    return texts
      .filter((text): text is string => Boolean(text) && text.trim().length > 0)
      .map((text) => text.trim())
      .join(' ')
  }

  /**
   * Sync contact to Elasticsearch
   * Handles create, update, and delete operations
   */
  public async syncContact(
    contact: Partial<ContactDocument>,
    operation: SyncOperation = 'create',
  ): Promise<void> {
    try {
      const client = await this.ensureClient()

      if (!contact.id || !contact.tenant_id) {
        throw new Error('Contact must have id and tenant_id')
      }

      const documentId = `${contact.tenant_id}:${contact.id}`

      if (operation === 'delete') {
        await client.delete({
          index: 'contacts',
          id: documentId,
        })
        logger.info('Contact deleted from search index', {
          contactId: contact.id,
          tenantId: contact.tenant_id,
        })
      } else {
        // Build full-text field
        const fullText = this.buildSearchText(
          contact.first_name,
          contact.last_name,
          contact.email,
          contact.phone,
          contact.company_name,
        )

        const document: ContactDocument = {
          id: contact.id,
          tenant_id: contact.tenant_id,
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          email: contact.email || '',
          phone: contact.phone,
          company_name: contact.company_name,
          full_text: fullText,
          created_at: contact.created_at || new Date(),
          updated_at: contact.updated_at || new Date(),
        }

        await client.index({
          index: 'contacts',
          id: documentId,
          document,
          refresh: 'wait_for',
        })

        logger.info('Contact synced to search index', {
          contactId: contact.id,
          tenantId: contact.tenant_id,
          operation,
        })
      }
    } catch (error) {
      logger.error('Failed to sync contact to Elasticsearch', {
        contactId: contact.id,
        error,
      })
      throw error
    }
  }

  /**
   * Sync account to Elasticsearch
   * Handles create, update, and delete operations
   */
  public async syncAccount(
    account: Partial<AccountDocument>,
    operation: SyncOperation = 'create',
  ): Promise<void> {
    try {
      const client = await this.ensureClient()

      if (!account.id || !account.tenant_id) {
        throw new Error('Account must have id and tenant_id')
      }

      const documentId = `${account.tenant_id}:${account.id}`

      if (operation === 'delete') {
        await client.delete({
          index: 'accounts',
          id: documentId,
        })
        logger.info('Account deleted from search index', {
          accountId: account.id,
          tenantId: account.tenant_id,
        })
      } else {
        // Build full-text field
        const fullText = this.buildSearchText(
          account.name,
          account.website,
          account.industry,
          account.description,
        )

        const document: AccountDocument = {
          id: account.id,
          tenant_id: account.tenant_id,
          name: account.name || '',
          website: account.website,
          industry: account.industry,
          description: account.description,
          full_text: fullText,
          created_at: account.created_at || new Date(),
          updated_at: account.updated_at || new Date(),
        }

        await client.index({
          index: 'accounts',
          id: documentId,
          document,
          refresh: 'wait_for',
        })

        logger.info('Account synced to search index', {
          accountId: account.id,
          tenantId: account.tenant_id,
          operation,
        })
      }
    } catch (error) {
      logger.error('Failed to sync account to Elasticsearch', {
        accountId: account.id,
        error,
      })
      throw error
    }
  }

  /**
   * Sync deal to Elasticsearch
   * Handles create, update, and delete operations
   */
  public async syncDeal(
    deal: Partial<DealDocument>,
    operation: SyncOperation = 'create',
  ): Promise<void> {
    try {
      const client = await this.ensureClient()

      if (!deal.id || !deal.tenant_id) {
        throw new Error('Deal must have id and tenant_id')
      }

      const documentId = `${deal.tenant_id}:${deal.id}`

      if (operation === 'delete') {
        await client.delete({
          index: 'deals',
          id: documentId,
        })
        logger.info('Deal deleted from search index', {
          dealId: deal.id,
          tenantId: deal.tenant_id,
        })
      } else {
        // Build full-text field
        const fullText = this.buildSearchText(
          deal.name,
          deal.account_name,
          deal.contact_name,
          deal.stage,
          deal.amount ? `$${deal.amount}` : undefined,
        )

        const document: DealDocument = {
          id: deal.id,
          tenant_id: deal.tenant_id,
          name: deal.name || '',
          account_name: deal.account_name || '',
          contact_name: deal.contact_name || '',
          stage: deal.stage || '',
          amount: deal.amount,
          full_text: fullText,
          created_at: deal.created_at || new Date(),
          updated_at: deal.updated_at || new Date(),
        }

        await client.index({
          index: 'deals',
          id: documentId,
          document,
          refresh: 'wait_for',
        })

        logger.info('Deal synced to search index', {
          dealId: deal.id,
          tenantId: deal.tenant_id,
          operation,
        })
      }
    } catch (error) {
      logger.error('Failed to sync deal to Elasticsearch', {
        dealId: deal.id,
        error,
      })
      throw error
    }
  }

  /**
   * Bulk sync multiple contacts
   * More efficient than individual syncs for batch operations
   */
  public async syncContactsBulk(
    contacts: Array<Partial<ContactDocument>>,
  ): Promise<void> {
    try {
      const client = await this.ensureClient()

      const operations: any[] = []

      for (const contact of contacts) {
        if (!contact.id || !contact.tenant_id) {
          logger.warn('Skipping contact without id or tenant_id', { contact })
          continue
        }

        const documentId = `${contact.tenant_id}:${contact.id}`
        const fullText = this.buildSearchText(
          contact.first_name,
          contact.last_name,
          contact.email,
          contact.phone,
          contact.company_name,
        )

        const document: ContactDocument = {
          id: contact.id,
          tenant_id: contact.tenant_id,
          first_name: contact.first_name || '',
          last_name: contact.last_name || '',
          email: contact.email || '',
          phone: contact.phone,
          company_name: contact.company_name,
          full_text: fullText,
          created_at: contact.created_at || new Date(),
          updated_at: contact.updated_at || new Date(),
        }

        operations.push({ index: { _index: 'contacts', _id: documentId } })
        operations.push(document)
      }

      if (operations.length > 0) {
        const response = await client.bulk({
          operations,
          refresh: 'wait_for',
        })

        if (response.errors) {
          logger.warn('Some contacts failed to sync in bulk operation', {
            errors: response.items
              .filter((item: any) => item.index?.error)
              .map((item: any) => item.index?.error),
          })
        }

        logger.info('Bulk contact sync completed', {
          count: contacts.length,
          errors: response.errors ? 'yes' : 'no',
        })
      }
    } catch (error) {
      logger.error('Failed to bulk sync contacts to Elasticsearch', { error })
      throw error
    }
  }

  /**
   * Bulk sync multiple accounts
   * More efficient than individual syncs for batch operations
   */
  public async syncAccountsBulk(
    accounts: Array<Partial<AccountDocument>>,
  ): Promise<void> {
    try {
      const client = await this.ensureClient()

      const operations: any[] = []

      for (const account of accounts) {
        if (!account.id || !account.tenant_id) {
          logger.warn('Skipping account without id or tenant_id', { account })
          continue
        }

        const documentId = `${account.tenant_id}:${account.id}`
        const fullText = this.buildSearchText(
          account.name,
          account.website,
          account.industry,
          account.description,
        )

        const document: AccountDocument = {
          id: account.id,
          tenant_id: account.tenant_id,
          name: account.name || '',
          website: account.website,
          industry: account.industry,
          description: account.description,
          full_text: fullText,
          created_at: account.created_at || new Date(),
          updated_at: account.updated_at || new Date(),
        }

        operations.push({ index: { _index: 'accounts', _id: documentId } })
        operations.push(document)
      }

      if (operations.length > 0) {
        const response = await client.bulk({
          operations,
          refresh: 'wait_for',
        })

        if (response.errors) {
          logger.warn('Some accounts failed to sync in bulk operation', {
            errors: response.items
              .filter((item: any) => item.index?.error)
              .map((item: any) => item.index?.error),
          })
        }

        logger.info('Bulk account sync completed', {
          count: accounts.length,
          errors: response.errors ? 'yes' : 'no',
        })
      }
    } catch (error) {
      logger.error('Failed to bulk sync accounts to Elasticsearch', { error })
      throw error
    }
  }

  /**
   * Bulk sync multiple deals
   * More efficient than individual syncs for batch operations
   */
  public async syncDealsBulk(
    deals: Array<Partial<DealDocument>>,
  ): Promise<void> {
    try {
      const client = await this.ensureClient()

      const operations: any[] = []

      for (const deal of deals) {
        if (!deal.id || !deal.tenant_id) {
          logger.warn('Skipping deal without id or tenant_id', { deal })
          continue
        }

        const documentId = `${deal.tenant_id}:${deal.id}`
        const fullText = this.buildSearchText(
          deal.name,
          deal.account_name,
          deal.contact_name,
          deal.stage,
          deal.amount ? `$${deal.amount}` : undefined,
        )

        const document: DealDocument = {
          id: deal.id,
          tenant_id: deal.tenant_id,
          name: deal.name || '',
          account_name: deal.account_name || '',
          contact_name: deal.contact_name || '',
          stage: deal.stage || '',
          amount: deal.amount,
          full_text: fullText,
          created_at: deal.created_at || new Date(),
          updated_at: deal.updated_at || new Date(),
        }

        operations.push({ index: { _index: 'deals', _id: documentId } })
        operations.push(document)
      }

      if (operations.length > 0) {
        const response = await client.bulk({
          operations,
          refresh: 'wait_for',
        })

        if (response.errors) {
          logger.warn('Some deals failed to sync in bulk operation', {
            errors: response.items
              .filter((item: any) => item.index?.error)
              .map((item: any) => item.index?.error),
          })
        }

        logger.info('Bulk deal sync completed', {
          count: deals.length,
          errors: response.errors ? 'yes' : 'no',
        })
      }
    } catch (error) {
      logger.error('Failed to bulk sync deals to Elasticsearch', { error })
      throw error
    }
  }

  /**
   * Delete index for a specific document type
   * Useful for re-indexing or cleanup
   */
  public async deleteIndex(indexName: string): Promise<void> {
    try {
      const client = await this.ensureClient()

      await client.indices.delete({ index: indexName })
      logger.info('Elasticsearch index deleted', { indexName })
    } catch (error) {
      logger.error('Failed to delete Elasticsearch index', {
        indexName,
        error,
      })
      throw error
    }
  }

  /**
   * Get index statistics
   * Returns document count and other index information
   */
  public async getIndexStats(indexName: string): Promise<any> {
    try {
      const client = await this.ensureClient()

      const stats = await client.indices.stats({ index: indexName })
      return stats
    } catch (error) {
      logger.error('Failed to get Elasticsearch index stats', {
        indexName,
        error,
      })
      throw error
    }
  }
}

// Export singleton instance
export const elasticsearchSyncService = new ElasticsearchSyncService()

export default elasticsearchSyncService
