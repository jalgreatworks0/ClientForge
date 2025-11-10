/**
 * Account Validators
 * Zod schemas for input validation
 */

import { z } from 'zod'

import { CompanySize, AccountType, AccountStatus } from './account-types'

// Common field validators
const emailSchema = z.string().email().optional().or(z.literal(''))
const phoneSchema = z.string().max(50).optional().or(z.literal(''))
const urlSchema = z.string().url().optional().or(z.literal(''))
const yearSchema = z.number().int().min(1800).max(new Date().getFullYear()).optional()

// Create account schema
export const createAccountSchema = z.object({
  ownerId: z.string().uuid('Owner ID must be a valid UUID').optional(), // Optional - defaults to authenticated user
  name: z.string().min(1, 'Account name is required').max(255),
  website: urlSchema,
  industry: z.string().max(100).optional(),
  companySize: z.nativeEnum(CompanySize).optional(),
  annualRevenue: z.number().positive().optional(),
  phone: phoneSchema,
  email: emailSchema,
  description: z.string().optional(),
  accountType: z.nativeEnum(AccountType).optional(),
  accountStatus: z.nativeEnum(AccountStatus).optional(),
  parentAccountId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  billingAddressStreet: z.string().max(255).optional(),
  billingAddressCity: z.string().max(100).optional(),
  billingAddressState: z.string().max(100).optional(),
  billingAddressPostalCode: z.string().max(20).optional(),
  billingAddressCountry: z.string().max(100).optional(),
  shippingAddressStreet: z.string().max(255).optional(),
  shippingAddressCity: z.string().max(100).optional(),
  shippingAddressState: z.string().max(100).optional(),
  shippingAddressPostalCode: z.string().max(20).optional(),
  shippingAddressCountry: z.string().max(100).optional(),
  socialLinkedin: urlSchema,
  socialTwitter: z.string().max(255).optional(),
  socialFacebook: z.string().max(255).optional(),
  employeeCount: z.number().int().positive().optional(),
  foundedYear: yearSchema,
  stockSymbol: z.string().max(10).optional(),
})

// Update account schema (all fields optional)
export const updateAccountSchema = z.object({
  ownerId: z.string().uuid().optional(),
  name: z.string().min(1).max(255).optional(),
  website: urlSchema,
  industry: z.string().max(100).optional().nullable(),
  companySize: z.nativeEnum(CompanySize).optional().nullable(),
  annualRevenue: z.number().positive().optional().nullable(),
  phone: phoneSchema,
  email: emailSchema,
  description: z.string().optional().nullable(),
  accountType: z.nativeEnum(AccountType).optional().nullable(),
  accountStatus: z.nativeEnum(AccountStatus).optional(),
  parentAccountId: z.string().uuid().optional().nullable(),
  tags: z.array(z.string()).optional(),
  billingAddressStreet: z.string().max(255).optional().nullable(),
  billingAddressCity: z.string().max(100).optional().nullable(),
  billingAddressState: z.string().max(100).optional().nullable(),
  billingAddressPostalCode: z.string().max(20).optional().nullable(),
  billingAddressCountry: z.string().max(100).optional().nullable(),
  shippingAddressStreet: z.string().max(255).optional().nullable(),
  shippingAddressCity: z.string().max(100).optional().nullable(),
  shippingAddressState: z.string().max(100).optional().nullable(),
  shippingAddressPostalCode: z.string().max(20).optional().nullable(),
  shippingAddressCountry: z.string().max(100).optional().nullable(),
  socialLinkedin: urlSchema,
  socialTwitter: z.string().max(255).optional().nullable(),
  socialFacebook: z.string().max(255).optional().nullable(),
  employeeCount: z.number().int().positive().optional().nullable(),
  foundedYear: yearSchema,
  stockSymbol: z.string().max(10).optional().nullable(),
  isActive: z.boolean().optional(),
  lastActivityAt: z.coerce.date().optional(),
}).partial()

// Account filters schema
export const accountFiltersSchema = z.object({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  industry: z.string().optional(),
  companySize: z.union([
    z.nativeEnum(CompanySize),
    z.array(z.nativeEnum(CompanySize)),
  ]).optional(),
  accountType: z.union([
    z.nativeEnum(AccountType),
    z.array(z.nativeEnum(AccountType)),
  ]).optional(),
  accountStatus: z.union([
    z.nativeEnum(AccountStatus),
    z.array(z.nativeEnum(AccountStatus)),
  ]).optional(),
  revenueMin: z.number().positive().optional(),
  revenueMax: z.number().positive().optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  lastActivityAfter: z.coerce.date().optional(),
  lastActivityBefore: z.coerce.date().optional(),
  parentAccountId: z.string().uuid().optional(),
  hasParent: z.boolean().optional(),
}).partial()

// List options schema
export const accountListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: accountFiltersSchema.optional(),
}).partial()

// Bulk operation schema
export const bulkAccountOperationSchema = z.object({
  accountIds: z.array(z.string().uuid()).min(1, 'At least one account ID is required').optional(), // Validated at runtime
  operation: z.enum(['update', 'delete', 'assign', 'add_tags', 'remove_tags', 'change_status']).optional(), // Validated at runtime
  data: z.record(z.any()).optional(),
}).refine(
  (data) => {
    if (['update', 'assign', 'add_tags', 'remove_tags', 'change_status'].includes(data.operation)) {
      return data.data !== undefined
    }
    return true
  },
  {
    message: 'Data is required for update, assign, add_tags, remove_tags, and change_status operations',
    path: ['data'],
  }
)

// Account note schema
export const accountNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(5000),
})

// Account import schema
export const accountImportSchema = z.object({
  name: z.string().min(1),
  website: urlSchema,
  industry: z.string().max(100).optional(),
  phone: phoneSchema,
  email: emailSchema,
}).catchall(z.any()) // Allow custom fields

// Account export schema
export const accountExportSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  fields: z.array(z.string()).optional(),
  filters: accountFiltersSchema.optional(),
  includeCustomFields: z.boolean().default(false),
  includeContacts: z.boolean().default(false),
  includeDeals: z.boolean().default(false),
})

// Query params validators
export const accountIdParamSchema = z.object({
  id: z.string().uuid('Account ID must be a valid UUID'),
})

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// Type exports for use in controllers
export type CreateAccountInput = z.infer<typeof createAccountSchema>
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>
export type AccountFilters = z.infer<typeof accountFiltersSchema>
export type AccountListOptions = z.infer<typeof accountListOptionsSchema>
export type BulkAccountOperation = z.infer<typeof bulkAccountOperationSchema>
export type AccountNote = z.infer<typeof accountNoteSchema>
export type AccountImportRow = z.infer<typeof accountImportSchema>
export type AccountExportOptions = z.infer<typeof accountExportSchema>
