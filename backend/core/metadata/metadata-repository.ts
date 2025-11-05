/**
 * Metadata Repository
 * Data access layer for notes, tags, comments, and custom fields
 */

import { Pool } from 'pg'
import { getPool } from '../../database/postgresql/pool'
import {
  Note,
  NoteWithCreator,
  Comment,
  CommentWithAuthor,
  Tag,
  EntityTag,
  CustomField,
  CustomFieldValue,
  CreateNoteInput,
  UpdateNoteInput,
  CreateCommentInput,
  UpdateCommentInput,
  CreateTagInput,
  UpdateTagInput,
  AssignTagInput,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  SetCustomFieldValueInput,
  NoteListOptions,
  NoteListResult,
  CommentListOptions,
  CommentListResult,
  TagListOptions,
  TagListResult,
  CustomFieldListOptions,
  CustomFieldListResult,
} from './metadata-types'
import { slugify } from './metadata-validators'

export class MetadataRepository {
  private pool: Pool

  constructor() {
    this.pool = getPool()
  }

  // =====================================================
  // NOTE OPERATIONS
  // =====================================================

  async createNote(tenantId: string, userId: string, data: CreateNoteInput): Promise<Note> {
    const result = await this.pool.query<Note>(
      `INSERT INTO notes (
        tenant_id, title, content, is_pinned,
        entity_type, entity_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        tenantId,
        data.title || null,
        data.content,
        data.isPinned || false,
        data.entityType,
        data.entityId,
        userId,
      ]
    )

    return this.mapNote(result.rows[0])
  }

  async findNoteById(id: string, tenantId: string): Promise<Note | null> {
    const result = await this.pool.query<Note>(
      `SELECT * FROM notes WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] ? this.mapNote(result.rows[0]) : null
  }

