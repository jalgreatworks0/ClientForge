/**
 * Deal Types and Interfaces
 * TypeScript type definitions for deals/opportunities module
 */

export interface Deal {
  id: string
  tenantId: string
  ownerId: string
  accountId?: string
  contactId?: string
  pipelineId: string
  stageId: string
  name: string
  amount?: number
  currency: string
  probability: number
  expectedCloseDate?: Date
  actualCloseDate?: Date
  leadSource?: string
  nextStep?: string
  description?: string
  tags?: string[]
  isClosed: boolean
  isWon?: boolean
  lostReason?: string
  competitors?: string[]
  decisionMakers?: string[]
  keyContacts?: string[]
  weightedAmount?: number
  daysInStage: number
  lastStageChangeAt?: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface Pipeline {
  id: string
  tenantId: string
  name: string
  description?: string
  isDefault: boolean
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
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
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

export interface DealStageHistory {
  id: string
  tenantId: string
  dealId: string
  fromStageId?: string
  toStageId: string
  changedBy: string
  durationDays?: number
  notes?: string
  createdAt: Date
}

export interface DealProduct {
  id: string
  tenantId: string
  dealId: string
  productName: string
  description?: string
  quantity: number
  unitPrice: number
  discount: number
  totalPrice: number
  createdAt: Date
  updatedAt: Date
}

export interface CreateDealInput {
  ownerId?: string // Optional - will default to authenticated user if not provided
  accountId?: string
  contactId?: string
  pipelineId: string
  stageId: string
  name: string
  amount?: number
  currency?: string
  probability?: number
  expectedCloseDate?: Date
  leadSource?: string
  nextStep?: string
  description?: string
  tags?: string[]
  competitors?: string[]
  decisionMakers?: string[]
  keyContacts?: string[]
}

export interface UpdateDealInput {
  ownerId?: string
  accountId?: string
  contactId?: string
  pipelineId?: string
  stageId?: string
  name?: string
  amount?: number
  currency?: string
  probability?: number
  expectedCloseDate?: Date
  actualCloseDate?: Date
  leadSource?: string
  nextStep?: string
  description?: string
  tags?: string[]
  isClosed?: boolean
  isWon?: boolean
  lostReason?: string
  competitors?: string[]
  decisionMakers?: string[]
  keyContacts?: string[]
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
  expectedCloseDateFrom?: Date
  expectedCloseDateTo?: Date
  createdAfter?: Date
  createdBefore?: Date
}

export interface DealListOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  filters?: DealFilters
}

export interface DealListResponse {
  deals: Deal[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface BulkDealOperation {
  dealIds?: string[] // Optional - will be validated at runtime
  operation: 'update' | 'delete' | 'assign' | 'add_tags' | 'remove_tags' | 'change_stage' | 'close_won' | 'close_lost'
  data?: Record<string, any>
}

// Full deal with related data
export interface DealWithRelations extends Deal {
  owner?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  account?: {
    id: string
    name: string
    industry?: string
  }
  contact?: {
    id: string
    firstName: string
    lastName: string
    email?: string
  }
  pipeline?: Pipeline
  stage?: DealStage
  products?: DealProduct[]
  stageHistory?: DealStageHistory[]
  customFields?: Array<{
    fieldId: string
    fieldName: string
    fieldLabel: string
    value: any
  }>
}

// Pipeline with stages
export interface PipelineWithStages extends Pipeline {
  stages: DealStage[]
  dealCount?: number
  totalValue?: number
}

// Deal forecast/statistics
export interface DealForecast {
  period: string // 'month', 'quarter', 'year'
  totalDeals: number
  totalValue: number
  weightedValue: number
  wonDeals: number
  wonValue: number
  lostDeals: number
  lostValue: number
  averageDealSize: number
  averageWinRate: number
  averageSalesCycle: number // days
  byStage: Array<{
    stageId: string
    stageName: string
    dealCount: number
    totalValue: number
    weightedValue: number
  }>
}

// Deal statistics
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
  byStage: Record<string, { count: number; value: number }>
  byPipeline: Record<string, { count: number; value: number }>
  byOwner: Record<string, { count: number; value: number }>
  topDeals: Deal[]
  dealsClosingSoon: Deal[]
  staleDealeddeals: Deal[] // Deals not updated in X days
}

// Deal import/export
export interface DealImportRow {
  name: string
  amount?: number
  stage?: string
  expectedCloseDate?: string
  accountName?: string
  contactEmail?: string
  [key: string]: any
}

export interface DealImportResult {
  success: number
  failed: number
  errors: Array<{
    row: number
    message: string
    data: DealImportRow
  }>
}

export interface DealExportOptions {
  format: 'csv' | 'xlsx' | 'json'
  fields?: string[]
  filters?: DealFilters
  includeProducts?: boolean
  includeHistory?: boolean
  includeCustomFields?: boolean
}

// Deal stage change
export interface ChangeDealStageInput {
  toStageId?: string // Made optional to match Zod schema
  notes?: string
}

// Deal close
export interface CloseDealInput {
  isWon?: boolean // Made optional to match Zod schema - validated at runtime
  actualCloseDate?: Date
  lostReason?: string
  notes?: string
}

// Pipeline creation
export interface CreatePipelineInput {
  name: string
  description?: string
  isDefault?: boolean
  stages?: Array<{
    name: string
    probability: number
    isClosedStage?: boolean
    isWonStage?: boolean
    color?: string
  }>
}

export interface UpdatePipelineInput {
  name?: string
  description?: string
  isDefault?: boolean
  isActive?: boolean
}

// Deal stage creation
export interface CreateDealStageInput {
  pipelineId: string
  name: string
  displayOrder: number
  probability: number
  isClosedStage?: boolean
  isWonStage?: boolean
  color?: string
}

export interface UpdateDealStageInput {
  name?: string
  displayOrder?: number
  probability?: number
  isClosedStage?: boolean
  isWonStage?: boolean
  color?: string
}

// Deal product
export interface AddDealProductInput {
  productName: string
  description?: string
  quantity: number
  unitPrice: number
  discount?: number
}

export interface UpdateDealProductInput {
  productName?: string
  description?: string
  quantity?: number
  unitPrice?: number
  discount?: number
}
