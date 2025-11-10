/**
 * Metadata Service
 * Business logic for notes, tags, comments, and custom fields
 */

import { metadataRepository } from './metadata-repository'
import { ValidationError, NotFoundError } from '../../utils/errors'
import type {
  Note,
  Comment,
  Tag,
  CustomField,
  CustomFieldValue,
  CreateNoteInput,
  UpdateNoteInput,
  NoteListOptions,
  NoteListResult,
  CreateCommentInput,
  UpdateCommentInput,
  CommentListOptions,
  CommentListResult,
  CreateTagInput,
  UpdateTagInput,
  AssignTagInput,
  TagListOptions,
  TagListResult,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  SetCustomFieldValueInput,
  CustomFieldListOptions,
  CustomFieldListResult,
  EntityTag,
  NoteBulkOperation,
  BulkNoteOperationInput,
} from './metadata-types'
import { CustomFieldType } from './metadata-types'
import { slugify } from './metadata-validators'

// =====================================================
// NOTE SERVICE
// =====================================================

export class NoteService {
  /**
   * Create a new note
   */
  async createNote(tenantId: string, userId: string, data: CreateNoteInput): Promise<Note> {
    // Validate content length
    if (data.content.length > 50000) {
      throw new ValidationError('Note content exceeds maximum length of 50,000 characters')
    }

    const note = await metadataRepository.createNote(tenantId, userId, data)
    return note
  }

  /**
   * Get note by ID
   */
  async getNoteById(id: string, tenantId: string): Promise<Note> {
    const note = await metadataRepository.findNoteById(id, tenantId)
    if (!note) {
      throw new NotFoundError('Note not found')
    }
    return note
  }

  /**
   * List notes with pagination and filtering
   */
  async listNotes(tenantId: string, options: NoteListOptions): Promise<NoteListResult> {
    return metadataRepository.listNotes(tenantId, options)
  }

  /**
   * Update a note
   */
  async updateNote(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateNoteInput
  ): Promise<Note> {
    // Verify note exists
    const existingNote = await this.getNoteById(id, tenantId)

    // Validate content length if provided
    if (data.content && data.content.length > 50000) {
      throw new ValidationError('Note content exceeds maximum length of 50,000 characters')
    }

    const note = await metadataRepository.updateNote(id, tenantId, userId, data)
    return note
  }

  /**
   * Delete a note (soft delete)
   */
  async deleteNote(id: string, tenantId: string): Promise<void> {
    // Verify note exists
    await this.getNoteById(id, tenantId)

    await metadataRepository.deleteNote(id, tenantId)
  }

  /**
   * Bulk delete notes
   */
  async bulkDeleteNotes(ids: string[], tenantId: string): Promise<number> {
    if (ids.length === 0) {
      throw new ValidationError('No note IDs provided')
    }

    if (ids.length > 100) {
      throw new ValidationError('Cannot delete more than 100 notes at once')
    }

    return metadataRepository.bulkDeleteNotes(ids, tenantId)
  }

  /**
   * Bulk pin/unpin notes
   */
  async bulkPinNotes(ids: string[], tenantId: string, isPinned: boolean): Promise<number> {
    if (ids.length === 0) {
      throw new ValidationError('No note IDs provided')
    }

    if (ids.length > 100) {
      throw new ValidationError('Cannot update more than 100 notes at once')
    }

    return metadataRepository.bulkPinNotes(ids, tenantId, isPinned)
  }

  /**
   * Search notes by content
   */
  async searchNotes(tenantId: string, query: string, limit: number = 20): Promise<Note[]> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query is required')
    }

    if (query.length > 255) {
      throw new ValidationError('Search query too long')
    }

    return metadataRepository.searchNotes(tenantId, query, limit)
  }

  /**
   * Get notes for a specific entity
   */
  async getEntityNotes(
    tenantId: string,
    entityType: string,
    entityId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<NoteListResult> {
    return metadataRepository.listNotes(tenantId, {
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: {
        entityType,
        entityId,
      },
    })
  }

  /**
   * Get note statistics for an entity
   */
  async getNoteStatistics(
    tenantId: string,
    entityType?: string,
    entityId?: string
  ): Promise<{ total: number; pinned: number }> {
    const result = await metadataRepository.listNotes(tenantId, {
      page: 1,
      limit: 1,
      filters: {
        entityType,
        entityId,
      },
    })

    const pinnedResult = await metadataRepository.listNotes(tenantId, {
      page: 1,
      limit: 1,
      filters: {
        entityType,
        entityId,
        isPinned: true,
      },
    })

    return {
      total: result.total,
      pinned: pinnedResult.total,
    }
  }
}

