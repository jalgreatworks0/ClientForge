/**
 * Contact Service
 * Business logic for contacts management
 */

import { logger } from '../../utils/logging/logger'
import { AppError, NotFoundError, ValidationError } from '../../utils/errors/app-error'
import { elasticsearchSyncService } from '../../services/search/elasticsearch-sync.service'

import {
  Contact,
  ContactFilters,
  ContactListOptions,
  ContactListResponse,
  CreateContactInput,
  UpdateContactInput,
  BulkContactOperation,
  ContactWithRelations,
  ContactStatistics,
} from './contact-types'
import { contactRepository } from './contact-repository'

export class ContactService {
  /**
   * Create a new contact
   */
  async createContact(
    tenantId: string,
    userId: string,
    data: CreateContactInput
  ): Promise<Contact> {
    try {
      // Check for duplicate email if provided
      if (data.email) {
        const existing = await contactRepository.findByEmail(data.email, tenantId)
        if (existing.length > 0) {
          logger.warn('Attempted to create contact with duplicate email', {
            email: data.email,
            tenantId,
          })
          throw new ValidationError('A contact with this email already exists')
        }
      }

      // Default ownerId to authenticated user if not provided
      const contactData = {
        ...data,
        ownerId: data.ownerId || userId,
      }

      // Create contact
      const contact = await contactRepository.create(tenantId, contactData)

      // Sync to Elasticsearch for search
      try {
        await elasticsearchSyncService.syncContact('index', {
          contact_id: contact.id,
          tenantId: tenantId,
          first_name: contact.firstName,
          last_name: contact.lastName,
          email: contact.email || '',
          phone: contact.phone,
          title: contact.title,
          department: contact.department,
          account_id: contact.accountId,
          owner_id: contact.ownerId,
          status: contact.leadStatus,
          lead_source: contact.leadSource,
          tags: contact.tags || [],
          created_at: contact.createdAt,
          updated_at: contact.updatedAt,
        })
      } catch (error) {
        logger.warn('[Elasticsearch] Failed to sync new contact', {
          contactId: contact.id,
          error,
        })
        // Don't fail the request if search sync fails
      }

      logger.info('Contact created successfully', {
        contactId: contact.id,
        tenantId,
        createdBy: userId,
      })

      return contact
    } catch (error) {
      logger.error('Failed to create contact', { error, tenantId, userId })
      throw error
    }
  }

  /**
   * Get contact by ID
   */
  async getContactById(
    id: string,
    tenantId: string,
    includeRelations: boolean = false
  ): Promise<Contact | ContactWithRelations> {
    const contact = includeRelations
      ? await contactRepository.findByIdWithRelations(id, tenantId)
      : await contactRepository.findById(id, tenantId)

    if (!contact) {
      throw new NotFoundError('Contact')
    }

    return contact
  }

  /**
   * List contacts with pagination and filters
   */
  async listContacts(
    tenantId: string,
    options: ContactListOptions
  ): Promise<ContactListResponse> {
    try {
      return await contactRepository.list(tenantId, options)
    } catch (error) {
      logger.error('Failed to list contacts', { error, tenantId })
      throw new AppError('Failed to retrieve contacts', 500)
    }
  }

  /**
   * Update contact
   */
  async updateContact(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateContactInput
  ): Promise<Contact> {
    // Verify contact exists
    await this.getContactById(id, tenantId)

    // Check for duplicate email if being updated
    if (data.email) {
      const existing = await contactRepository.findByEmail(data.email, tenantId)
      const hasDuplicate = existing.some((c) => c.id !== id)
      if (hasDuplicate) {
        throw new ValidationError('A contact with this email already exists')
      }
    }

    const updatedContact = await contactRepository.update(id, tenantId, data)

    if (!updatedContact) {
      throw new NotFoundError('Contact')
    }

    // Sync to Elasticsearch for search
    try {
      await elasticsearchSyncService.syncContact('update', {
        contact_id: updatedContact.id,
        tenantId: tenantId,
        first_name: updatedContact.firstName,
        last_name: updatedContact.lastName,
        email: updatedContact.email || '',
        phone: updatedContact.phone,
        title: updatedContact.title,
        department: updatedContact.department,
        account_id: updatedContact.accountId,
        owner_id: updatedContact.ownerId,
        status: updatedContact.leadStatus,
        lead_source: updatedContact.leadSource,
        tags: updatedContact.tags || [],
        created_at: updatedContact.createdAt,
        updated_at: updatedContact.updatedAt,
      })
    } catch (error) {
      logger.warn('[Elasticsearch] Failed to sync updated contact', {
        contactId: id,
        error,
      })
      // Don't fail the request if search sync fails
    }

    logger.info('Contact updated successfully', {
      contactId: id,
      tenantId,
      updatedBy: userId,
    })

    return updatedContact
  }

  /**
   * Delete contact (soft delete)
   */
  async deleteContact(id: string, tenantId: string, userId: string): Promise<void> {
    // Verify contact exists
    await this.getContactById(id, tenantId)

    const deleted = await contactRepository.delete(id, tenantId)

    if (!deleted) {
      throw new NotFoundError('Contact')
    }

    // Remove from Elasticsearch search index
    try {
      await elasticsearchSyncService.syncContact('delete', {
        contact_id: id,
        tenantId: tenantId,
      })
    } catch (error) {
      logger.warn('[Elasticsearch] Failed to delete contact from search index', {
        contactId: id,
        error,
      })
      // Don't fail the request if search sync fails
    }

    logger.info('Contact deleted successfully', {
      contactId: id,
      tenantId,
      deletedBy: userId,
    })
  }

