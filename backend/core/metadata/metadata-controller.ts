/**
 * Metadata Controller
 * HTTP handlers for notes, tags, comments, and custom fields
 */

import type { Response, NextFunction } from 'express'
import type { AuthRequest } from '../../middleware/auth'
import { noteService, commentService, tagService, customFieldService } from './metadata-service'
import {
  createNoteSchema,
  updateNoteSchema,
  noteListOptionsSchema,
  bulkNoteOperationSchema,
  createCommentSchema,
  updateCommentSchema,
  commentListOptionsSchema,
  createTagSchema,
  updateTagSchema,
  assignTagSchema,
  tagListOptionsSchema,
  createCustomFieldSchema,
  updateCustomFieldSchema,
  setCustomFieldValueSchema,
  customFieldListOptionsSchema,
  searchQuerySchema,
  entityNotesQuerySchema,
  entityCommentsQuerySchema,
  entityTagsQuerySchema,
  entityCustomFieldsQuerySchema,
} from './metadata-validators'
import {
  UpdateCommentInput,
  AssignTagInput,
  SetCustomFieldValueInput,
} from './metadata-types'
import { ValidationError } from '../../utils/errors'

// =====================================================
// NOTE CONTROLLER
// =====================================================

export class NoteController {
  /**
   * Create a new note
   * POST /api/v1/notes
   */
  async createNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const userId = req.user!.userId

      const validated = createNoteSchema.parse(req.body)
      const note = await noteService.createNote(tenantId, userId, validated)