// =====================================================
// COMMENT SERVICE
// =====================================================

export class CommentService {
  /**
   * Create a new comment
   */
  async createComment(
    tenantId: string,
    userId: string,
    data: CreateCommentInput
  ): Promise<Comment> {
    // Validate content length
    if (data.content.length > 10000) {
      throw new ValidationError('Comment content exceeds maximum length of 10,000 characters')
    }

    // If this is a reply, verify parent comment exists
    if (data.parentId) {
      const parentComment = await metadataRepository.findCommentById(data.parentId, tenantId)
      if (!parentComment) {
        throw new NotFoundError('Parent comment not found')
      }

      // Prevent deeply nested comments (max 2 levels)
      if (parentComment.parentId) {
        throw new ValidationError('Cannot reply to a nested comment. Maximum nesting level is 2.')
      }

      // Verify parent comment is on the same entity
      if (
        parentComment.entityType !== data.entityType ||
        parentComment.entityId !== data.entityId
      ) {
        throw new ValidationError('Parent comment must be on the same entity')
      }
    }

    const comment = await metadataRepository.createComment(tenantId, userId, data)
    return comment
  }

  /**
   * Get comment by ID
   */
  async getCommentById(id: string, tenantId: string): Promise<Comment> {
    const comment = await metadataRepository.findCommentById(id, tenantId)
    if (!comment) {
      throw new NotFoundError('Comment not found')
    }
    return comment
  }

  /**
   * List comments with pagination and filtering
   */
  async listComments(tenantId: string, options: CommentListOptions): Promise<CommentListResult> {
    return metadataRepository.listComments(tenantId, options)
  }

  /**
   * Update a comment
   */
  async updateComment(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateCommentInput
  ): Promise<Comment> {
    // Verify comment exists
    const existingComment = await this.getCommentById(id, tenantId)

    // Only allow the author to edit their own comments
    if (existingComment.createdBy !== userId) {
      throw new ValidationError('You can only edit your own comments')
    }

    // Validate content length
    if (data.content.length > 10000) {
      throw new ValidationError('Comment content exceeds maximum length of 10,000 characters')
    }

    const comment = await metadataRepository.updateComment(id, tenantId, userId, data)
    return comment
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(id: string, tenantId: string, userId: string): Promise<void> {
    // Verify comment exists
    const existingComment = await this.getCommentById(id, tenantId)

    // Only allow the author to delete their own comments
    // TODO: Add role check for admins to delete any comment
    if (existingComment.createdBy !== userId) {
      throw new ValidationError('You can only delete your own comments')
    }

    await metadataRepository.deleteComment(id, tenantId)
  }

  /**
   * Get comments for a specific entity
   */
  async getEntityComments(
    tenantId: string,
    entityType: string,
    entityId: string,
    page: number = 1,
    limit: number = 20,
    includeReplies: boolean = true
  ): Promise<CommentListResult> {
    return metadataRepository.listComments(tenantId, {
      page,
      limit,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      filters: {
        entityType,
        entityId,
        // If not including replies, only get top-level comments
        parentId: includeReplies ? undefined : null,
      },
    })
  }

  /**
   * Get comment statistics for an entity
   */
  async getCommentStatistics(
    tenantId: string,
    entityType?: string,
    entityId?: string
  ): Promise<{ total: number; topLevel: number; replies: number }> {
    const allComments = await metadataRepository.listComments(tenantId, {
      page: 1,
      limit: 1,
      filters: {
        entityType,
        entityId,
      },
    })

    const topLevelComments = await metadataRepository.listComments(tenantId, {
      page: 1,
      limit: 1,
      filters: {
        entityType,
        entityId,
        parentId: null,
      },
    })

    return {
      total: allComments.total,
      topLevel: topLevelComments.total,
      replies: allComments.total - topLevelComments.total,
    }
  }
}

// =====================================================
// TAG SERVICE
// =====================================================

export class TagService {
  /**
   * Create a new tag
   */
  async createTag(tenantId: string, data: CreateTagInput): Promise<Tag> {
    // Check if tag with same name already exists
    const existingTag = await metadataRepository.findTagByName(data.name!, tenantId)
    if (existingTag) {
      throw new ValidationError(`Tag with name "${data.name}" already exists`)
    }

    // Validate color format if provided
    if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
      throw new ValidationError('Invalid color format. Use hex format like #3B82F6')
    }

