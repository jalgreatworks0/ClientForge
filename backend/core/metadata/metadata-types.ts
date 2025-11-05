/**
 * Metadata Types & Interfaces
 * TypeScript definitions for notes, tags, comments, and custom fields
 */

// =====================================================
// NOTE INTERFACES
// =====================================================

export interface Note {
  id: string
  tenantId: string

  // Content
  title: string | null
  content: string
  isPinned: boolean

  // Polymorphic relationship
  entityType: string
  entityId: string

  // Ownership
  createdBy: string
  updatedBy: string | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface NoteWithCreator extends Note {
  creator?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
}

export interface CreateNoteInput {
  title?: string
  content: string
  isPinned?: boolean
  entityType: string
  entityId: string
}

export interface UpdateNoteInput {
  title?: string | null
  content?: string
  isPinned?: boolean
}

// =====================================================
// COMMENT INTERFACES
// =====================================================

export interface Comment {
  id: string
  tenantId: string

  // Content
  content: string

  // Polymorphic relationship
  entityType: string
  entityId: string

  // Threading
  parentId: string | null

  // Ownership
  createdBy: string
  updatedBy: string | null

  // Metadata
  isEdited: boolean

  // Timestamps
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface CommentWithAuthor extends Comment {
  author?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  replies?: CommentWithAuthor[]
}

export interface CreateCommentInput {
  content: string
  entityType: string
  entityId: string
  parentId?: string
}

export interface UpdateCommentInput {
  content: string
}

// =====================================================
// TAG INTERFACES
// =====================================================

export interface Tag {
  id: string
  tenantId: string

  // Tag Details
  name: string
  slug: string
  description: string | null
  color: string
  category: string | null

  // Usage tracking
  usageCount: number

  // Timestamps
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface EntityTag {
  id: string
  tenantId: string
  entityType: string
  entityId: string
  tagId: string
  createdAt: Date
}

export interface TagWithUsage extends Tag {
  entities?: Array<{
    entityType: string
    entityId: string
  }>
}

export interface CreateTagInput {
  name: string
  description?: string
  color?: string
  category?: string
}

export interface UpdateTagInput {
  name?: string
  description?: string | null
  color?: string
  category?: string | null
}

export interface AssignTagInput {
  tagId: string
  entityType: string
  entityId: string
}

// =====================================================
// CUSTOM FIELD INTERFACES
// =====================================================

export enum CustomFieldType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  DATE = 'date',
  DATETIME = 'datetime',
  BOOLEAN = 'boolean',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  URL = 'url',
  EMAIL = 'email',
  PHONE = 'phone',
  CURRENCY = 'currency',
}

export interface CustomField {
  id: string
  tenantId: string

  // Field Definition
  entityType: string
  fieldName: string
  fieldLabel: string
  fieldType: CustomFieldType

  // Configuration
  fieldOptions: any | null
  defaultValue: string | null
  isRequired: boolean
  isSearchable: boolean
  isVisible: boolean

  // Validation
  validationRules: any | null

  // Display
  displayOrder: number
  helpText: string | null
  placeholderText: string | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

export interface CustomFieldValue {
  id: string
  tenantId: string

  // Entity reference
  entityType: string
  entityId: string

  // Field reference
  fieldId: string

  // Value
  value: string | null

  // Timestamps
  createdAt: Date
  updatedAt: Date
}

export interface CustomFieldWithValue extends CustomField {
  value?: string | null
}

export interface CreateCustomFieldInput {
  entityType: string
  fieldName: string
  fieldLabel: string
  fieldType: CustomFieldType
  fieldOptions?: any
  defaultValue?: string
  isRequired?: boolean
  isSearchable?: boolean
  isVisible?: boolean
  validationRules?: any
  displayOrder?: number
  helpText?: string
  placeholderText?: string
}

export interface UpdateCustomFieldInput {
  fieldLabel?: string
  fieldOptions?: any
  defaultValue?: string | null
  isRequired?: boolean
  isSearchable?: boolean
  isVisible?: boolean
  validationRules?: any
  displayOrder?: number
  helpText?: string | null
  placeholderText?: string | null
}

export interface SetCustomFieldValueInput {
  entityType: string
  entityId: string
  fieldId: string
  value: string | null
}

// =====================================================
// LIST OPTIONS & RESULTS
// =====================================================

export interface NoteListOptions {
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  filters?: {
    search?: string
    entityType?: string
    entityId?: string
    createdBy?: string
    isPinned?: boolean
  }
}

export interface NoteListResult {
  notes: Note[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CommentListOptions {
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  filters?: {
    search?: string
    entityType?: string
    entityId?: string
    createdBy?: string
    parentId?: string | null
  }
}

export interface CommentListResult {
  comments: Comment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TagListOptions {
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  filters?: {
    search?: string
    category?: string
  }
}

export interface TagListResult {
  tags: Tag[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CustomFieldListOptions {
  page: number
  limit: number
  sortBy: string
  sortOrder: 'asc' | 'desc'
  filters?: {
    entityType?: string
    isVisible?: boolean
  }
}

export interface CustomFieldListResult {
  customFields: CustomField[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// =====================================================
// BULK OPERATIONS
// =====================================================

export type NoteBulkOperation = 'delete' | 'pin' | 'unpin'

export interface BulkNoteOperationInput {
  noteIds: string[]
  operation: NoteBulkOperation
}

export interface BulkOperationResult {
  success: number
  failed: number
  errors?: Array<{ id: string; error: string }>
}

// =====================================================
// STATISTICS
// =====================================================

export interface NoteStatistics {
  totalNotes: number
  pinnedNotes: number
  byEntityType: Array<{
    entityType: string
    count: number
  }>
  byCreator: Array<{
    userId: string
    userName: string
    noteCount: number
  }>
  averageLength: number
}

export interface TagStatistics {
  totalTags: number
  byCategory: Array<{
    category: string
    count: number
  }>
  topTags: Array<{
    tagId: string
    tagName: string
    usageCount: number
  }>
  totalTaggedEntities: number
}
