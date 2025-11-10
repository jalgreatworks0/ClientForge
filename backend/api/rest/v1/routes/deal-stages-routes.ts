/**
 * Deal Stages API Routes
 * RESTful endpoints for deal stage management
 */

import { Router } from 'express'
import { Response } from 'express'
import { AuthRequest } from '../../../../middleware/authenticate'
import { authenticate } from '../../../../middleware/authenticate'
import { requirePermission } from '../../../../middleware/authorize'
import { db } from '../../../../database/postgresql/pool'
import { logger } from '../../../../utils/logging/logger'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/v1/deal-stages
 * List deal stages for a pipeline
 *
 * Query params:
 * @param {string} pipelineId - Filter by pipeline ID
 *
 * @returns {200} Array of deal stages
 * @requires permission:deals:read
 */
router.get(
  '/',
  requirePermission('deals:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId } = req.user!
      const { pipelineId } = req.query

      let query = `
        SELECT id, tenant_id as "tenantId", pipeline_id as "pipelineId", name,
               display_order as "displayOrder", probability, is_closed_stage as "isClosedStage",
               is_won_stage as "isWonStage", color, created_at as "createdAt", updated_at as "updatedAt"
        FROM deal_stages
        WHERE tenant_id = $1 AND deleted_at IS NULL
      `
      const params: any[] = [tenantId]

      if (pipelineId) {
        query += ` AND pipeline_id = $2`
        params.push(pipelineId)
      }

      query += ` ORDER BY display_order ASC`

      const result = await db.query(query, params)

      res.json({
        success: true,
        data: result.rows,
      })
    } catch (error: any) {
      logger.error('Failed to list deal stages', { error: error.message, tenantId: req.user?.tenantId })
      res.status(500).json({
        success: false,
        message: 'Failed to list deal stages',
      })
    }
  }
)

/**
 * GET /api/v1/deal-stages/:id
 * Get deal stage by ID
 *
 * @returns {200} Deal stage details
 * @requires permission:deals:read
 */
router.get(
  '/:id',
  requirePermission('deals:read'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { tenantId } = req.user!

      const result = await db.query(
        `SELECT id, tenant_id as "tenantId", pipeline_id as "pipelineId", name,
                display_order as "displayOrder", probability, is_closed_stage as "isClosedStage",
                is_won_stage as "isWonStage", color, created_at as "createdAt", updated_at as "updatedAt"
         FROM deal_stages
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Deal stage not found',
        })
      }

      res.json({
        success: true,
        data: result.rows[0],
      })
    } catch (error: any) {
      logger.error('Failed to get deal stage', { error: error.message, stageId: req.params.id })
      res.status(500).json({
        success: false,
        message: 'Failed to get deal stage',
      })
    }
  }
)

/**
 * POST /api/v1/deal-stages
 * Create new deal stage
 *
 * @body {string} pipelineId - Pipeline ID (required)
 * @body {string} name - Stage name (required)
 * @body {number} displayOrder - Display order (required)
 * @body {number} probability - Win probability 0-100 (required)
 * @body {boolean} isClosedStage - Is closed stage
 * @body {boolean} isWonStage - Is won stage
 * @body {string} color - Hex color code
 *
 * @returns {201} Created deal stage
 * @requires permission:deals:create
 */
router.post(
  '/',
  requirePermission('deals:create'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId, userId } = req.user!
      const { pipelineId, name, displayOrder, probability, isClosedStage, isWonStage, color } = req.body

      // Validation
      if (!pipelineId || !name || displayOrder === undefined || probability === undefined) {
        return res.status(400).json({
          success: false,
          message: 'pipelineId, name, displayOrder, and probability are required',
        })
      }

      if (probability < 0 || probability > 100) {
        return res.status(400).json({
          success: false,
          message: 'Probability must be between 0 and 100',
        })
      }

      // Verify pipeline exists
      const pipelineResult = await db.query(
        `SELECT id FROM pipelines WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [pipelineId, tenantId]
      )

      if (pipelineResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pipeline not found',
        })
      }

      const result = await db.query(
        `INSERT INTO deal_stages (tenant_id, pipeline_id, name, display_order, probability, is_closed_stage, is_won_stage, color)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, tenant_id as "tenantId", pipeline_id as "pipelineId", name,
                   display_order as "displayOrder", probability, is_closed_stage as "isClosedStage",
                   is_won_stage as "isWonStage", color, created_at as "createdAt", updated_at as "updatedAt"`,
        [tenantId, pipelineId, name.trim(), displayOrder, probability, isClosedStage || false, isWonStage || false, color || null]
      )

      logger.info('Deal stage created', { stageId: result.rows[0].id, name, pipelineId, tenantId, userId })

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Deal stage created successfully',
      })
    } catch (error: any) {
      logger.error('Failed to create deal stage', { error: error.message, tenantId: req.user?.tenantId })
      res.status(500).json({
        success: false,
        message: 'Failed to create deal stage',
      })
    }
  }
)

