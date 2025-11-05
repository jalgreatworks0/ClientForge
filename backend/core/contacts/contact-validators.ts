/**
 * Contact Validators
 * Zod schemas for input validation
 */

import { z } from 'zod'
import { LeadStatus, LifecycleStage, LeadSource } from './contact-types'

// Common field validators
const emailSchema = z.string().email().optional().or(z.literal(''))
const phoneSchema = z.string().max(50).optional().or(z.literal(''))
const urlSchema = z.string().url().optional().or(z.literal(''))

// Create contact schema
export const createContactSchema = z.object({
  ownerId: z.string().uuid('Owner ID must be a valid UUID'),
  accountId: z.string().uuid('Account ID must be a valid UUID').optional(),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: emailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  title: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  leadSource: z.nativeEnum(LeadSource).optional(),
  leadStatus: z.nativeEnum(LeadStatus).optional(),
  lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
  tags: z.array(z.string()).optional(),
  addressStreet: z.string().max(255).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(100).optional(),
  addressPostalCode: z.string().max(20).optional(),
  addressCountry: z.string().max(100).optional(),
  socialLinkedin: urlSchema,
  socialTwitter: z.string().max(255).optional(),
  socialFacebook: z.string().max(255).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.email || data.phone || data.mobile,
  {
    message: 'At least one contact method (email, phone, or mobile) is required',
    path: ['email'],
  }
)

// Update contact schema (all fields optional)
export const updateContactSchema = z.object({
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional().nullable(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  email: emailSchema,
  phone: phoneSchema,
  mobile: phoneSchema,
  title: z.string().max(100).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  leadSource: z.nativeEnum(LeadSource).optional().nullable(),
  leadStatus: z.nativeEnum(LeadStatus).optional(),
  lifecycleStage: z.nativeEnum(LifecycleStage).optional(),
  leadScore: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  addressStreet: z.string().max(255).optional().nullable(),
  addressCity: z.string().max(100).optional().nullable(),
  addressState: z.string().max(100).optional().nullable(),
  addressPostalCode: z.string().max(20).optional().nullable(),
  addressCountry: z.string().max(100).optional().nullable(),
  socialLinkedin: urlSchema,
  socialTwitter: z.string().max(255).optional().nullable(),
  socialFacebook: z.string().max(255).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  lastContactedAt: z.coerce.date().optional(),
}).partial()

// Contact filters schema
export const contactFiltersSchema = z.object({
  search: z.string().optional(),
  ownerId: z.string().uuid().optional(),
  accountId: z.string().uuid().optional(),
  leadStatus: z.union([
    z.nativeEnum(LeadStatus),
    z.array(z.nativeEnum(LeadStatus)),
  ]).optional(),
  lifecycleStage: z.union([
    z.nativeEnum(LifecycleStage),
    z.array(z.nativeEnum(LifecycleStage)),
  ]).optional(),
  leadScoreMin: z.number().int().min(0).max(100).optional(),
  leadScoreMax: z.number().int().min(0).max(100).optional(),
  tags: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  lastContactedAfter: z.coerce.date().optional(),
  lastContactedBefore: z.coerce.date().optional(),
}).partial()

// List options schema
export const contactListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: contactFiltersSchema.optional(),
}).partial()

// Bulk operation schema
export const bulkContactOperationSchema = z.object({
  contactIds: z.array(z.string().uuid()).min(1, 'At least one contact ID is required'),
  operation: z.enum(['update', 'delete', 'assign', 'add_tags', 'remove_tags']),
  data: z.record(z.any()).optional(),
}).refine(
  (data) => {
    if (data.operation === 'update' || data.operation === 'assign' || data.operation === 'add_tags' || data.operation === 'remove_tags') {
      return data.data !== undefined
    }
    return true
  },
  {
    message: 'Data is required for update, assign, add_tags, and remove_tags operations',
    path: ['data'],
  }
)

// Contact note schema
export const contactNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(5000),
})

// Contact import schema
export const contactImportSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: emailSchema,
  phone: phoneSchema,
  title: z.string().max(100).optional(),
  company: z.string().max(255).optional(),
}).catchall(z.any()) // Allow custom fields

// Contact export schema
export const contactExportSchema = z.object({
  format: z.enum(['csv', 'xlsx', 'json']).default('csv'),
  fields: z.array(z.string()).optional(),
  filters: contactFiltersSchema.optional(),
  includeCustomFields: z.boolean().default(false),
})

// Query params validators
export const contactIdParamSchema = z.object({
  id: z.string().uuid('Contact ID must be a valid UUID'),
})

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required'),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
})

// Type exports for use in controllers
export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>
export type ContactFilters = z.infer<typeof contactFiltersSchema>
export type ContactListOptions = z.infer<typeof contactListOptionsSchema>
export type BulkContactOperation = z.infer<typeof bulkContactOperationSchema>
export type ContactNote = z.infer<typeof contactNoteSchema>
export type ContactImportRow = z.infer<typeof contactImportSchema>
export type ContactExportOptions = z.infer<typeof contactExportSchema>
