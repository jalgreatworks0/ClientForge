/**
 * Deal Repository
 * Database access layer for deals/opportunities
 */

import { Pool } from 'pg'

import { getPool } from '../../database/postgresql/pool'

import {
  Deal,
  CreateDealInput,
  UpdateDealInput,
  DealFilters,
  DealListOptions,
  DealListResponse,
  DealWithRelations,
  DealStageHistory,
  Pipeline,
  DealStage,
  PipelineWithStages,
} from './deal-types'

export class DealRepository {
  private pool: Pool

  constructor() {
    this.pool = getPool()
  }

  /**
   * Create a new deal
   */
  async create(tenantId: string, data: CreateDealInput): Promise<Deal> {
    const result = await this.pool.query<Deal>(
      `INSERT INTO deals (
        tenantId, owner_id, account_id, contact_id, pipeline_id, stage_id,
        name, amount, currency, probability, expected_close_date, lead_source,
        next_step, description, tags, competitors, decision_makers, key_contacts,
        last_stage_change_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18,
        CURRENT_TIMESTAMP
      )
      RETURNING
        id,
        tenantId as "tenantId",
        owner_id as "ownerId",
        account_id as "accountId",
        contact_id as "contactId",
        pipeline_id as "pipelineId",
        stage_id as "stageId",
        name,
        amount,
        currency,
        probability,
        expected_close_date as "expectedCloseDate",
        actual_close_date as "actualCloseDate",
        lead_source as "leadSource",
        next_step as "nextStep",
        description,
        tags,
        is_closed as "isClosed",
        is_won as "isWon",
        lost_reason as "lostReason",
        competitors,
        decision_makers as "decisionMakers",
        key_contacts as "keyContacts",
        weighted_amount as "weightedAmount",
        days_in_stage as "daysInStage",
        last_stage_change_at as "lastStageChangeAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"`,
      [
        tenantId,
        data.ownerId,
        data.accountId || null,
        data.contactId || null,
        data.pipelineId,
        data.stageId,
        data.name,
        data.amount || null,
        data.currency || 'USD',
        data.probability || 0,
        data.expectedCloseDate || null,
        data.leadSource || null,
        data.nextStep || null,
        data.description || null,
        data.tags || null,
        data.competitors || null,
        data.decisionMakers || null,
        data.keyContacts || null,
      ]
    )

    return result.rows[0]
  }