    // Repository will generate slug from name
    const tag = await metadataRepository.createTag(tenantId, data)

    return tag
  }

  /**
   * Get tag by ID
   */
  async getTagById(id: string, tenantId: string): Promise<Tag> {
    const tag = await metadataRepository.findTagById(id, tenantId)
    if (!tag) {
      throw new NotFoundError('Tag not found')
    }
    return tag
  }

  /**
   * Get tag by name
   */
  async getTagByName(name: string, tenantId: string): Promise<Tag | null> {
    return metadataRepository.findTagByName(name, tenantId)
  }

  /**
   * List tags with pagination and filtering
   */
  async listTags(tenantId: string, options: TagListOptions): Promise<TagListResult> {
    return metadataRepository.listTags(tenantId, options)
  }

  /**
   * Update a tag
   */
  async updateTag(id: string, tenantId: string, data: UpdateTagInput): Promise<Tag> {
    // Verify tag exists
    const existingTag = await this.getTagById(id, tenantId)

    // If name is being updated, regenerate slug and check for duplicates
    if (data.name) {
      const newSlug = slugify(data.name)

      // Check if another tag with this name exists
      const duplicateTag = await metadataRepository.findTagByName(data.name, tenantId)
      if (duplicateTag && duplicateTag.id !== id) {
        throw new ValidationError(`Tag with name "${data.name}" already exists`)
      }

      // Validate color format if provided
      if (data.color && !/^#[0-9A-Fa-f]{6}$/.test(data.color)) {
        throw new ValidationError('Invalid color format. Use hex format like #3B82F6')
      }

      const tag = await metadataRepository.updateTag(id, tenantId, {
        ...data,
        slug: newSlug,
      })

      return tag
    }

    const tag = await metadataRepository.updateTag(id, tenantId, data)
    return tag
  }

  /**
   * Delete a tag (soft delete)
   */
  async deleteTag(id: string, tenantId: string): Promise<void> {
    // Verify tag exists
    await this.getTagById(id, tenantId)

    await metadataRepository.deleteTag(id, tenantId)
  }

  /**
   * Assign a tag to an entity
   */
  async assignTag(tenantId: string, data: AssignTagInput): Promise<EntityTag> {
    // Verify tag exists
    await this.getTagById(data.tagId, tenantId)

    // Check if tag is already assigned
    const existingTags = await metadataRepository.getEntityTags(
      tenantId,
      data.entityType,
      data.entityId
    )

    const alreadyAssigned = existingTags.some((tag) => tag.id === data.tagId)
    if (alreadyAssigned) {
      throw new ValidationError('Tag is already assigned to this entity')
    }

    return metadataRepository.assignTag(tenantId, data)
  }

  /**
   * Unassign a tag from an entity
   */
  async unassignTag(
    tenantId: string,
    entityType: string,
    entityId: string,
    tagId: string
  ): Promise<void> {
    // Verify tag exists
    await this.getTagById(tagId, tenantId)

    await metadataRepository.unassignTag(tenantId, entityType, entityId, tagId)
  }

  /**
   * Get all tags assigned to an entity
   */
  async getEntityTags(tenantId: string, entityType: string, entityId: string): Promise<Tag[]> {
    return metadataRepository.getEntityTags(tenantId, entityType, entityId)
  }

  /**
   * Get tag statistics
   */
  async getTagStatistics(
    tenantId: string
  ): Promise<{ total: number; mostUsed: Tag[]; byCategory: Record<string, number> }> {
    const allTags = await metadataRepository.listTags(tenantId, {
      page: 1,
      limit: 1000,
      sortBy: 'usageCount',
      sortOrder: 'desc',
    })

    // Get top 10 most used tags
    const mostUsed = allTags.items.slice(0, 10)

    // Group by category
    const byCategory: Record<string, number> = {}
    for (const tag of allTags.items) {
      const category = tag.category || 'uncategorized'
      byCategory[category] = (byCategory[category] || 0) + 1
    }

    return {
      total: allTags.total,
      mostUsed,
      byCategory,
    }
  }
}

// =====================================================
// CUSTOM FIELD SERVICE
// =====================================================