  /**
   * Search contacts
   */
  async searchContacts(
    tenantId: string,
    query: string,
    limit: number = 20
  ): Promise<Contact[]> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query is required')
    }

    return await contactRepository.search(tenantId, query.trim(), limit)
  }

  /**
   * Bulk operations on contacts
   */
  async bulkOperation(
    tenantId: string,
    userId: string,
    operation: BulkContactOperation
  ): Promise<{ success: number; failed: number }> {
    const { contactIds, operation: operationType, data } = operation

    logger.info('Bulk operation started', {
      operation: operationType,
      contactCount: contactIds.length,
      tenantId,
      userId,
    })

    try {
      switch (operationType) {
        case 'delete':
          const deleted = await contactRepository.bulkDelete(contactIds, tenantId)
          return { success: deleted, failed: contactIds.length - deleted }

        case 'update':
          return await this.bulkUpdate(contactIds, tenantId, userId, data || {})

        case 'assign':
          if (!data?.ownerId) {
            throw new ValidationError('ownerId is required for assign operation')
          }
          return await this.bulkUpdate(contactIds, tenantId, userId, {
            ownerId: data.ownerId,
          })

        case 'add_tags':
          if (!data?.tags || !Array.isArray(data.tags)) {
            throw new ValidationError('tags array is required for add_tags operation')
          }
          return await this.bulkAddTags(contactIds, tenantId, data.tags)

        case 'remove_tags':
          if (!data?.tags || !Array.isArray(data.tags)) {
            throw new ValidationError('tags array is required for remove_tags operation')
          }
          return await this.bulkRemoveTags(contactIds, tenantId, data.tags)

        default:
          throw new ValidationError(`Unknown operation: ${operationType}`)
      }
    } catch (error) {
      logger.error('Bulk operation failed', {
        error,
        operation: operationType,
        tenantId,
        userId,
      })
      throw error
    }
  }

  /**
   * Update last contacted timestamp
   */
  async markAsContacted(id: string, tenantId: string): Promise<void> {
    // Verify contact exists
    await this.getContactById(id, tenantId)

    await contactRepository.updateLastContacted(id, tenantId)

    logger.info('Contact marked as contacted', { contactId: id, tenantId })
  }

  /**
   * Get contact statistics
   */
  async getStatistics(tenantId: string): Promise<ContactStatistics> {
    // This would be implemented with more complex queries
    // For now, returning placeholder structure
    const totalContacts = await contactRepository.getCountByTenant(tenantId)

    return {
      totalContacts,
      activeContacts: 0,
      byLeadStatus: {} as any,
      byLifecycleStage: {} as any,
      averageLeadScore: 0,
      contactedLast30Days: 0,
      newContactsThisMonth: 0,
      conversionRate: 0,
    }
  }

  /**
   * Calculate lead score (placeholder for ML integration)
   */
  async calculateLeadScore(id: string, tenantId: string): Promise<number> {
    const contact = await this.getContactById(id, tenantId) as Contact

    // Simple scoring algorithm (to be replaced with ML model)
    let score = 0

    // Email provided: +20 points
    if (contact.email) score += 20

    // Phone provided: +15 points
    if (contact.phone || contact.mobile) score += 15

    // Title provided: +10 points
    if (contact.title) score += 10

    // Company associated: +20 points
    if (contact.accountId) score += 20

    // Recently contacted: +15 points
    if (contact.lastContactedAt) {
      const daysSinceContact =
        (Date.now() - new Date(contact.lastContactedAt).getTime()) /
        (1000 * 60 * 60 * 24)
      if (daysSinceContact < 30) score += 15
    }

    // LinkedIn profile: +10 points
    if (contact.socialLinkedin) score += 10

    // Lifecycle stage bonus
    const stageBonus: Record<string, number> = {
      lead: 0,
      mql: 10,
      sql: 20,
      opportunity: 30,
      customer: 50,
    }
    score += stageBonus[contact.lifecycleStage] || 0

    // Cap at 100
    score = Math.min(100, score)

    // Update contact with new score
    await contactRepository.update(id, tenantId, { leadScore: score })

    logger.debug('Lead score calculated', { contactId: id, score })

    return score
  }

  // Private helper methods

  private async bulkUpdate(
    ids: string[],
    tenantId: string,
    userId: string,
    data: UpdateContactInput
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const id of ids) {
      try {
        await this.updateContact(id, tenantId, userId, data)
        success++
      } catch (error) {
        logger.warn('Failed to update contact in bulk operation', {
          contactId: id,
          error,
        })
        failed++
      }
    }

    return { success, failed }
  }

  private async bulkAddTags(
    ids: string[],
    tenantId: string,
    tagsToAdd: string[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const id of ids) {
      try {
        const contact = await contactRepository.findById(id, tenantId)
        if (contact) {
          const existingTags = contact.tags || []
          const newTags = Array.from(new Set([...existingTags, ...tagsToAdd]))
          await contactRepository.update(id, tenantId, { tags: newTags })
          success++
        } else {
          failed++
        }
      } catch (error) {
        logger.warn('Failed to add tags to contact', { contactId: id, error })
        failed++
      }
    }

    return { success, failed }
  }

  private async bulkRemoveTags(
    ids: string[],
    tenantId: string,
    tagsToRemove: string[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0
    let failed = 0

    for (const id of ids) {
      try {
        const contact = await contactRepository.findById(id, tenantId)
        if (contact) {
          const existingTags = contact.tags || []
          const newTags = existingTags.filter((tag) => !tagsToRemove.includes(tag))
          await contactRepository.update(id, tenantId, { tags: newTags })
          success++
        } else {
          failed++
        }
      } catch (error) {
        logger.warn('Failed to remove tags from contact', { contactId: id, error })
        failed++
      }
    }

    return { success, failed }
  }
}

// Export singleton instance
export const contactService = new ContactService()