      res.status(201).json({
        success: true,
        data: note,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get note by ID
   * GET /api/v1/notes/:id
   */
  async getNoteById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      const note = await noteService.getNoteById(id, tenantId)

      res.json({
        success: true,
        data: note,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * List notes with pagination and filtering
   * GET /api/v1/notes
   */
  async listNotes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const options = noteListOptionsSchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
        filters: {
          search: req.query.search as string | undefined,
          entityType: req.query.entityType as string | undefined,
          entityId: req.query.entityId as string | undefined,
          createdBy: req.query.createdBy as string | undefined,
          isPinned: req.query.isPinned === 'true' ? true : req.query.isPinned === 'false' ? false : undefined,
        },
      })

      const result = await noteService.listNotes(tenantId, options)

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update a note
   * PUT /api/v1/notes/:id
   */
  async updateNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const userId = req.user!.userId
      const { id } = req.params

      const validated = updateNoteSchema.parse(req.body)
      const note = await noteService.updateNote(id, tenantId, userId, validated)

      res.json({
        success: true,
        data: note,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete a note
   * DELETE /api/v1/notes/:id
   */
  async deleteNote(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      await noteService.deleteNote(id, tenantId)

      res.json({
        success: true,
        message: 'Note deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Search notes
   * GET /api/v1/notes/search
   */
  async searchNotes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = searchQuerySchema.parse({
        q: req.query.q,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      })

      const notes = await noteService.searchNotes(tenantId, validated.q, validated.limit)

      res.json({
        success: true,
        data: notes,
        count: notes.length,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Bulk operations on notes
   * POST /api/v1/notes/bulk
   */
  async bulkNoteOperation(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = bulkNoteOperationSchema.parse(req.body)
      let count = 0

      switch (validated.operation) {
        case 'delete':
          count = await noteService.bulkDeleteNotes(validated.noteIds, tenantId)
          break
        case 'pin':
          count = await noteService.bulkPinNotes(validated.noteIds, tenantId, true)
          break
        case 'unpin':
          count = await noteService.bulkPinNotes(validated.noteIds, tenantId, false)
          break
      }

      res.json({
        success: true,
        message: `${validated.operation} operation completed`,
        count,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get notes for a specific entity
   * GET /api/v1/notes/entity
   */
  async getEntityNotes(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = entityNotesQuerySchema.parse({
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
      })

      const result = await noteService.getEntityNotes(
        tenantId,
        validated.entityType,
        validated.entityId,
        validated.page,
        validated.limit
      )

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get note statistics
   * GET /api/v1/notes/statistics
   */
  async getNoteStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const entityType = req.query.entityType as string | undefined
      const entityId = req.query.entityId as string | undefined

      const statistics = await noteService.getNoteStatistics(tenantId, entityType, entityId)

      res.json({
        success: true,
        data: statistics,
      })
    } catch (error) {
      next(error)
    }
  }
}

// =====================================================
// COMMENT CONTROLLER
// =====================================================

export class CommentController {
  /**
   * Create a new comment
   * POST /api/v1/comments
   */
  async createComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const userId = req.user!.userId

      const validated = createCommentSchema.parse(req.body)
      const comment = await commentService.createComment(tenantId, userId, validated)

      res.status(201).json({
        success: true,
        data: comment,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get comment by ID
   * GET /api/v1/comments/:id
   */
  async getCommentById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      const comment = await commentService.getCommentById(id, tenantId)

      res.json({
        success: true,
        data: comment,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * List comments with pagination and filtering
   * GET /api/v1/comments
   */
  async listComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const options = commentListOptionsSchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy || 'createdAt',
        sortOrder: req.query.sortOrder || 'desc',
        filters: {
          search: req.query.search as string | undefined,
          entityType: req.query.entityType as string | undefined,
          entityId: req.query.entityId as string | undefined,
          createdBy: req.query.createdBy as string | undefined,
          parentId: req.query.parentId === 'null' ? null : (req.query.parentId as string | undefined),
        },
      })

      const result = await commentService.listComments(tenantId, options)

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update a comment
   * PUT /api/v1/comments/:id
   */
  async updateComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const userId = req.user!.userId
      const { id } = req.params

      const validated = updateCommentSchema.parse(req.body) as UpdateCommentInput
      const comment = await commentService.updateComment(id, tenantId, userId, validated)

      res.json({
        success: true,
        data: comment,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete a comment
   * DELETE /api/v1/comments/:id
   */
  async deleteComment(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const userId = req.user!.userId
      const { id } = req.params

      await commentService.deleteComment(id, tenantId, userId)

      res.json({
        success: true,
        message: 'Comment deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get comments for a specific entity
   * GET /api/v1/comments/entity
   */
  async getEntityComments(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = entityCommentsQuerySchema.parse({
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        includeReplies: req.query.includeReplies === 'false' ? false : true,
      })

      const result = await commentService.getEntityComments(
        tenantId,
        validated.entityType,
        validated.entityId,
        validated.page,
        validated.limit,
        validated.includeReplies
      )

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get comment statistics
   * GET /api/v1/comments/statistics
   */
  async getCommentStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const entityType = req.query.entityType as string | undefined
      const entityId = req.query.entityId as string | undefined

      const statistics = await commentService.getCommentStatistics(tenantId, entityType, entityId)

      res.json({
        success: true,
        data: statistics,
      })
    } catch (error) {
      next(error)
    }
  }
}

// =====================================================
// TAG CONTROLLER
// =====================================================

export class TagController {
  /**
   * Create a new tag
   * POST /api/v1/tags
   */
  async createTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = createTagSchema.parse(req.body)
      const tag = await tagService.createTag(tenantId, validated)

      res.status(201).json({
        success: true,
        data: tag,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get tag by ID
   * GET /api/v1/tags/:id
   */
  async getTagById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      const tag = await tagService.getTagById(id, tenantId)

      res.json({
        success: true,
        data: tag,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * List tags with pagination and filtering
   * GET /api/v1/tags
   */
  async listTags(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const options = tagListOptionsSchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy || 'name',
        sortOrder: req.query.sortOrder || 'asc',
        filters: {
          search: req.query.search as string | undefined,
          category: req.query.category as string | undefined,
        },
      })

      const result = await tagService.listTags(tenantId, options)

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update a tag
   * PUT /api/v1/tags/:id
   */
  async updateTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      const validated = updateTagSchema.parse(req.body)
      const tag = await tagService.updateTag(id, tenantId, validated)

      res.json({
        success: true,
        data: tag,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete a tag
   * DELETE /api/v1/tags/:id
   */
  async deleteTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      await tagService.deleteTag(id, tenantId)

      res.json({
        success: true,
        message: 'Tag deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Assign a tag to an entity
   * POST /api/v1/tags/assign
   */
  async assignTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = assignTagSchema.parse(req.body) as AssignTagInput
      const entityTag = await tagService.assignTag(tenantId, validated)

      res.status(201).json({
        success: true,
        data: entityTag,
        message: 'Tag assigned successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Unassign a tag from an entity
   * DELETE /api/v1/tags/unassign
   */
  async unassignTag(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { entityType, entityId, tagId } = req.query

      if (!entityType || !entityId || !tagId) {
        throw new ValidationError('entityType, entityId, and tagId are required')
      }

      await tagService.unassignTag(
        tenantId,
        entityType as string,
        entityId as string,
        tagId as string
      )

      res.json({
        success: true,
        message: 'Tag unassigned successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get tags for a specific entity
   * GET /api/v1/tags/entity
   */
  async getEntityTags(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = entityTagsQuerySchema.parse({
        entityType: req.query.entityType,
        entityId: req.query.entityId,
      })

      const tags = await tagService.getEntityTags(
        tenantId,
        validated.entityType,
        validated.entityId
      )

      res.json({
        success: true,
        data: tags,
        count: tags.length,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get tag statistics
   * GET /api/v1/tags/statistics
   */
  async getTagStatistics(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const statistics = await tagService.getTagStatistics(tenantId)

      res.json({
        success: true,
        data: statistics,
      })
    } catch (error) {
      next(error)
    }
  }
}

// =====================================================
// CUSTOM FIELD CONTROLLER
// =====================================================

export class CustomFieldController {
  /**
   * Create a new custom field definition
   * POST /api/v1/custom-fields
   */
  async createCustomField(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = createCustomFieldSchema.parse(req.body)
      const customField = await customFieldService.createCustomField(tenantId, validated)

      res.status(201).json({
        success: true,
        data: customField,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get custom field by ID
   * GET /api/v1/custom-fields/:id
   */
  async getCustomFieldById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      const customField = await customFieldService.getCustomFieldById(id, tenantId)

      res.json({
        success: true,
        data: customField,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * List custom fields with pagination and filtering
   * GET /api/v1/custom-fields
   */
  async listCustomFields(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const options = customFieldListOptionsSchema.parse({
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        sortBy: req.query.sortBy || 'displayOrder',
        sortOrder: req.query.sortOrder || 'asc',
        filters: {
          entityType: req.query.entityType as string | undefined,
          isVisible: req.query.isVisible === 'true' ? true : req.query.isVisible === 'false' ? false : undefined,
        },
      })

      const result = await customFieldService.listCustomFields(tenantId, options)

      res.json({
        success: true,
        data: result.items,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update a custom field definition
   * PUT /api/v1/custom-fields/:id
   */
  async updateCustomField(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      const validated = updateCustomFieldSchema.parse(req.body)
      const customField = await customFieldService.updateCustomField(id, tenantId, validated)

      res.json({
        success: true,
        data: customField,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Delete a custom field definition
   * DELETE /api/v1/custom-fields/:id
   */
  async deleteCustomField(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId
      const { id } = req.params

      await customFieldService.deleteCustomField(id, tenantId)

      res.json({
        success: true,
        message: 'Custom field deleted successfully',
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Set a custom field value for an entity
   * POST /api/v1/custom-fields/values
   */
  async setCustomFieldValue(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = setCustomFieldValueSchema.parse(req.body) as SetCustomFieldValueInput
      const value = await customFieldService.setCustomFieldValue(tenantId, validated)

      res.json({
        success: true,
        data: value,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get custom field values for an entity
   * GET /api/v1/custom-fields/values
   */
  async getCustomFieldValues(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = entityCustomFieldsQuerySchema.parse({
        entityType: req.query.entityType,
        entityId: req.query.entityId,
      })

      const values = await customFieldService.getCustomFieldValues(
        tenantId,
        validated.entityType,
        validated.entityId
      )

      res.json({
        success: true,
        data: values,
        count: values.length,
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get custom fields with values for an entity
   * GET /api/v1/custom-fields/fields-with-values
   */
  async getCustomFieldsWithValues(
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const tenantId = req.user!.tenantId

      const validated = entityCustomFieldsQuerySchema.parse({
        entityType: req.query.entityType,
        entityId: req.query.entityId,
      })

      const fieldsWithValues = await customFieldService.getCustomFieldsWithValues(
        tenantId,
        validated.entityType,
        validated.entityId
      )

      res.json({
        success: true,
        data: fieldsWithValues,
        count: fieldsWithValues.length,
      })
    } catch (error) {
      next(error)
    }
  }
}

// =====================================================
// EXPORT CONTROLLER INSTANCES
// =====================================================

export const noteController = new NoteController()
export const commentController = new CommentController()
export const tagController = new TagController()
export const customFieldController = new CustomFieldController()
