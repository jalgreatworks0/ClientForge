/**
 * Deal API Service
 * Handles all deal-related API calls
 */

import api from '../lib/api'

export interface Deal {
  id: string
  tenantId: string
  ownerId: string
  accountId?: string | null
  contactId?: string | null
  pipelineId: string
  stageId: string
  name: string
  amount?: number
  currency: string
  probability: number
  expectedCloseDate?: string | null
  actualCloseDate?: string | null
  leadSource?: string | null
  nextStep?: string | null
  description?: string | null
  tags?: string[]
  isClosed: boolean
  isWon?: boolean
  lostReason?: string | null
  competitors?: string[]
  decisionMakers?: string[]
  keyContacts?: string[]
  weightedAmount?: number
  daysInStage: number
  lastStageChangeAt?: string | null
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export interface DealStage {
  id: string
  tenantId: string
  pipelineId: string
  name: string
  displayOrder: number
  probability: number
  isClosedStage: boolean
  isWonStage: boolean
  color?: string
  createdAt: string
  updatedAt: string
}

export interface Pipeline {
  id: string
  tenantId: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  stages?: DealStage[]
  createdAt: string
  updatedAt: string
}

export interface DealFilters {
  search?: string
  ownerId?: string
  accountId?: string
  contactId?: string
  pipelineId?: string
  stageId?: string
  amountMin?: number
  amountMax?: number
  probabilityMin?: number
  probabilityMax?: number
  tags?: string[]
  isClosed?: boolean
  isWon?: boolean
  leadSource?: string
  expectedCloseDateFrom?: string
  expectedCloseDateTo?: string
  createdAfter?: string
  createdBefore?: string
}

export interface DealListOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: DealFilters
}

