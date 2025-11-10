/**
 * Contact API Service
 * Handles all contact-related API calls
 */

import api from '../lib/api'

export interface Contact {
  id: string
  tenantId: string
  ownerId: string
  accountId?: string | null
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  title?: string | null
  department?: string | null
  leadSource?: string | null
  leadStatus?: string
  lifecycleStage?: string
  leadScore?: number
  tags?: string[]
  addressStreet?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressPostalCode?: string | null
  addressCountry?: string | null
  socialLinkedin?: string | null
  socialTwitter?: string | null
  socialFacebook?: string | null
  notes?: string | null
  isActive?: boolean
  lastContactedAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface ContactFilters {
  search?: string
  ownerId?: string
  accountId?: string
  leadStatus?: string | string[]
  lifecycleStage?: string | string[]
  leadScoreMin?: number
  leadScoreMax?: number
  tags?: string[]
  isActive?: boolean
  createdAfter?: string
  createdBefore?: string
}

export interface ContactListOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: ContactFilters
}

export interface ContactListResponse {
  success: boolean
  data: Contact[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateContactInput {
  firstName: string
  lastName: string
  email?: string | null
  phone?: string | null
  mobile?: string | null
  title?: string | null
  department?: string | null
  accountId?: string | null
  ownerId?: string
  leadSource?: string | null
  leadStatus?: string
  lifecycleStage?: string
  tags?: string[]
  notes?: string | null
  addressStreet?: string | null
  addressCity?: string | null
  addressState?: string | null
  addressPostalCode?: string | null
  addressCountry?: string | null
  socialLinkedin?: string | null
  socialTwitter?: string | null
  socialFacebook?: string | null
}

export interface UpdateContactInput extends Partial<CreateContactInput> {}

export interface BulkContactOperation {
  operation: 'delete' | 'update' | 'assign' | 'add_tags' | 'remove_tags'
  contactIds: string[]
  data?: {
    ownerId?: string
    tags?: string[]
    [key: string]: any
  }
}

export interface BulkOperationResult {
  success: boolean
  data: {
    success: number
    failed: number
  }
  message: string
}

class ContactService {
  /**
   * List contacts with pagination and filters
   */
  async listContacts(options: ContactListOptions = {}): Promise<ContactListResponse> {
    const params = new URLSearchParams()

    if (options.page) params.append('page', options.page.toString())
    if (options.limit) params.append('limit', options.limit.toString())
    if (options.sortBy) params.append('sortBy', options.sortBy)
    if (options.sortOrder) params.append('sortOrder', options.sortOrder)

    // Add filters
    if (options.filters) {
      const { filters } = options
      if (filters.search) params.append('search', filters.search)
      if (filters.ownerId) params.append('ownerId', filters.ownerId)
      if (filters.accountId) params.append('accountId', filters.accountId)
      if (filters.leadStatus) {
        const statuses = Array.isArray(filters.leadStatus)
          ? filters.leadStatus
          : [filters.leadStatus]
        statuses.forEach((status) => params.append('leadStatus', status))
      }
      if (filters.lifecycleStage) {
        const stages = Array.isArray(filters.lifecycleStage)
          ? filters.lifecycleStage
          : [filters.lifecycleStage]
        stages.forEach((stage) => params.append('lifecycleStage', stage))
      }
      if (filters.leadScoreMin !== undefined)
        params.append('leadScoreMin', filters.leadScoreMin.toString())
      if (filters.leadScoreMax !== undefined)
        params.append('leadScoreMax', filters.leadScoreMax.toString())
      if (filters.tags) {
        filters.tags.forEach((tag) => params.append('tags', tag))
      }
      if (filters.isActive !== undefined)
        params.append('isActive', filters.isActive.toString())
      if (filters.createdAfter) params.append('createdAfter', filters.createdAfter)
      if (filters.createdBefore) params.append('createdBefore', filters.createdBefore)
    }

    const response = await api.get<ContactListResponse>(`/v1/contacts?${params.toString()}`)
    return response.data
  }

  /**
   * Get contact by ID
   */
  async getContactById(id: string, includeRelations: boolean = false): Promise<Contact> {
    const params = includeRelations ? '?include=relations' : ''
    const response = await api.get<{ success: boolean; data: Contact }>(
      `/v1/contacts/${id}${params}`
    )
    return response.data.data
  }

  /**
   * Create a new contact
   */
  async createContact(data: CreateContactInput): Promise<Contact> {
    const response = await api.post<{ success: boolean; data: Contact; message: string }>(
      '/v1/contacts',
      data
    )
    return response.data.data
  }

  /**
   * Update contact
   */
  async updateContact(id: string, data: UpdateContactInput): Promise<Contact> {
    const response = await api.put<{ success: boolean; data: Contact; message: string }>(
      `/v1/contacts/${id}`,
      data
    )
    return response.data.data
  }

  /**
   * Delete contact
   */
  async deleteContact(id: string): Promise<void> {
    await api.delete(`/v1/contacts/${id}`)
  }

  /**
   * Search contacts
   */
  async searchContacts(query: string, limit: number = 20): Promise<Contact[]> {
    const response = await api.get<{ success: boolean; data: Contact[]; count: number }>(
      `/v1/contacts/search?q=${encodeURIComponent(query)}&limit=${limit}`
    )
    return response.data.data
  }

  /**
   * Bulk operations on contacts
   */
  async bulkOperation(operation: BulkContactOperation): Promise<BulkOperationResult> {
    const response = await api.post<BulkOperationResult>('/v1/contacts/bulk', operation)
    return response.data
  }

  /**
   * Mark contact as contacted
   */
  async markAsContacted(id: string): Promise<void> {
    await api.post(`/v1/contacts/${id}/contacted`)
  }

  /**
   * Calculate lead score
   */
  async calculateLeadScore(id: string): Promise<number> {
    const response = await api.post<{ success: boolean; data: { leadScore: number } }>(
      `/v1/contacts/${id}/calculate-score`
    )
    return response.data.data.leadScore
  }

  /**
   * Get contact statistics
   */
  async getStatistics(): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>('/v1/contacts/statistics')
    return response.data.data
  }

  /**
   * Export contacts
   */
  async exportContacts(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await api.get(
      `/v1/contacts/export?format=${format}`,
      { responseType: 'blob' }
    )
    return response.data
  }

  /**
   * Import contacts
   */
  async importContacts(file: File): Promise<{
    success: boolean
    data: {
      total: number
      successCount: number
      failedCount: number
      errors: any[]
    }
    message: string
  }> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await api.post('/v1/contacts/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }
}

export const contactService = new ContactService()