  async listNotes(tenantId: string, options: NoteListOptions): Promise<NoteListResult> {
    const { page, limit, sortBy, sortOrder, filters } = options
    const offset = (page - 1) * limit

    let whereConditions: string[] = ['n.tenant_id = $1', 'n.deleted_at IS NULL']
    let params: any[] = [tenantId]
    let paramIndex = 2

    if (filters) {
      if (filters.search) {
        whereConditions.push(`(n.title ILIKE $${paramIndex} OR n.content ILIKE $${paramIndex})`)
        params.push(`%${filters.search}%`)
        paramIndex++
      }

      if (filters.entityType) {
        whereConditions.push(`n.entity_type = $${paramIndex}`)
        params.push(filters.entityType)
        paramIndex++
      }

      if (filters.entityId) {
        whereConditions.push(`n.entity_id = $${paramIndex}`)
        params.push(filters.entityId)
        paramIndex++
      }

      if (filters.createdBy) {
        whereConditions.push(`n.created_by = $${paramIndex}`)
        params.push(filters.createdBy)
        paramIndex++
      }

      if (filters.isPinned !== undefined) {
        whereConditions.push(`n.is_pinned = $${paramIndex}`)
        params.push(filters.isPinned)
        paramIndex++
      }
    }

    const whereClause = whereConditions.join(' AND ')

    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM notes n WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    const dataResult = await this.pool.query<Note>(
      `SELECT n.* FROM notes n
       WHERE ${whereClause}
       ORDER BY n.${this.sanitizeSortBy(sortBy)} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    return {
      notes: dataResult.rows.map((row) => this.mapNote(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async updateNote(id: string, tenantId: string, userId: string, data: UpdateNoteInput): Promise<Note> {
    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        const snakeKey = this.camelToSnake(key)
        fields.push(`${snakeKey} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    fields.push(`updated_by = $${paramIndex}`)
    params.push(userId)
    paramIndex++

    params.push(id, tenantId)

    const result = await this.pool.query<Note>(
      `UPDATE notes SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      throw new Error('Note not found')
    }

    return this.mapNote(result.rows[0])
  }

  async deleteNote(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE notes SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )
  }

  async bulkDeleteNotes(ids: string[], tenantId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE notes SET deleted_at = NOW()
       WHERE id = ANY($1::uuid[]) AND tenant_id = $2 AND deleted_at IS NULL`,
      [ids, tenantId]
    )
    return result.rowCount || 0
  }

  async searchNotes(tenantId: string, query: string, limit: number): Promise<Note[]> {
    const result = await this.pool.query<Note>(
      `SELECT * FROM notes
       WHERE tenant_id = $1
         AND deleted_at IS NULL
         AND to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))
         @@ plainto_tsquery('english', $2)
       ORDER BY created_at DESC
       LIMIT $3`,
      [tenantId, query, limit]
    )

    return result.rows.map((row) => this.mapNote(row))
  }

  // =====================================================
  // COMMENT OPERATIONS
  // =====================================================

  async createComment(tenantId: string, userId: string, data: CreateCommentInput): Promise<Comment> {
    const result = await this.pool.query<Comment>(
      `INSERT INTO comments (
        tenant_id, content, entity_type, entity_id, parent_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        tenantId,
        data.content,
        data.entityType,
        data.entityId,
        data.parentId || null,
        userId,
      ]
    )

    return this.mapComment(result.rows[0])
  }

  async findCommentById(id: string, tenantId: string): Promise<Comment | null> {
    const result = await this.pool.query<Comment>(
      `SELECT * FROM comments WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] ? this.mapComment(result.rows[0]) : null
  }

  async listComments(tenantId: string, options: CommentListOptions): Promise<CommentListResult> {
    const { page, limit, sortBy, sortOrder, filters } = options
    const offset = (page - 1) * limit

    let whereConditions: string[] = ['c.tenant_id = $1', 'c.deleted_at IS NULL']
    let params: any[] = [tenantId]
    let paramIndex = 2

    if (filters) {
      if (filters.search) {
        whereConditions.push(`c.content ILIKE $${paramIndex}`)
        params.push(`%${filters.search}%`)
        paramIndex++
      }

      if (filters.entityType) {
        whereConditions.push(`c.entity_type = $${paramIndex}`)
        params.push(filters.entityType)
        paramIndex++
      }

      if (filters.entityId) {
        whereConditions.push(`c.entity_id = $${paramIndex}`)
        params.push(filters.entityId)
        paramIndex++
      }

      if (filters.parentId !== undefined) {
        if (filters.parentId === null) {
          whereConditions.push(`c.parent_id IS NULL`)
        } else {
          whereConditions.push(`c.parent_id = $${paramIndex}`)
          params.push(filters.parentId)
          paramIndex++
        }
      }
    }

    const whereClause = whereConditions.join(' AND ')

    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM comments c WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    const dataResult = await this.pool.query<Comment>(
      `SELECT c.* FROM comments c
       WHERE ${whereClause}
       ORDER BY c.${this.sanitizeSortBy(sortBy)} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    return {
      comments: dataResult.rows.map((row) => this.mapComment(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async updateComment(id: string, tenantId: string, userId: string, data: UpdateCommentInput): Promise<Comment> {
    const result = await this.pool.query<Comment>(
      `UPDATE comments
       SET content = $1, updated_by = $2
       WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL
       RETURNING *`,
      [data.content, userId, id, tenantId]
    )

    if (result.rows.length === 0) {
      throw new Error('Comment not found')
    }

    return this.mapComment(result.rows[0])
  }

  async deleteComment(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE comments SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )
  }

  // =====================================================
  // TAG OPERATIONS
  // =====================================================

  async createTag(tenantId: string, data: CreateTagInput): Promise<Tag> {
    const slug = slugify(data.name)

    const result = await this.pool.query<Tag>(
      `INSERT INTO tags (
        tenant_id, name, slug, description, color, category
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *`,
      [
        tenantId,
        data.name,
        slug,
        data.description || null,
        data.color || '#3B82F6',
        data.category || null,
      ]
    )

    return this.mapTag(result.rows[0])
  }

  async findTagById(id: string, tenantId: string): Promise<Tag | null> {
    const result = await this.pool.query<Tag>(
      `SELECT * FROM tags WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] ? this.mapTag(result.rows[0]) : null
  }

  async findTagByName(name: string, tenantId: string): Promise<Tag | null> {
    const result = await this.pool.query<Tag>(
      `SELECT * FROM tags WHERE name = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [name, tenantId]
    )

    return result.rows[0] ? this.mapTag(result.rows[0]) : null
  }

  async listTags(tenantId: string, options: TagListOptions): Promise<TagListResult> {
    const { page, limit, sortBy, sortOrder, filters } = options
    const offset = (page - 1) * limit

    let whereConditions: string[] = ['t.tenant_id = $1', 't.deleted_at IS NULL']
    let params: any[] = [tenantId]
    let paramIndex = 2

    if (filters) {
      if (filters.search) {
        whereConditions.push(`(t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`)
        params.push(`%${filters.search}%`)
        paramIndex++
      }

      if (filters.category) {
        whereConditions.push(`t.category = $${paramIndex}`)
        params.push(filters.category)
        paramIndex++
      }
    }

    const whereClause = whereConditions.join(' AND ')

    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM tags t WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    const dataResult = await this.pool.query<Tag>(
      `SELECT t.* FROM tags t
       WHERE ${whereClause}
       ORDER BY t.${this.sanitizeSortBy(sortBy)} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    return {
      tags: dataResult.rows.map((row) => this.mapTag(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async updateTag(id: string, tenantId: string, data: UpdateTagInput): Promise<Tag> {
    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'name') {
          fields.push(`name = $${paramIndex}`)
          params.push(value)
          paramIndex++
          fields.push(`slug = $${paramIndex}`)
          params.push(slugify(value as string))
          paramIndex++
        } else {
          const snakeKey = this.camelToSnake(key)
          fields.push(`${snakeKey} = $${paramIndex}`)
          params.push(value)
          paramIndex++
        }
      }
    })

    params.push(id, tenantId)

    const result = await this.pool.query<Tag>(
      `UPDATE tags SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING *`,
      params
    )

    if (result.rows.length === 0) {
      throw new Error('Tag not found')
    }

    return this.mapTag(result.rows[0])
  }

  async deleteTag(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE tags SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    )
  }

  async assignTag(tenantId: string, data: AssignTagInput): Promise<EntityTag> {
    const result = await this.pool.query<EntityTag>(
      `INSERT INTO entity_tags (tenant_id, entity_type, entity_id, tag_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (tenant_id, entity_type, entity_id, tag_id) DO NOTHING
       RETURNING *`,
      [tenantId, data.entityType, data.entityId, data.tagId]
    )

    return this.mapEntityTag(result.rows[0])
  }

  async unassignTag(tenantId: string, entityType: string, entityId: string, tagId: string): Promise<void> {
    await this.pool.query(
      `DELETE FROM entity_tags
       WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3 AND tag_id = $4`,
      [tenantId, entityType, entityId, tagId]
    )
  }

  async getEntityTags(tenantId: string, entityType: string, entityId: string): Promise<Tag[]> {
    const result = await this.pool.query<Tag>(
      `SELECT t.* FROM tags t
       INNER JOIN entity_tags et ON t.id = et.tag_id
       WHERE et.tenant_id = $1 AND et.entity_type = $2 AND et.entity_id = $3
         AND t.deleted_at IS NULL
       ORDER BY t.name ASC`,
      [tenantId, entityType, entityId]
    )

    return result.rows.map((row) => this.mapTag(row))
  }

  // =====================================================
  // CUSTOM FIELD OPERATIONS
  // =====================================================

  async createCustomField(tenantId: string, data: CreateCustomFieldInput): Promise<CustomField> {
    const result = await this.pool.query<CustomField>(
      `INSERT INTO custom_fields (
        tenant_id, entity_type, field_name, field_label, field_type,
        field_options, default_value, is_required, is_searchable, is_visible,
        validation_rules, display_order, help_text, placeholder_text
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        tenantId,
        data.entityType,
        data.fieldName,
        data.fieldLabel,
        data.fieldType,
        data.fieldOptions ? JSON.stringify(data.fieldOptions) : null,
        data.defaultValue || null,
        data.isRequired || false,
        data.isSearchable || false,
        data.isVisible !== undefined ? data.isVisible : true,
        data.validationRules ? JSON.stringify(data.validationRules) : null,
        data.displayOrder || 0,
        data.helpText || null,
        data.placeholderText || null,
      ]
    )

    return this.mapCustomField(result.rows[0])
  }

  async findCustomFieldById(id: string, tenantId: string): Promise<CustomField | null> {
    const result = await this.pool.query<CustomField>(
      `SELECT * FROM custom_fields WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] ? this.mapCustomField(result.rows[0]) : null
  }

  async listCustomFields(tenantId: string, options: CustomFieldListOptions): Promise<CustomFieldListResult> {
    const { page, limit, sortBy, sortOrder, filters } = options
    const offset = (page - 1) * limit

    let whereConditions: string[] = ['cf.tenant_id = $1', 'cf.deleted_at IS NULL']
    let params: any[] = [tenantId]
    let paramIndex = 2

    if (filters) {
      if (filters.entityType) {
        whereConditions.push(`cf.entity_type = $${paramIndex}`)
        params.push(filters.entityType)
        paramIndex++
      }

      if (filters.isVisible !== undefined) {
        whereConditions.push(`cf.is_visible = $${paramIndex}`)
        params.push(filters.isVisible)
        paramIndex++
      }
    }

    const whereClause = whereConditions.join(' AND ')

    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM custom_fields cf WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    const dataResult = await this.pool.query<CustomField>(
      `SELECT cf.* FROM custom_fields cf
       WHERE ${whereClause}
       ORDER BY cf.${this.sanitizeSortBy(sortBy)} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    return {
      customFields: dataResult.rows.map((row) => this.mapCustomField(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  async setCustomFieldValue(tenantId: string, data: SetCustomFieldValueInput): Promise<CustomFieldValue> {
    const result = await this.pool.query<CustomFieldValue>(
      `INSERT INTO custom_field_values (tenant_id, entity_type, entity_id, field_id, value)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (tenant_id, entity_type, entity_id, field_id)
       DO UPDATE SET value = EXCLUDED.value
       RETURNING *`,
      [tenantId, data.entityType, data.entityId, data.fieldId, data.value]
    )

    return this.mapCustomFieldValue(result.rows[0])
  }

  async getCustomFieldValues(tenantId: string, entityType: string, entityId: string): Promise<CustomFieldValue[]> {
    const result = await this.pool.query<CustomFieldValue>(
      `SELECT * FROM custom_field_values
       WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3`,
      [tenantId, entityType, entityId]
    )

    return result.rows.map((row) => this.mapCustomFieldValue(row))
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  private mapNote(row: any): Note {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      title: row.title,
      content: row.content,
      isPinned: row.is_pinned,
      entityType: row.entity_type,
      entityId: row.entity_id,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }

  private mapComment(row: any): Comment {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      content: row.content,
      entityType: row.entity_type,
      entityId: row.entity_id,
      parentId: row.parent_id,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      isEdited: row.is_edited,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }

  private mapTag(row: any): Tag {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      color: row.color,
      category: row.category,
      usageCount: row.usage_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }

  private mapEntityTag(row: any): EntityTag {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      tagId: row.tag_id,
      createdAt: row.created_at,
    }
  }

  private mapCustomField(row: any): CustomField {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      fieldName: row.field_name,
      fieldLabel: row.field_label,
      fieldType: row.field_type,
      fieldOptions: row.field_options ? JSON.parse(row.field_options) : null,
      defaultValue: row.default_value,
      isRequired: row.is_required,
      isSearchable: row.is_searchable,
      isVisible: row.is_visible,
      validationRules: row.validation_rules ? JSON.parse(row.validation_rules) : null,
      displayOrder: row.display_order,
      helpText: row.help_text,
      placeholderText: row.placeholder_text,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    }
  }

  private mapCustomFieldValue(row: any): CustomFieldValue {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      fieldId: row.field_id,
      value: row.value,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }
  }

  private camelToSnake(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
  }

  private sanitizeSortBy(sortBy: string): string {
    const allowedFields = [
      'created_at',
      'updated_at',
      'name',
      'title',
      'display_order',
      'usage_count',
    ]
    const snakeCase = this.camelToSnake(sortBy)
    return allowedFields.includes(snakeCase) ? snakeCase : 'created_at'
  }
}

// Export singleton instance
export const metadataRepository = new MetadataRepository()