export class CustomFieldService {
  /**
   * Create a new custom field definition
   */
  async createCustomField(tenantId: string, data: CreateCustomFieldInput): Promise<CustomField> {
    // Validate field name format (lowercase, starts with letter, only letters/numbers/underscores)
    if (!/^[a-z][a-z0-9_]*$/.test(data.fieldName)) {
      throw new ValidationError(
        'Field name must be lowercase, start with a letter, and contain only letters, numbers, and underscores'
      )
    }

    // Check if field with same name already exists for this entity type
    const existingFields = await metadataRepository.listCustomFields(tenantId, {
      page: 1,
      limit: 1,
      filters: {
        entityType: data.entityType,
      },
    })

    const duplicate = existingFields.items.find((f) => f.fieldName === data.fieldName)
    if (duplicate) {
      throw new ValidationError(
        `Custom field "${data.fieldName}" already exists for ${data.entityType}`
      )
    }

    // Validate field options for select/multiselect types
    if (
      (data.fieldType === CustomFieldType.SELECT ||
        data.fieldType === CustomFieldType.MULTISELECT) &&
      (!data.fieldOptions || !Array.isArray(data.fieldOptions) || data.fieldOptions.length === 0)
    ) {
      throw new ValidationError('Select and multiselect fields require at least one option')
    }

    // Validate default value matches field type
    if (data.defaultValue) {
      this.validateFieldValue(data.fieldType, data.defaultValue, data.fieldOptions)
    }

    const customField = await metadataRepository.createCustomField(tenantId, data)
    return customField
  }

  /**
   * Get custom field by ID
   */
  async getCustomFieldById(id: string, tenantId: string): Promise<CustomField> {
    const customField = await metadataRepository.findCustomFieldById(id, tenantId)
    if (!customField) {
      throw new NotFoundError('Custom field not found')
    }
    return customField
  }

  /**
   * List custom fields with pagination and filtering
   */
  async listCustomFields(
    tenantId: string,
    options: CustomFieldListOptions
  ): Promise<CustomFieldListResult> {
    return metadataRepository.listCustomFields(tenantId, options)
  }

  /**
   * Update a custom field definition
   */
  async updateCustomField(
    id: string,
    tenantId: string,
    data: UpdateCustomFieldInput
  ): Promise<CustomField> {
    // Verify custom field exists
    const existingField = await this.getCustomFieldById(id, tenantId)

    // Cannot change field name or type after creation
    // This prevents breaking existing data

    // Validate field options for select/multiselect types
    if (
      (existingField.fieldType === CustomFieldType.SELECT ||
        existingField.fieldType === CustomFieldType.MULTISELECT) &&
      data.fieldOptions &&
      (!Array.isArray(data.fieldOptions) || data.fieldOptions.length === 0)
    ) {
      throw new ValidationError('Select and multiselect fields require at least one option')
    }

    // Validate default value if provided
    if (data.defaultValue !== undefined) {
      this.validateFieldValue(
        existingField.fieldType,
        data.defaultValue,
        data.fieldOptions || existingField.fieldOptions
      )
    }

    const customField = await metadataRepository.updateCustomField(id, tenantId, data)
    return customField
  }

  /**
   * Delete a custom field definition (soft delete)
   */
  async deleteCustomField(id: string, tenantId: string): Promise<void> {
    // Verify custom field exists
    await this.getCustomFieldById(id, tenantId)

    await metadataRepository.deleteCustomField(id, tenantId)
  }

  /**
   * Set a custom field value for an entity
   */
  async setCustomFieldValue(
    tenantId: string,
    data: SetCustomFieldValueInput
  ): Promise<CustomFieldValue> {
    // Verify custom field exists and is for the correct entity type
    const customField = await this.getCustomFieldById(data.fieldId, tenantId)

    if (customField.entityType !== data.entityType) {
      throw new ValidationError(
        `Custom field is not valid for entity type "${data.entityType}"`
      )
    }

    // Validate value if provided
    if (data.value !== null && data.value !== undefined) {
      this.validateFieldValue(customField.fieldType, data.value, customField.fieldOptions)

      // Check required validation
      if (customField.isRequired && (!data.value || data.value.trim().length === 0)) {
        throw new ValidationError(`Field "${customField.fieldLabel}" is required`)
      }

      // Apply validation rules if present
      if (customField.validationRules) {
        this.applyValidationRules(data.value, customField.validationRules, customField.fieldLabel)
      }
    } else if (customField.isRequired) {
      throw new ValidationError(`Field "${customField.fieldLabel}" is required`)
    }

    return metadataRepository.setCustomFieldValue(tenantId, data)
  }

