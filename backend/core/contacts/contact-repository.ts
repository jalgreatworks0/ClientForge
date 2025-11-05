/**
 * Contact Repository
 * Database access layer for contacts
 */

import { Pool, PoolClient } from 'pg'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { logger } from '../../utils/logging/logger'
import {
  Contact,
  ContactFilters,
  ContactListOptions,
  ContactListResponse,
  CreateContactInput,
  UpdateContactInput,
  ContactWithRelations,
} from './contact-types'

export class ContactRepository {
  private pool: Pool

  constructor() {
    this.pool = getPostgresPool()
  }

  /**
   * Create a new contact
   */
  async create(tenantId: string, data: CreateContactInput): Promise<Contact> {
    const result = await this.pool.query<Contact>(
      `INSERT INTO contacts (
        tenant_id, owner_id, account_id, first_name, last_name, email, phone, mobile,
        title, department, lead_source, lead_status, lifecycle_stage, tags,
        address_street, address_city, address_state, address_postal_code, address_country,
        social_linkedin, social_twitter, social_facebook, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING
        id, tenant_id as "tenantId", owner_id as "ownerId", account_id as "accountId",
        first_name as "firstName", last_name as "lastName", email, phone, mobile,
        title, department, lead_source as "leadSource", lead_status as "leadStatus",
        lifecycle_stage as "lifecycleStage", lead_score as "leadScore", tags,
        address_street as "addressStreet", address_city as "addressCity",
        address_state as "addressState", address_postal_code as "addressPostalCode",
        address_country as "addressCountry", social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter", social_facebook as "socialFacebook",
        notes, is_active as "isActive", last_contacted_at as "lastContactedAt",
        created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
      [
        tenantId,
        data.ownerId,
        data.accountId || null,
        data.firstName,
        data.lastName,
        data.email || null,
        data.phone || null,
        data.mobile || null,
        data.title || null,
        data.department || null,
        data.leadSource || null,
        data.leadStatus || 'new',
        data.lifecycleStage || 'lead',
        data.tags || [],
        data.addressStreet || null,
        data.addressCity || null,
        data.addressState || null,
        data.addressPostalCode || null,
        data.addressCountry || null,
        data.socialLinkedin || null,
        data.socialTwitter || null,
        data.socialFacebook || null,
        data.notes || null,
      ]
    )

    logger.info('Contact created', { contactId: result.rows[0].id, tenantId })
    return result.rows[0]
  }

  /**
   * Find contact by ID
   */
  async findById(id: string, tenantId: string): Promise<Contact | null> {
    const result = await this.pool.query<Contact>(
      `SELECT
        id, tenant_id as "tenantId", owner_id as "ownerId", account_id as "accountId",
        first_name as "firstName", last_name as "lastName", email, phone, mobile,
        title, department, lead_source as "leadSource", lead_status as "leadStatus",
        lifecycle_stage as "lifecycleStage", lead_score as "leadScore", tags,
        address_street as "addressStreet", address_city as "addressCity",
        address_state as "addressState", address_postal_code as "addressPostalCode",
        address_country as "addressCountry", social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter", social_facebook as "socialFacebook",
        notes, is_active as "isActive", last_contacted_at as "lastContactedAt",
        created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
      FROM contacts
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }

  /**
   * Find contact with related data
   */
  async findByIdWithRelations(id: string, tenantId: string): Promise<ContactWithRelations | null> {
    const result = await this.pool.query(
      `SELECT
        c.id, c.tenant_id as "tenantId", c.owner_id as "ownerId", c.account_id as "accountId",
        c.first_name as "firstName", c.last_name as "lastName", c.email, c.phone, c.mobile,
        c.title, c.department, c.lead_source as "leadSource", c.lead_status as "leadStatus",
        c.lifecycle_stage as "lifecycleStage", c.lead_score as "leadScore", c.tags,
        c.address_street as "addressStreet", c.address_city as "addressCity",
        c.address_state as "addressState", c.address_postal_code as "addressPostalCode",
        c.address_country as "addressCountry", c.social_linkedin as "socialLinkedin",
        c.social_twitter as "socialTwitter", c.social_facebook as "socialFacebook",
        c.notes, c.is_active as "isActive", c.last_contacted_at as "lastContactedAt",
        c.created_at as "createdAt", c.updated_at as "updatedAt", c.deleted_at as "deletedAt",
        json_build_object(
          'id', u.id,
          'firstName', u.first_name,
          'lastName', u.last_name,
          'email', u.email
        ) as owner,
        CASE WHEN a.id IS NOT NULL THEN
          json_build_object(
            'id', a.id,
            'name', a.name,
            'industry', a.industry
          )
        ELSE NULL END as account
      FROM contacts c
      LEFT JOIN users u ON c.owner_id = u.id
      LEFT JOIN accounts a ON c.account_id = a.id
      WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }

  /**
   * List contacts with pagination and filters
   */
  async list(
    tenantId: string,
    options: ContactListOptions
  ): Promise<ContactListResponse> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      filters = {},
    } = options

    const offset = (page - 1) * limit
    const queryParams: any[] = [tenantId, limit, offset]
    let paramIndex = 4

    // Build WHERE clause
    const whereClauses = ['c.tenant_id = $1', 'c.deleted_at IS NULL']

    if (filters.search) {
      whereClauses.push(`(
        c.first_name ILIKE $${paramIndex} OR
        c.last_name ILIKE $${paramIndex} OR
        c.email ILIKE $${paramIndex} OR
        c.phone ILIKE $${paramIndex} OR
        c.mobile ILIKE $${paramIndex} OR
        c.title ILIKE $${paramIndex}
      )`)
      queryParams.push(`%${filters.search}%`)
      paramIndex++
    }

    if (filters.ownerId) {
      whereClauses.push(`c.owner_id = $${paramIndex}`)
      queryParams.push(filters.ownerId)
      paramIndex++
    }

    if (filters.accountId) {
      whereClauses.push(`c.account_id = $${paramIndex}`)
      queryParams.push(filters.accountId)
      paramIndex++
    }

    if (filters.leadStatus) {
      const statuses = Array.isArray(filters.leadStatus)
        ? filters.leadStatus
        : [filters.leadStatus]
      whereClauses.push(`c.lead_status = ANY($${paramIndex})`)
      queryParams.push(statuses)
      paramIndex++
    }

    if (filters.lifecycleStage) {
      const stages = Array.isArray(filters.lifecycleStage)
        ? filters.lifecycleStage
        : [filters.lifecycleStage]
      whereClauses.push(`c.lifecycle_stage = ANY($${paramIndex})`)
      queryParams.push(stages)
      paramIndex++
    }

    if (filters.leadScoreMin !== undefined) {
      whereClauses.push(`c.lead_score >= $${paramIndex}`)
      queryParams.push(filters.leadScoreMin)
      paramIndex++
    }

    if (filters.leadScoreMax !== undefined) {
      whereClauses.push(`c.lead_score <= $${paramIndex}`)
      queryParams.push(filters.leadScoreMax)
      paramIndex++
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClauses.push(`c.tags && $${paramIndex}`)
      queryParams.push(filters.tags)
      paramIndex++
    }

    if (filters.isActive !== undefined) {
      whereClauses.push(`c.is_active = $${paramIndex}`)
      queryParams.push(filters.isActive)
      paramIndex++
    }

    if (filters.createdAfter) {
      whereClauses.push(`c.created_at >= $${paramIndex}`)
      queryParams.push(filters.createdAfter)
      paramIndex++
    }

    if (filters.createdBefore) {
      whereClauses.push(`c.created_at <= $${paramIndex}`)
      queryParams.push(filters.createdBefore)
      paramIndex++
    }

    const whereClause = whereClauses.join(' AND ')

    // Validate sortBy to prevent SQL injection
    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'firstName',
      'lastName',
      'email',
      'leadScore',
      'lastContactedAt',
    ]
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC'

    // Map camelCase to snake_case for database
    const sortColumnMap: Record<string, string> = {
      createdAt: 'c.created_at',
      updatedAt: 'c.updated_at',
      firstName: 'c.first_name',
      lastName: 'c.last_name',
      email: 'c.email',
      leadScore: 'c.lead_score',
      lastContactedAt: 'c.last_contacted_at',
    }
    const sortColumn = sortColumnMap[sortField]

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM contacts c WHERE ${whereClause}`,
      [tenantId]
    )
    const total = parseInt(countResult.rows[0].count, 10)

    // Get contacts
    const result = await this.pool.query<Contact>(
      `SELECT
        c.id, c.tenant_id as "tenantId", c.owner_id as "ownerId", c.account_id as "accountId",
        c.first_name as "firstName", c.last_name as "lastName", c.email, c.phone, c.mobile,
        c.title, c.department, c.lead_source as "leadSource", c.lead_status as "leadStatus",
        c.lifecycle_stage as "lifecycleStage", c.lead_score as "leadScore", c.tags,
        c.address_street as "addressStreet", c.address_city as "addressCity",
        c.address_state as "addressState", c.address_postal_code as "addressPostalCode",
        c.address_country as "addressCountry", c.social_linkedin as "socialLinkedin",
        c.social_twitter as "socialTwitter", c.social_facebook as "socialFacebook",
        c.notes, c.is_active as "isActive", c.last_contacted_at as "lastContactedAt",
        c.created_at as "createdAt", c.updated_at as "updatedAt", c.deleted_at as "deletedAt"
      FROM contacts c
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $2 OFFSET $3`,
      queryParams
    )

    return {
      contacts: result.rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    }
  }

  /**
   * Update contact
   */
  async update(
    id: string,
    tenantId: string,
    data: UpdateContactInput
  ): Promise<Contact | null> {
    const updateFields: string[] = []
    const values: any[] = [id, tenantId]
    let paramIndex = 3

    // Build dynamic UPDATE SET clause
    Object.entries(data).forEach(([key, value]) => {
      const snakeCase = key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)
      updateFields.push(`${snakeCase} = $${paramIndex}`)
      values.push(value)
      paramIndex++
    })

    if (updateFields.length === 0) {
      return this.findById(id, tenantId)
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`)

    const result = await this.pool.query<Contact>(
      `UPDATE contacts
      SET ${updateFields.join(', ')}
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING
        id, tenant_id as "tenantId", owner_id as "ownerId", account_id as "accountId",
        first_name as "firstName", last_name as "lastName", email, phone, mobile,
        title, department, lead_source as "leadSource", lead_status as "leadStatus",
        lifecycle_stage as "lifecycleStage", lead_score as "leadScore", tags,
        address_street as "addressStreet", address_city as "addressCity",
        address_state as "addressState", address_postal_code as "addressPostalCode",
        address_country as "addressCountry", social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter", social_facebook as "socialFacebook",
        notes, is_active as "isActive", last_contacted_at as "lastContactedAt",
        created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"`,
      values
    )

    logger.info('Contact updated', { contactId: id, tenantId })
    return result.rows[0] || null
  }