/**
 * PUT /api/v1/deal-stages/:id
 * Update deal stage
 *
 * @body {string} name - Stage name
 * @body {number} displayOrder - Display order
 * @body {number} probability - Win probability
 * @body {boolean} isClosedStage - Is closed stage
 * @body {boolean} isWonStage - Is won stage
 * @body {string} color - Hex color code
 *
 * @returns {200} Updated deal stage
 * @requires permission:deals:update
 */
router.put(
  '/:id',
  requirePermission('deals:update'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { tenantId, userId } = req.user!
      const { name, displayOrder, probability, isClosedStage, isWonStage, color } = req.body

      // Check stage exists
      const existingResult = await db.query(
        `SELECT id FROM deal_stages WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      )

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Deal stage not found',
        })
      }

      // Validate probability if provided
      if (probability !== undefined && (probability < 0 || probability > 100)) {
        return res.status(400).json({
          success: false,
          message: 'Probability must be between 0 and 100',
        })
      }

      // Build update query dynamically
      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`)
        values.push(name.trim())
      }
      if (displayOrder !== undefined) {
        updates.push(`display_order = $${paramCount++}`)
        values.push(displayOrder)
      }
      if (probability !== undefined) {
        updates.push(`probability = $${paramCount++}`)
        values.push(probability)
      }
      if (isClosedStage !== undefined) {
        updates.push(`is_closed_stage = $${paramCount++}`)
        values.push(isClosedStage)
      }
      if (isWonStage !== undefined) {
        updates.push(`is_won_stage = $${paramCount++}`)
        values.push(isWonStage)
      }
      if (color !== undefined) {
        updates.push(`color = $${paramCount++}`)
        values.push(color)
      }

      updates.push(`updated_at = NOW()`)
      values.push(id, tenantId)

      const result = await db.query(
        `UPDATE deal_stages
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND tenant_id = $${paramCount++} AND deleted_at IS NULL
         RETURNING id, tenant_id as "tenantId", pipeline_id as "pipelineId", name,
                   display_order as "displayOrder", probability, is_closed_stage as "isClosedStage",
                   is_won_stage as "isWonStage", color, created_at as "createdAt", updated_at as "updatedAt"`,
        values
      )

      logger.info('Deal stage updated', { stageId: id, tenantId, userId })

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Deal stage updated successfully',
      })
    } catch (error: any) {
      logger.error('Failed to update deal stage', { error: error.message, stageId: req.params.id })
      res.status(500).json({
        success: false,
        message: 'Failed to update deal stage',
      })
    }
  }
)

/**
 * DELETE /api/v1/deal-stages/:id
 * Delete deal stage (soft delete)
 *
 * @returns {200} Success message
 * @requires permission:deals:delete
 */
router.delete(
  '/:id',
  requirePermission('deals:delete'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { tenantId, userId } = req.user!

      // Check stage exists
      const existingResult = await db.query(
        `SELECT id, pipeline_id FROM deal_stages WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      )

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Deal stage not found',
        })
      }

      const pipelineId = existingResult.rows[0].pipeline_id

      // Check if there are deals in this stage
      const dealsCount = await db.query(
        `SELECT COUNT(*) FROM deals WHERE stage_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      )

      if (parseInt(dealsCount.rows[0].count) > 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot delete stage with ${dealsCount.rows[0].count} active deals. Move deals to another stage first.`,
        })
      }

      // Soft delete stage
      await db.query(
        `UPDATE deal_stages SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      )

      logger.info('Deal stage deleted', { stageId: id, pipelineId, tenantId, userId })

      res.json({
        success: true,
        message: 'Deal stage deleted successfully',
      })
    } catch (error: any) {
      logger.error('Failed to delete deal stage', { error: error.message, stageId: req.params.id })
      res.status(500).json({
        success: false,
        message: 'Failed to delete deal stage',
      })
    }
  }
)

export default router
