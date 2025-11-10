/**
 * Metadata Validators
 * Zod schemas for validating notes, tags, comments, and custom fields
 */

import { z } from 'zod'

import { CustomFieldType } from './metadata-types'

// =====================================================
// NOTE VALIDATION SCHEMAS
// =====================================================

export const createNoteSchema = z.object({
  title: z.string().max(255, 'Title too long').optional(),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long'),
  isPinned: z.boolean().optional(),
  entityType: z.string().min(1, 'Entity type is required').max(50),
  entityId: z.string().uuid('Invalid entity ID'),
})

export const updateNoteSchema = z.object({
  title: z.string().max(255, 'Title too long').optional().nullable(),
  content: z.string().min(1, 'Content is required').max(50000, 'Content too long').optional(),
  isPinned: z.boolean().optional(),
})

export const noteListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: z
    .object({
      search: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      createdBy: z.string().uuid().optional(),
      isPinned: z.boolean().optional(),
    })
    .optional(),
})

export const bulkNoteOperationSchema = z.object({
  noteIds: z.array(z.string().uuid()).min(1, 'At least one note ID required').max(100, 'Too many notes'),
  operation: z.enum(['delete', 'pin', 'unpin']),
})

// =====================================================
// COMMENT VALIDATION SCHEMAS
// =====================================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long'),
  entityType: z.string().min(1, 'Entity type is required').max(50),
  entityId: z.string().uuid('Invalid entity ID'),
  parentId: z.string().uuid('Invalid parent ID').optional(),
})

export const updateCommentSchema = z.object({
  content: z.string().min(1, 'Content is required').max(10000, 'Content too long').optional(), // Made optional to match type definition
}).partial()

export const commentListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  filters: z
    .object({
      search: z.string().optional(),
      entityType: z.string().optional(),
      entityId: z.string().uuid().optional(),
      createdBy: z.string().uuid().optional(),
      parentId: z.string().uuid().optional().nullable(),
    })
    .optional(),
})

// =====================================================
// TAG VALIDATION SCHEMAS
// =====================================================

const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(100, 'Tag name too long')
    .transform((val) => val.trim()),
  description: z.string().max(500, 'Description too long').optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color code')
    .optional()
    .default('#3B82F6'),
  category: z.string().max(50).optional(),
})

export const updateTagSchema = z.object({
  name: z
    .string()
    .min(1, 'Tag name is required')
    .max(100, 'Tag name too long')
    .transform((val) => val.trim())
    .optional(),
  description: z.string().max(500, 'Description too long').optional().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color code').optional(),
  category: z.string().max(50).optional().nullable(),
})

export const assignTagSchema = z.object({
  tagId: z.string().uuid('Invalid tag ID').optional(), // Made optional to match type definition
  entityType: z.string().min(1, 'Entity type is required').max(50).optional(), // Made optional to match type definition
  entityId: z.string().uuid('Invalid entity ID').optional(), // Made optional to match type definition
}).partial()

export const tagListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  filters: z
    .object({
      search: z.string().optional(),
      category: z.string().optional(),
    })
    .optional(),
})

// =====================================================
// CUSTOM FIELD VALIDATION SCHEMAS
// =====================================================

export const createCustomFieldSchema = z.object({
  entityType: z.string().min(1, 'Entity type is required').max(50),
  fieldName: z
    .string()
    .min(1, 'Field name is required')
    .max(100, 'Field name too long')
    .regex(/^[a-z][a-z0-9_]*$/, 'Field name must be lowercase, start with letter, and contain only letters, numbers, and underscores'),
  fieldLabel: z.string().min(1, 'Field label is required').max(255, 'Field label too long'),
  fieldType: z.nativeEnum(CustomFieldType),
  fieldOptions: z.any().optional(),
  defaultValue: z.string().max(1000).optional(),
  isRequired: z.boolean().optional().default(false),
  isSearchable: z.boolean().optional().default(false),
  isVisible: z.boolean().optional().default(true),
  validationRules: z.any().optional(),
  displayOrder: z.number().int().min(0).optional().default(0),
  helpText: z.string().max(500).optional(),
  placeholderText: z.string().max(255).optional(),
})

export const updateCustomFieldSchema = z.object({
  fieldLabel: z.string().min(1, 'Field label is required').max(255, 'Field label too long').optional(),
  fieldOptions: z.any().optional(),
  defaultValue: z.string().max(1000).optional().nullable(),
  isRequired: z.boolean().optional(),
  isSearchable: z.boolean().optional(),
  isVisible: z.boolean().optional(),
  validationRules: z.any().optional(),
  displayOrder: z.number().int().min(0).optional(),
  helpText: z.string().max(500).optional().nullable(),
  placeholderText: z.string().max(255).optional().nullable(),
})

export const setCustomFieldValueSchema = z.object({
  entityType: z.string().min(1, 'Entity type is required').max(50).optional(), // Made optional to match type definition
  entityId: z.string().uuid('Invalid entity ID').optional(), // Made optional to match type definition
  fieldId: z.string().uuid('Invalid field ID').optional(), // Made optional to match type definition
  value: z.string().max(10000, 'Value too long').optional().nullable(),
}).partial()

export const customFieldListOptionsSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  sortBy: z.string().default('displayOrder'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
  filters: z
    .object({
      entityType: z.string().optional(),
      isVisible: z.boolean().optional(),
    })
    .optional(),
})

// =====================================================
// SEARCH & QUERY VALIDATION
// =====================================================

export const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(255),
  limit: z.number().int().positive().max(100).default(20),
})

export const entityNotesQuerySchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().uuid('Invalid entity ID'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
})

export const entityCommentsQuerySchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().uuid('Invalid entity ID'),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  includeReplies: z.boolean().optional().default(true),
})

export const entityTagsQuerySchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().uuid('Invalid entity ID'),
})

export const entityCustomFieldsQuerySchema = z.object({
  entityType: z.string().min(1, 'Entity type is required'),
  entityId: z.string().uuid('Invalid entity ID'),
})

// =====================================================
// HELPER: Slugify function for tags
// =====================================================

export { slugify }