  /**
   * Find deal by ID
   */
  async findById(id: string, tenantId: string): Promise<Deal | null> {
    const result = await this.pool.query<Deal>(
      `SELECT
        id,
        tenantId as "tenantId",
        owner_id as "ownerId",
        account_id as "accountId",
        contact_id as "contactId",
        pipeline_id as "pipelineId",
        stage_id as "stageId",
        name,
        amount,
        currency,
        probability,
        expected_close_date as "expectedCloseDate",
        actual_close_date as "actualCloseDate",
        lead_source as "leadSource",
        next_step as "nextStep",
        description,
        tags,
        is_closed as "isClosed",
        is_won as "isWon",
        lost_reason as "lostReason",
        competitors,
        decision_makers as "decisionMakers",
        key_contacts as "keyContacts",
        weighted_amount as "weightedAmount",
        days_in_stage as "daysInStage",
        last_stage_change_at as "lastStageChangeAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM deals
      WHERE id = $1 AND tenantId = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }

  /**
   * Find deal by ID with relations
   */
  async findByIdWithRelations(id: string, tenantId: string): Promise<DealWithRelations | null> {
    const result = await this.pool.query<DealWithRelations>(
      `SELECT
        d.*,
        json_build_object(
          'id', u.id,
          'firstName', u.first_name,
          'lastName', u.last_name,
          'email', u.email
        ) as owner,
        json_build_object(
          'id', a.id,
          'name', a.name,
          'industry', a.industry
        ) as account,
        json_build_object(
          'id', c.id,
          'firstName', c.first_name,
          'lastName', c.last_name,
          'email', c.email
        ) as contact,
        json_build_object(
          'id', p.id,
          'name', p.name,
          'isDefault', p.is_default
        ) as pipeline,
        json_build_object(
          'id', ds.id,
          'name', ds.name,
          'probability', ds.probability,
          'isClosedStage', ds.is_closed_stage,
          'isWonStage', ds.is_won_stage
        ) as stage
      FROM deals d
      LEFT JOIN users u ON u.id = d.owner_id
      LEFT JOIN accounts a ON a.id = d.account_id
      LEFT JOIN contacts c ON c.id = d.contact_id
      LEFT JOIN pipelines p ON p.id = d.pipeline_id
      LEFT JOIN deal_stages ds ON ds.id = d.stage_id
      WHERE d.id = $1 AND d.tenantId = $2 AND d.deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }

  /**
   * List deals with pagination and filters
   */
  async list(tenantId: string, options: DealListOptions): Promise<DealListResponse> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', filters = {} } = options

    const whereClauses: string[] = ['d.tenantId = $1', 'd.deleted_at IS NULL']
    const params: any[] = [tenantId]
    let paramIndex = 2

    // Build dynamic WHERE clause
    if (filters.search) {
      whereClauses.push(`(
        d.name ILIKE $${paramIndex} OR
        d.description ILIKE $${paramIndex}
      )`)
      params.push(`%${filters.search}%`)
      paramIndex++
    }

    if (filters.ownerId) {
      whereClauses.push(`d.owner_id = $${paramIndex}`)
      params.push(filters.ownerId)
      paramIndex++
    }

    if (filters.accountId) {
      whereClauses.push(`d.account_id = $${paramIndex}`)
      params.push(filters.accountId)
      paramIndex++
    }

    if (filters.contactId) {
      whereClauses.push(`d.contact_id = $${paramIndex}`)
      params.push(filters.contactId)
      paramIndex++
    }

    if (filters.pipelineId) {
      whereClauses.push(`d.pipeline_id = $${paramIndex}`)
      params.push(filters.pipelineId)
      paramIndex++
    }

    if (filters.stageId) {
      whereClauses.push(`d.stage_id = $${paramIndex}`)
      params.push(filters.stageId)
      paramIndex++
    }

    if (filters.amountMin !== undefined) {
      whereClauses.push(`d.amount >= $${paramIndex}`)
      params.push(filters.amountMin)
      paramIndex++
    }

    if (filters.amountMax !== undefined) {
      whereClauses.push(`d.amount <= $${paramIndex}`)
      params.push(filters.amountMax)
      paramIndex++
    }

    if (filters.probabilityMin !== undefined) {
      whereClauses.push(`d.probability >= $${paramIndex}`)
      params.push(filters.probabilityMin)
      paramIndex++
    }

    if (filters.probabilityMax !== undefined) {
      whereClauses.push(`d.probability <= $${paramIndex}`)
      params.push(filters.probabilityMax)
      paramIndex++
    }

    if (filters.tags && filters.tags.length > 0) {
      whereClauses.push(`d.tags && $${paramIndex}::text[]`)
      params.push(filters.tags)
      paramIndex++
    }

    if (filters.isClosed !== undefined) {
      whereClauses.push(`d.is_closed = $${paramIndex}`)
      params.push(filters.isClosed)
      paramIndex++
    }

    if (filters.isWon !== undefined) {
      whereClauses.push(`d.is_won = $${paramIndex}`)
      params.push(filters.isWon)
      paramIndex++
    }

    if (filters.leadSource) {
      whereClauses.push(`d.lead_source = $${paramIndex}`)
      params.push(filters.leadSource)
      paramIndex++
    }

    if (filters.expectedCloseDateFrom) {
      whereClauses.push(`d.expected_close_date >= $${paramIndex}`)
      params.push(filters.expectedCloseDateFrom)
      paramIndex++
    }

    if (filters.expectedCloseDateTo) {
      whereClauses.push(`d.expected_close_date <= $${paramIndex}`)
      params.push(filters.expectedCloseDateTo)
      paramIndex++
    }

    const whereClause = whereClauses.join(' AND ')
    const offset = (page - 1) * limit

    // Get total count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM deals d WHERE ${whereClause}`,
      params
    )
    const total = parseInt(countResult.rows[0].total, 10)

