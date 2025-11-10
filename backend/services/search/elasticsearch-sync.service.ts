/**
 * Elasticsearch Sync Service
 * Real-time synchronization of database changes to Elasticsearch
 */

import { queueService } from '../queue/queue.service'
import { logger } from '../../utils/logging/logger'

interface SyncDocument {
  id: string
  tenantId: string
  [key: string]: any
}

class ElasticsearchSyncService {
  /**
   * Index a new document
   */
  async indexDocument(index: string, document: SyncDocument): Promise<void> {
    try {
      logger.info('Indexing document to Elasticsearch', {
        index,
        id: document.id,
        tenantId: document.tenantId,
      })

      await queueService.addSearchIndexJob({
        action: 'index',
        index,
        id: document.id,
        document,
        tenantId: document.tenantId,
      })

      logger.debug('Document queued for indexing', { index, id: document.id })
    } catch (error) {
      logger.error('Failed to queue document for indexing', {
        error,
        index,
        id: document.id,
      })
      throw error
    }
  }

  /**
   * Update an existing document
   */
  async updateDocument(index: string, document: SyncDocument): Promise<void> {
    try {
      logger.info('Updating document in Elasticsearch', {
        index,
        id: document.id,
        tenantId: document.tenantId,
      })

      await queueService.addSearchIndexJob({
        action: 'update',
        index,
        id: document.id,
        document,
        tenantId: document.tenantId,
      })

      logger.debug('Document queued for update', { index, id: document.id })
    } catch (error) {
      logger.error('Failed to queue document for update', {
        error,
        index,
        id: document.id,
      })
      throw error
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(index: string, id: string, tenantId: string): Promise<void> {
    try {
      logger.info('Deleting document from Elasticsearch', {
        index,
        id,
        tenantId,
      })

      await queueService.addSearchIndexJob({
        action: 'delete',
        index,
        id,
        tenantId,
      })

      logger.debug('Document queued for deletion', { index, id })
    } catch (error) {
      logger.error('Failed to queue document for deletion', {
        error,
        index,
        id,
      })
      throw error
    }
  }

  /**
   * Sync contact to Elasticsearch
   */
  async syncContact(action: 'index' | 'update' | 'delete', contact: any): Promise<void> {
    const index = 'contacts'

    if (action === 'delete') {
      await this.deleteDocument(index, contact.contact_id, contact.tenant_id)
      return
    }

    const document: SyncDocument = {
      id: contact.contact_id,
      tenantId: contact.tenant_id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      fullName: `${contact.first_name} ${contact.last_name}`,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      department: contact.department,
      accountId: contact.account_id,
      ownerId: contact.owner_id,
      status: contact.status,
      leadSource: contact.lead_source,
      tags: contact.tags || [],
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    }

    if (action === 'index') {
      await this.indexDocument(index, document)
    } else {
      await this.updateDocument(index, document)
    }
  }

  /**
   * Sync account to Elasticsearch
   */
  async syncAccount(action: 'index' | 'update' | 'delete', account: any): Promise<void> {
    const index = 'accounts'

    if (action === 'delete') {
      await this.deleteDocument(index, account.account_id, account.tenant_id)
      return
    }

    const document: SyncDocument = {
      id: account.account_id,
      tenantId: account.tenant_id,
      name: account.name,
      website: account.website,
      industry: account.industry,
      employees: account.employees,
      revenue: account.revenue,
      phone: account.phone,
      billingAddress: account.billing_address,
      shippingAddress: account.shipping_address,
      ownerId: account.owner_id,
      status: account.status,
      tags: account.tags || [],
      createdAt: account.created_at,
      updatedAt: account.updated_at,
    }

    if (action === 'index') {
      await this.indexDocument(index, document)
    } else {
      await this.updateDocument(index, document)
    }
  }

  /**
   * Sync deal to Elasticsearch
   */
  async syncDeal(action: 'index' | 'update' | 'delete', deal: any): Promise<void> {
    const index = 'deals'

    if (action === 'delete') {
      await this.deleteDocument(index, deal.deal_id, deal.tenant_id)
      return
    }

    const document: SyncDocument = {
      id: deal.deal_id,
      tenantId: deal.tenant_id,
      name: deal.name,
      amount: deal.amount,
      stage: deal.stage,
      probability: deal.probability,
      expectedCloseDate: deal.expected_close_date,
      actualCloseDate: deal.actual_close_date,
      accountId: deal.account_id,
      contactId: deal.contact_id,
      ownerId: deal.owner_id,
      status: deal.status,
      lostReason: deal.lost_reason,
      tags: deal.tags || [],
      createdAt: deal.created_at,
      updatedAt: deal.updated_at,
    }

    if (action === 'index') {
      await this.indexDocument(index, document)
    } else {
      await this.updateDocument(index, document)
    }
  }

  /**
   * Bulk sync documents
   */
  async bulkSync(index: string, documents: SyncDocument[]): Promise<void> {
    try {
      logger.info('Bulk syncing documents to Elasticsearch', {
        index,
        count: documents.length,
      })

      const promises = documents.map((doc) => this.indexDocument(index, doc))

      await Promise.all(promises)

      logger.info('Bulk sync completed', { index, count: documents.length })
    } catch (error) {
      logger.error('Bulk sync failed', { error, index, count: documents.length })
      throw error
    }
  }

  /**
   * Reindex all contacts for a tenant
   */
  async reindexContacts(tenantId: string, contacts: any[]): Promise<void> {
    const documents = contacts.map((contact) => ({
      id: contact.contact_id,
      tenantId: contact.tenant_id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      fullName: `${contact.first_name} ${contact.last_name}`,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      department: contact.department,
      accountId: contact.account_id,
      ownerId: contact.owner_id,
      status: contact.status,
      leadSource: contact.lead_source,
      tags: contact.tags || [],
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    }))

    await this.bulkSync('contacts', documents)
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; message: string }> {
    try {
      // TODO: Implement actual Elasticsearch health check
      // For now, just return success
      return {
        status: 'healthy',
        message: 'Elasticsearch sync service is operational',
      }
    } catch (error) {
      logger.error('Elasticsearch health check failed', { error })
      return {
        status: 'unhealthy',
        message: 'Elasticsearch sync service is not operational',
      }
    }
  }
}

// Singleton instance
export const elasticsearchSyncService = new ElasticsearchSyncService()