export interface DealListResponse {
  success: boolean
  data: Deal[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface CreateDealInput {
  ownerId?: string
  accountId?: string | null
  contactId?: string | null
  pipelineId: string
  stageId: string
  name: string
  amount?: number
  currency?: string
  probability?: number
  expectedCloseDate?: string | null
  leadSource?: string | null
  nextStep?: string | null
  description?: string | null
  tags?: string[]
  competitors?: string[]
  decisionMakers?: string[]
  keyContacts?: string[]
}

export interface UpdateDealInput extends Partial<CreateDealInput> {
  isClosed?: boolean
  isWon?: boolean
  lostReason?: string | null
}

export interface BulkDealOperation {
  operation: 'delete' | 'update' | 'assign' | 'add_tags' | 'remove_tags' | 'change_stage' | 'close_won' | 'close_lost'
  dealIds: string[]
  data?: {
    ownerId?: string
    stageId?: string
    tags?: string[]
    lostReason?: string
    notes?: string
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

export interface DealStatistics {
  totalDeals: number
  openDeals: number
  closedDeals: number
  wonDeals: number
  lostDeals: number
  totalValue: number
  wonValue: number
  lostValue: number
  weightedPipelineValue: number
  averageDealSize: number
  winRate: number
  averageSalesCycle: number
}

class DealService {
  /**
   * List deals with pagination and filters
   */
  async listDeals(options: DealListOptions = {}): Promise<DealListResponse> {
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
      if (filters.contactId) params.append('contactId', filters.contactId)
      if (filters.pipelineId) params.append('pipelineId', filters.pipelineId)
      if (filters.stageId) params.append('stageId', filters.stageId)
      if (filters.amountMin !== undefined) params.append('amountMin', filters.amountMin.toString())
      if (filters.amountMax !== undefined) params.append('amountMax', filters.amountMax.toString())
      if (filters.probabilityMin !== undefined) params.append('probabilityMin', filters.probabilityMin.toString())
      if (filters.probabilityMax !== undefined) params.append('probabilityMax', filters.probabilityMax.toString())
      if (filters.tags) {
        filters.tags.forEach((tag) => params.append('tags', tag))
      }
      if (filters.isClosed !== undefined) params.append('isClosed', filters.isClosed.toString())
      if (filters.isWon !== undefined) params.append('isWon', filters.isWon.toString())
      if (filters.leadSource) params.append('leadSource', filters.leadSource)
      if (filters.expectedCloseDateFrom) params.append('expectedCloseDateFrom', filters.expectedCloseDateFrom)
      if (filters.expectedCloseDateTo) params.append('expectedCloseDateTo', filters.expectedCloseDateTo)
      if (filters.createdAfter) params.append('createdAfter', filters.createdAfter)
      if (filters.createdBefore) params.append('createdBefore', filters.createdBefore)
    }

    const response = await api.get<DealListResponse>(`/v1/deals?${params.toString()}`)
    return response.data
  }

  /**
   * Get deal by ID
   */
  async getDealById(id: string, includeRelations: boolean = false): Promise<Deal> {
    const params = includeRelations ? '?include=relations' : ''
    const response = await api.get<{ success: boolean; data: Deal }>(`/v1/deals/${id}${params}`)
    return response.data.data
  }

  /**
   * Create a new deal
   */
  async createDeal(data: CreateDealInput): Promise<Deal> {
    const response = await api.post<{ success: boolean; data: Deal; message: string }>('/v1/deals', data)
    return response.data.data
  }

  /**
   * Update deal
   */
  async updateDeal(id: string, data: UpdateDealInput): Promise<Deal> {
    const response = await api.put<{ success: boolean; data: Deal; message: string }>(`/v1/deals/${id}`, data)
    return response.data.data
  }

  /**
   * Delete deal
   */
  async deleteDeal(id: string): Promise<void> {
    await api.delete(`/v1/deals/${id}`)
  }

  /**
   * Search deals
   */
  async searchDeals(query: string, limit: number = 20): Promise<Deal[]> {
    const response = await api.get<{ success: boolean; data: Deal[]; count: number }>(
      `/v1/deals/search?q=${encodeURIComponent(query)}&limit=${limit}`
    )
    return response.data.data
  }

  /**
   * Bulk operations on deals
   */
  async bulkOperation(operation: BulkDealOperation): Promise<BulkOperationResult> {
    const response = await api.post<BulkOperationResult>('/v1/deals/bulk', operation)
    return response.data
  }

  /**
   * Change deal stage
   */
  async changeDealStage(id: string, toStageId: string, notes?: string): Promise<Deal> {
    const response = await api.post<{ success: boolean; data: Deal }>(`/v1/deals/${id}/change-stage`, {
      toStageId,
      notes,
    })
    return response.data.data
  }

  /**
   * Close deal (won or lost)
   */
  async closeDeal(
    id: string,
    isWon: boolean,
    lostReason?: string,
    actualCloseDate?: string
  ): Promise<Deal> {
    const response = await api.post<{ success: boolean; data: Deal }>(`/v1/deals/${id}/close`, {
      isWon,
      lostReason,
      actualCloseDate,
    })
    return response.data.data
  }

  /**
   * Get deal statistics
   */
  async getStatistics(): Promise<DealStatistics> {
    const response = await api.get<{ success: boolean; data: DealStatistics }>('/v1/deals/statistics')
    return response.data.data
  }

  /**
   * Get deal stage history
   */
  async getDealHistory(id: string): Promise<any> {
    const response = await api.get<{ success: boolean; data: any }>(`/v1/deals/${id}/history`)
    return response.data.data
  }

  /**
   * Export deals
   */
  async exportDeals(format: 'csv' | 'xlsx' = 'csv'): Promise<Blob> {
    const response = await api.post(`/v1/deals/export`, { format }, { responseType: 'blob' })
    return response.data
  }

  /**
   * Import deals
   */
  async importDeals(file: File): Promise<{
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

    const response = await api.post('/v1/deals/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
    return response.data
  }

  /**
   * List pipelines
   */
  async listPipelines(): Promise<Pipeline[]> {
    const response = await api.get<{ success: boolean; data: Pipeline[] }>('/v1/pipelines')
    return response.data.data
  }

  /**
   * Get pipeline with stages
   */
  async getPipelineWithStages(pipelineId: string): Promise<Pipeline> {
    const response = await api.get<{ success: boolean; data: Pipeline }>(`/v1/pipelines/${pipelineId}?include=stages`)
    return response.data.data
  }

  /**
   * List stages for a pipeline
   */
  async listStages(pipelineId?: string): Promise<DealStage[]> {
    const url = pipelineId ? `/v1/deal-stages?pipelineId=${pipelineId}` : '/v1/deal-stages'
    const response = await api.get<{ success: boolean; data: DealStage[] }>(url)
    return response.data.data
  }
}

export const dealService = new DealService()
