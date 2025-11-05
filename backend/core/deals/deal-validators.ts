/**
 * Deal Validators
 * Zod schemas for input validation
 */

import { z } from 'zod'

// Common validators
const currencySchema = z.string().length(3).default('USD')
const probabilitySchema = z.number().int().min(0).max(100).default(0)
const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional()

// Create deal schema
export const createDealSchema = z.object({
  ownerId: z.string().uuid('Owner ID must be a valid UUID'),
  accountId: z.string().uuid('Account ID must be a valid UUID').optional(),
  contactId: z.string().uuid('Contact ID must be a valid UUID').optional(),
  pipelineId: z.string().uuid('Pipeline ID must be a valid UUID'),
  stageId: z.string().uuid('Stage ID must be a valid UUID'),
  name: z.string().min(1, 'Deal name is required').max(255),
  amount: z.number().positive().optional(),
  currency: currencySchema,
  probability: probabilitySchema,
  expectedCloseDate: z.coerce.date().optional(),
  leadSource: z.string().max(100).optional(),
  nextStep: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  competitors: z.array(z.string()).optional(),
  decisionMakers: z.array(z.string()).optional(),
  keyContacts: z.array(z.string()).optional(),
})

// Update deal schema
export const updateDealSchema = z.object({
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional().nullable(),
  contactId: z.string().uuid().optional().nullable(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  amount: z.number().positive().optional().nullable(),
  currency: currencySchema,
  probability: probabilitySchema,
  expectedCloseDate: z.coerce.date().optional().nullable(),
  actualCloseDate: z.coerce.date().optional().nullable(),
  leadSource: z.string().max(100).optional().nullable(),
  nextStep: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  isClosed: z.boolean().optional(),
  isWon: z.boolean().optional().nullable(),
  lostReason: z.string().max(255).optional().nullable(),
  competitors: z.array(z.string()).optional(),
  decisionMakers: z.array(z.string()).optional(),
  keyContacts: z.array(z.string()).optional(),
}).partial()

// Deal filters schema
export const dealFiltersSchema = z.object({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  contactId: z.string().uuid().optional(),
  pipelineId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  amountMin: z.number().positive().optional(),
  amountMax: z.number().positive().optional(),
  probabilityMin: probabilitySchema,
  probabilityMax: probabilitySchema,
  tags: z.array(z.string()).optional(),
  isClosed: z.boolean().optional(),
  isWon: z.boolean().optional(),
  leadSource: z.string().optional(),
  expectedCloseDateFrom: z.coerce.date().optional(),
  expectedCloseDateTo: z.coerce.date().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
}).partial()

// List options schema
export const dealListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: dealFiltersSchema.optional(),
}).partial()

// Bulk operation schema
export const bulkDealOperationSchema = z.object({
  dealIds: z.array(z.string().uuid()).min(1, 'At least one deal ID is required'),
  operation: z.enum(['update', 'delete', 'assign', 'add_tags', 'remove_tags', 'change_stage', 'close_won', 'close_lost']),
  data: z.record(z.any()).optional(),
}).refine(
  (data) => {
    if (['update', 'assign', 'add_tags', 'remove_tags', 'change_stage'].includes(data.operation)) {
      return data.data !== undefined
    }
    return true
  },
  {
    message: 'Data is required for update, assign, add_tags, remove_tags, and change_stage operations',
    path: ['data'],
  }
)

// Change stage schema
export const changeDealStageSchema = z.object({
  toStageId: z.string().uuid('Stage ID must be a valid UUID'),
  notes: z.string().max(5000).optional(),
})

// Close deal schema
export const closeDealSchema = z.object({
  isWon: z.boolean(),
  actualCloseDate: z.coerce.date().optional(),
  lostReason: z.string().max(255).optional(),
  notes: z.string().max(5000).optional(),
}).refine(
  (data) => {
    if (!data.isWon && !data.lostReason) {
      return false
    }
    return true
  },
  {
    message: 'Lost reason is required when closing as lost',
    path: ['lostReason'],
  }
)

// Pipeline schemas
export const createPipelineSchema = z.object({
  name: z.string().min(1, 'Pipeline name is required').max(100),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  stages: z.array(z.object({
    name: z.string().min(1).max(100),
    probability: probabilitySchema,
    isClosedStage: z.boolean().default(false),
    isWonStage: z.boolean().default(false),
    color: hexColorSchema,
  })).optional(),
})

export const updatePipelineSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
}).partial()

// Deal stage schemas
export const createDealStageSchema = z.object({
  pipelineId: z.string().uuid('Pipeline ID must be a valid UUID'),
  name: z.string().min(1, 'Stage name is required').max(100),
  displayOrder: z.number().int().positive(),
  probability: probabilitySchema,
  isClosedStage: z.boolean().default(false),
  isWonStage: z.boolean().default(false),
  color: hexColorSchema,
})

export const updateDealStageSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  displayOrder: z.number().int().positive().optional(),
  probability: probabilitySchema,
  isClosedStage: z.boolean().optional(),
  isWonStage: z.boolean().optional(),
  color: hexColorSchema,
}).partial()

// Deal product schemas
export const addDealProductSchema = z.object({
  productName: z.string().min(1, 'Product name is required').max(255),
  description: z.string().optional(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().positive('Unit price must be positive'),
  discount: z.number().min(0).max(100).default(0),
})

export const updateDealProductSchema = z.object({
  productName: z.string().min(1).max(255).optional(),
  description: z.string().optional().nullable(),
  quantity: z.number().positive().optional(),
  unitPrice: z.number().positive().optional(),
  discount: z.number().min(0).max(100).optional(),
}).partial()

// Deal export schema
export const dealExportSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  fields: z.array(z.string()).optional(),
  filters: dealFiltersSchema.optional(),
  includeProducts: z.boolean().default(false),
  includeHistory: z.boolean().default(false),
  includeCustomFields: z.boolean().default(false),
})

// Deal import schema
export const dealImportSchema = z.object({
  name: z.string().min(1),
  amount: z.number().positive().optional(),
  stage: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  accountName: z.string().optional(),
  contactEmail: z.string().email().optional(),
}).catchall(z.any())

// Query param validators
export const dealIdParamSchema = z.object({
  id: z.string().uuid('Deal ID must be a valid UUID'),
})

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

export const forecastQuerySchema = z.object({
  period: z.enum(['month', 'quarter', 'year']).default('month'),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

// Type exports
export type CreateDealInput = z.infer<typeof createDealSchema>
export type UpdateDealInput = z.infer<typeof updateDealSchema>
export type DealFilters = z.infer<typeof dealFiltersSchema>
export type DealListOptions = z.infer<typeof dealListOptionsSchema>
export type BulkDealOperation = z.infer<typeof bulkDealOperationSchema>
export type ChangeDealStageInput = z.infer<typeof changeDealStageSchema>
export type CloseDealInput = z.infer<typeof closeDealSchema>
export type CreatePipelineInput = z.infer<typeof createPipelineSchema>
export type UpdatePipelineInput = z.infer<typeof updatePipelineSchema>
export type CreateDealStageInput = z.infer<typeof createDealStageSchema>
export type UpdateDealStageInput = z.infer<typeof updateDealStageSchema>
export type AddDealProductInput = z.infer<typeof addDealProductSchema>
export type UpdateDealProductInput = z.infer<typeof updateDealProductSchema>
export type DealExportOptions = z.infer<typeof dealExportSchema>
export type DealImportRow = z.infer<typeof dealImportSchema>