    // Get paginated results
    const validSortColumns = [
      'createdAt', 'updatedAt', 'name', 'amount', 'weightedAmount', 'probability', 'expectedCloseDate'
    ]
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'createdAt'
    const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC'

    const result = await this.pool.query<Deal>(
      `SELECT
        id,
        tenantId as "tenantId",
        owner_id as "ownerId",
        account_id as "accountId",
        contact_id as "contactId",
        pipeline_id as "pipelineId",
        stage_id as "stageId",
        name,
        amount,
        currency,
        probability,
        expected_close_date as "expectedCloseDate",
        actual_close_date as "actualCloseDate",
        lead_source as "leadSource",
        next_step as "nextStep",
        description,
        tags,
        is_closed as "isClosed",
        is_won as "isWon",
        lost_reason as "lostReason",
        competitors,
        decision_makers as "decisionMakers",
        key_contacts as "keyContacts",
        weighted_amount as "weightedAmount",
        days_in_stage as "daysInStage",
        last_stage_change_at as "lastStageChangeAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM deals d
      WHERE ${whereClause}
      ORDER BY ${sortColumn} ${sortDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    )

    const totalPages = Math.ceil(total / limit)

    return {
      deals: result.rows,
      total,
      page,
      limit,
      totalPages,
    }
  }

  /**
   * Update deal
   */
  async update(id: string, tenantId: string, data: UpdateDealInput): Promise<Deal> {
    const fields: string[] = []
    const params: any[] = []
    let paramIndex = 1

    const fieldMap: Record<string, string> = {
      ownerId: 'owner_id',
      accountId: 'account_id',
      contactId: 'contact_id',
      pipelineId: 'pipeline_id',
      stageId: 'stage_id',
      name: 'name',
      amount: 'amount',
      currency: 'currency',
      probability: 'probability',
      expectedCloseDate: 'expected_close_date',
      actualCloseDate: 'actual_close_date',
      leadSource: 'lead_source',
      nextStep: 'next_step',
      description: 'description',
      tags: 'tags',
      isClosed: 'is_closed',
      isWon: 'is_won',
      lostReason: 'lost_reason',
      competitors: 'competitors',
      decisionMakers: 'decision_makers',
      keyContacts: 'key_contacts',
    }

    Object.entries(data).forEach(([key, value]) => {
      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramIndex}`)
        params.push(value)
        paramIndex++
      }
    })

    fields.push(`updated_at = CURRENT_TIMESTAMP`)

    params.push(id, tenantId)

    const result = await this.pool.query<Deal>(
      `UPDATE deals
       SET ${fields.join(', ')}
       WHERE id = $${paramIndex} AND tenantId = $${paramIndex + 1} AND deleted_at IS NULL
       RETURNING
        id,
        tenantId as "tenantId",
        owner_id as "ownerId",
        account_id as "accountId",
        contact_id as "contactId",
        pipeline_id as "pipelineId",
        stage_id as "stageId",
        name,
        amount,
        currency,
        probability,
        expected_close_date as "expectedCloseDate",
        actual_close_date as "actualCloseDate",
        lead_source as "leadSource",
        next_step as "nextStep",
        description,
        tags,
        is_closed as "isClosed",
        is_won as "isWon",
        lost_reason as "lostReason",
        competitors,
        decision_makers as "decisionMakers",
        key_contacts as "keyContacts",
        weighted_amount as "weightedAmount",
        days_in_stage as "daysInStage",
        last_stage_change_at as "lastStageChangeAt",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"`,
      params
    )

    return result.rows[0]
  }

  /**
   * Soft delete deal
   */
  async delete(id: string, tenantId: string): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE deals
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1 AND tenantId = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rowCount > 0
  }

  /**
   * Full-text search on deals
   */
  async search(tenantId: string, query: string, limit: number = 20): Promise<Deal[]> {
    const result = await this.pool.query<Deal>(
      `SELECT
        id,
        tenantId as "tenantId",
        owner_id as "ownerId",
        account_id as "accountId",
        contact_id as "contactId",
        pipeline_id as "pipelineId",
        stage_id as "stageId",
        name,
        amount,
        currency,
        probability,
        expected_close_date as "expectedCloseDate",
        is_closed as "isClosed",
        weighted_amount as "weightedAmount",
        created_at as "createdAt",
        ts_rank(
          to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')),
          plainto_tsquery('english', $2)
        ) as rank
      FROM deals
      WHERE tenantId = $1
        AND deleted_at IS NULL
        AND to_tsvector('english', COALESCE(name, '') || ' ' || COALESCE(description, '')) @@ plainto_tsquery('english', $2)
      ORDER BY rank DESC
      LIMIT $3`,
      [tenantId, query, limit]
    )

    return result.rows
  }

  /**
   * Bulk delete deals
   */
  async bulkDelete(dealIds: string[], tenantId: string): Promise<number> {
    const result = await this.pool.query(
      `UPDATE deals
       SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
       WHERE id = ANY($1::uuid[]) AND tenantId = $2 AND deleted_at IS NULL`,
      [dealIds, tenantId]
    )

    return result.rowCount
  }

  /**
   * Get deal stage history
   */
  async getStageHistory(dealId: string, tenantId: string): Promise<DealStageHistory[]> {
    const result = await this.pool.query<DealStageHistory>(
      `SELECT
        id,
        tenantId as "tenantId",
        deal_id as "dealId",
        from_stage_id as "fromStageId",
        to_stage_id as "toStageId",
        changed_by as "changedBy",
        duration_days as "durationDays",
        notes,
        created_at as "createdAt"
      FROM deal_stage_history
      WHERE deal_id = $1 AND tenantId = $2
      ORDER BY created_at DESC`,
      [dealId, tenantId]
    )

    return result.rows
  }

  /**
   * Find pipeline by ID
   */
  async findPipelineById(id: string, tenantId: string): Promise<Pipeline | null> {
    const result = await this.pool.query<Pipeline>(
      `SELECT
        id,
        tenantId as "tenantId",
        name,
        description,
        is_default as "isDefault",
        is_active as "isActive",
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM pipelines
      WHERE id = $1 AND tenantId = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }

  /**
   * Get pipeline with stages
   */
  async getPipelineWithStages(id: string, tenantId: string): Promise<PipelineWithStages | null> {
    const pipeline = await this.findPipelineById(id, tenantId)
    if (!pipeline) return null

    const stagesResult = await this.pool.query<DealStage>(
      `SELECT
        id,
        tenantId as "tenantId",
        pipeline_id as "pipelineId",
        name,
        display_order as "displayOrder",
        probability,
        is_closed_stage as "isClosedStage",
        is_won_stage as "isWonStage",
        color,
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM deal_stages
      WHERE pipeline_id = $1 AND tenantId = $2 AND deleted_at IS NULL
      ORDER BY display_order ASC`,
      [id, tenantId]
    )

    return {
      ...pipeline,
      stages: stagesResult.rows,
    }
  }

  /**
   * Find stage by ID
   */
  async findStageById(id: string, tenantId: string): Promise<DealStage | null> {
    const result = await this.pool.query<DealStage>(
      `SELECT
        id,
        tenantId as "tenantId",
        pipeline_id as "pipelineId",
        name,
        display_order as "displayOrder",
        probability,
        is_closed_stage as "isClosedStage",
        is_won_stage as "isWonStage",
        color,
        created_at as "createdAt",
        updated_at as "updatedAt",
        deleted_at as "deletedAt"
      FROM deal_stages
      WHERE id = $1 AND tenantId = $2 AND deleted_at IS NULL`,
      [id, tenantId]
    )

    return result.rows[0] || null
  }
}

// Export singleton instance
export const dealRepository = new DealRepository()