  /**
   * Get all custom field values for an entity
   */
  async getCustomFieldValues(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<CustomFieldValue[]> {
    return metadataRepository.getCustomFieldValues(tenantId, entityType, entityId)
  }

  /**
   * Get custom fields with values for an entity
   */
  async getCustomFieldsWithValues(
    tenantId: string,
    entityType: string,
    entityId: string
  ): Promise<Array<CustomField & { value?: string | null }>> {
    // Get all custom fields for this entity type
    const fields = await metadataRepository.listCustomFields(tenantId, {
      page: 1,
      limit: 1000,
      sortBy: 'displayOrder',
      sortOrder: 'asc',
      filters: {
        entityType,
        isVisible: true,
      },
    })

    // Get all values for this entity
    const values = await metadataRepository.getCustomFieldValues(tenantId, entityType, entityId)

    // Merge fields with values
    const fieldsWithValues = fields.items.map((field) => {
      const value = values.find((v) => v.fieldId === field.id)
      return {
        ...field,
        value: value?.value || null,
      }
    })

    return fieldsWithValues
  }

  /**
   * Validate field value matches field type
   */
  private validateFieldValue(
    fieldType: CustomFieldType,
    value: string,
    fieldOptions?: any
  ): void {
    switch (fieldType) {
      case CustomFieldType.NUMBER:
      case CustomFieldType.CURRENCY:
        if (isNaN(Number(value))) {
          throw new ValidationError('Value must be a valid number')
        }
        break

      case CustomFieldType.DATE:
      case CustomFieldType.DATETIME:
        if (isNaN(Date.parse(value))) {
          throw new ValidationError('Value must be a valid date')
        }
        break

      case CustomFieldType.BOOLEAN:
        if (value !== 'true' && value !== 'false' && value !== '1' && value !== '0') {
          throw new ValidationError('Value must be a boolean (true/false)')
        }
        break

      case CustomFieldType.EMAIL:
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(value)) {
          throw new ValidationError('Value must be a valid email address')
        }
        break

      case CustomFieldType.URL:
        try {
          new URL(value)
        } catch {
          throw new ValidationError('Value must be a valid URL')
        }
        break

      case CustomFieldType.PHONE:
        // Basic phone validation (can be enhanced)
        const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/
        if (!phoneRegex.test(value.replace(/\s/g, ''))) {
          throw new ValidationError('Value must be a valid phone number')
        }
        break

      case CustomFieldType.SELECT:
        if (fieldOptions && !fieldOptions.includes(value)) {
          throw new ValidationError(`Value must be one of: ${fieldOptions.join(', ')}`)
        }
        break

      case CustomFieldType.MULTISELECT:
        try {
          const values = JSON.parse(value)
          if (!Array.isArray(values)) {
            throw new Error()
          }
          if (fieldOptions) {
            const invalidValues = values.filter((v: string) => !fieldOptions.includes(v))
            if (invalidValues.length > 0) {
              throw new ValidationError(
                `Invalid values: ${invalidValues.join(', ')}. Must be one of: ${fieldOptions.join(', ')}`
              )
            }
          }
        } catch {
          throw new ValidationError('Multiselect value must be a JSON array')
        }
        break
    }
  }

  /**
   * Apply validation rules to a field value
   */
  private applyValidationRules(value: string, rules: any, fieldLabel: string): void {
    if (!rules || typeof rules !== 'object') return

    // Min/max for numbers
    if (rules.min !== undefined) {
      const numValue = Number(value)
      if (!isNaN(numValue) && numValue < rules.min) {
        throw new ValidationError(`${fieldLabel} must be at least ${rules.min}`)
      }
    }

    if (rules.max !== undefined) {
      const numValue = Number(value)
      if (!isNaN(numValue) && numValue > rules.max) {
        throw new ValidationError(`${fieldLabel} must be at most ${rules.max}`)
      }
    }

    // Min/max length for strings
    if (rules.minLength !== undefined && value.length < rules.minLength) {
      throw new ValidationError(`${fieldLabel} must be at least ${rules.minLength} characters`)
    }

    if (rules.maxLength !== undefined && value.length > rules.maxLength) {
      throw new ValidationError(`${fieldLabel} must be at most ${rules.maxLength} characters`)
    }

    // Pattern matching
    if (rules.pattern) {
      const regex = new RegExp(rules.pattern)
      if (!regex.test(value)) {
        throw new ValidationError(
          `${fieldLabel} does not match the required format${rules.patternMessage ? ': ' + rules.patternMessage : ''}`
        )
      }
    }
  }
}

// =====================================================
// EXPORT SERVICE INSTANCES
// =====================================================

export const noteService = new NoteService()
export const commentService = new CommentService()
export const tagService = new TagService()
export const customFieldService = new CustomFieldService()