  /**
   * Soft delete contact
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE contacts
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    logger.info('Contact deleted', { contactId: id, tenantId })
    return result.rowCount !== null && result.rowCount > 0
  }

  /**
   * Bulk delete contacts
   */
  async bulkDelete(ids: string[], tenantId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE contacts
      SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ANY($1) AND tenant_id = $2 AND deleted_at IS NULL`,
      [ids, tenantId]
    )

    const deletedCount = result.rowCount || 0
    logger.info('Contacts bulk deleted', { count: deletedCount, tenantId })
    return deletedCount
  }

  /**
   * Search contacts with full-text search
   */
  async search(tenantId: string, query: string, limit: number = 20): Promise<Contact[]> {
    const result = await this.pool.query<Contact>(
      `SELECT
        id, tenant_id as "tenantId", owner_id as "ownerId", account_id as "accountId",
        first_name as "firstName", last_name as "lastName", email, phone, mobile,
        title, department, lead_source as "leadSource", lead_status as "leadStatus",
        lifecycle_stage as "lifecycleStage", lead_score as "leadScore", tags,
        address_street as "addressStreet", address_city as "addressCity",
        address_state as "addressState", address_postal_code as "addressPostalCode",
        address_country as "addressCountry", social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter", social_facebook as "socialFacebook",
        notes, is_active as "isActive", last_contacted_at as "lastContactedAt",
        created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt",
        ts_rank(
          to_tsvector('english',
            COALESCE(first_name, '') || ' ' ||
            COALESCE(last_name, '') || ' ' ||
            COALESCE(email, '') || ' ' ||
            COALESCE(title, '') || ' ' ||
            COALESCE(department, '')
          ),
          plainto_tsquery('english', $2)
        ) as rank
      FROM contacts
      WHERE tenant_id = $1
        AND deleted_at IS NULL
        AND to_tsvector('english',
              COALESCE(first_name, '') || ' ' ||
              COALESCE(last_name, '') || ' ' ||
              COALESCE(email, '') || ' ' ||
              COALESCE(title, '') || ' ' ||
              COALESCE(department, '')
            ) @@ plainto_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT $3`,
      [tenantId, query, limit]
    )

    return result.rows
  }

  /**
   * Get contact count by tenant
   */
  async getCountByTenant(tenantId: string): Promise<number> {
    const result = await this.pool.query(
      `SELECT COUNT(*) FROM contacts WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    )
    return parseInt(result.rows[0].count, 10)
  }

  /**
   * Find contacts by email
   */
  async findByEmail(email: string, tenantId: string): Promise<Contact[]> {
    const result = await this.pool.query<Contact>(
      `SELECT
        id, tenant_id as "tenantId", owner_id as "ownerId", account_id as "accountId",
        first_name as "firstName", last_name as "lastName", email, phone, mobile,
        title, department, lead_source as "leadSource", lead_status as "leadStatus",
        lifecycle_stage as "lifecycleStage", lead_score as "leadScore", tags,
        address_street as "addressStreet", address_city as "addressCity",
        address_state as "addressState", address_postal_code as "addressPostalCode",
        address_country as "addressCountry", social_linkedin as "socialLinkedin",
        social_twitter as "socialTwitter", social_facebook as "socialFacebook",
        notes, is_active as "isActive", last_contacted_at as "lastContactedAt",
        created_at as "createdAt", updated_at as "updatedAt", deleted_at as "deletedAt"
      FROM contacts
      WHERE LOWER(email) = LOWER($1) AND tenant_id = $2 AND deleted_at IS NULL`,
      [email, tenantId]
    )

    return result.rows
  }

  /**
   * Update last contacted timestamp
   */
  async updateLastContacted(id: string, tenantId: string): Promise<void> {
    await this.pool.query(
      `UPDATE contacts
      SET last_contacted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )
  }
}

// Export singleton instance
export const contactRepository = new ContactRepository()
