/**
 * Pipelines API Routes
 * RESTful endpoints for pipeline management
 */

import { Router } from 'express'
import { Response } from 'express'
import { AuthRequest } from '../../../../middleware/authenticate'
import { authenticate } from '../../../../middleware/authenticate'
import { validateRequest } from '../../../../middleware/validate-request'
import { db } from '../../../../database/postgresql/pool'
import { logger } from '../../../../utils/logging/logger'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/v1/pipelines
 * List all pipelines for tenant
 *
 * @returns {200} Array of pipelines
 */
router.get(
  '/',
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId } = req.user!

      const result = await db.query(
        `SELECT id, tenant_id as "tenantId", name, description, is_default as "isDefault",
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
         FROM pipelines
         WHERE tenant_id = $1 AND deleted_at IS NULL
         ORDER BY is_default DESC, name ASC`,
        [tenantId]
      )

      res.json({
        success: true,
        data: result.rows,
      })
    } catch (error: any) {
      logger.error('Failed to list pipelines', { error: error.message, tenantId: req.user?.tenantId })
      res.status(500).json({
        success: false,
        message: 'Failed to list pipelines',
      })
    }
  }
)

/**
 * GET /api/v1/pipelines/:id
 * Get pipeline by ID with optional stages
 *
 * Query params:
 * @param {string} include - Include related data (stages)
 *
 * @returns {200} Pipeline details
 */
router.get(
  '/:id',
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { tenantId } = req.user!
      const includeStages = req.query.include === 'stages'

      // Get pipeline
      const pipelineResult = await db.query(
        `SELECT id, tenant_id as "tenantId", name, description, is_default as "isDefault",
                is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"
         FROM pipelines
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      )

      if (pipelineResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pipeline not found',
        })
      }

      const pipeline = pipelineResult.rows[0]

      // Include stages if requested
      if (includeStages) {
        const stagesResult = await db.query(
          `SELECT id, tenant_id as "tenantId", pipeline_id as "pipelineId", name, display_order as "displayOrder",
                  probability, is_closed_stage as "isClosedStage", is_won_stage as "isWonStage", color,
                  created_at as "createdAt", updated_at as "updatedAt"
           FROM deal_stages
           WHERE pipeline_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
           ORDER BY display_order ASC`,
          [id, tenantId]
        )
        pipeline.stages = stagesResult.rows
      }

      res.json({
        success: true,
        data: pipeline,
      })
    } catch (error: any) {
      logger.error('Failed to get pipeline', { error: error.message, pipelineId: req.params.id })
      res.status(500).json({
        success: false,
        message: 'Failed to get pipeline',
      })
    }
  }
)

/**
 * POST /api/v1/pipelines
 * Create new pipeline
 *
 * @body {string} name - Pipeline name (required)
 * @body {string} description - Description
 * @body {boolean} isDefault - Set as default pipeline
 * @body {boolean} isActive - Active status
 *
 * @returns {201} Created pipeline
 */
router.post(
  '/',
  async (req: AuthRequest, res: Response) => {
    try {
      const { tenantId, userId } = req.user!
      const { name, description, isDefault, isActive } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Pipeline name is required',
        })
      }

      // If setting as default, unset other defaults first
      if (isDefault) {
        await db.query(
          `UPDATE pipelines SET is_default = false WHERE tenant_id = $1 AND deleted_at IS NULL`,
          [tenantId]
        )
      }

      const result = await db.query(
        `INSERT INTO pipelines (tenant_id, name, description, is_default, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, tenant_id as "tenantId", name, description, is_default as "isDefault",
                   is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
        [tenantId, name.trim(), description || null, isDefault || false, isActive !== false]
      )

      logger.info('Pipeline created', { pipelineId: result.rows[0].id, name, tenantId, userId })

      res.status(201).json({
        success: true,
        data: result.rows[0],
        message: 'Pipeline created successfully',
      })
    } catch (error: any) {
      logger.error('Failed to create pipeline', { error: error.message, tenantId: req.user?.tenantId })
      res.status(500).json({
        success: false,
        message: 'Failed to create pipeline',
      })
    }
  }
)

/**
 * PUT /api/v1/pipelines/:id
 * Update pipeline
 *
 * @body {string} name - Pipeline name
 * @body {string} description - Description
 * @body {boolean} isDefault - Set as default
 * @body {boolean} isActive - Active status
 *
 * @returns {200} Updated pipeline
 */
router.put(
  '/:id',
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { tenantId, userId } = req.user!
      const { name, description, isDefault, isActive } = req.body

      // Check pipeline exists
      const existingResult = await db.query(
        `SELECT id FROM pipelines WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      )

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pipeline not found',
        })
      }

      // If setting as default, unset other defaults first
      if (isDefault) {
        await db.query(
          `UPDATE pipelines SET is_default = false WHERE tenant_id = $1 AND id != $2 AND deleted_at IS NULL`,
          [tenantId, id]
        )
      }

      // Build update query dynamically
      const updates: string[] = []
      const values: any[] = []
      let paramCount = 1

      if (name !== undefined) {
        updates.push(`name = $${paramCount++}`)
        values.push(name.trim())
      }
      if (description !== undefined) {
        updates.push(`description = $${paramCount++}`)
        values.push(description)
      }
      if (isDefault !== undefined) {
        updates.push(`is_default = $${paramCount++}`)
        values.push(isDefault)
      }
      if (isActive !== undefined) {
        updates.push(`is_active = $${paramCount++}`)
        values.push(isActive)
      }

      updates.push(`updated_at = NOW()`)
      values.push(id, tenantId)

      const result = await db.query(
        `UPDATE pipelines
         SET ${updates.join(', ')}
         WHERE id = $${paramCount++} AND tenant_id = $${paramCount++} AND deleted_at IS NULL
         RETURNING id, tenant_id as "tenantId", name, description, is_default as "isDefault",
                   is_active as "isActive", created_at as "createdAt", updated_at as "updatedAt"`,
        values
      )

      logger.info('Pipeline updated', { pipelineId: id, tenantId, userId })

      res.json({
        success: true,
        data: result.rows[0],
        message: 'Pipeline updated successfully',
      })
    } catch (error: any) {
      logger.error('Failed to update pipeline', { error: error.message, pipelineId: req.params.id })
      res.status(500).json({
        success: false,
        message: 'Failed to update pipeline',
      })
    }
  }
)

/**
 * DELETE /api/v1/pipelines/:id
 * Delete pipeline (soft delete)
 *
 * @returns {200} Success message
 */
router.delete(
  '/:id',
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params
      const { tenantId, userId } = req.user!

      // Check pipeline exists
      const existingResult = await db.query(
        `SELECT id, is_default FROM pipelines WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [id, tenantId]
      )

      if (existingResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: 'Pipeline not found',
        })
      }

      // Prevent deleting default pipeline if it's the only one
      if (existingResult.rows[0].is_default) {
        const pipelineCount = await db.query(
          `SELECT COUNT(*) FROM pipelines WHERE tenant_id = $1 AND deleted_at IS NULL`,
          [tenantId]
        )

        if (parseInt(pipelineCount.rows[0].count) === 1) {
          return res.status(400).json({
            success: false,
            message: 'Cannot delete the only pipeline. Create another pipeline first.',
          })
        }
      }

      // Soft delete pipeline and its stages
      await db.query(
        `UPDATE pipelines SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      )

      await db.query(
        `UPDATE deal_stages SET deleted_at = NOW() WHERE pipeline_id = $1 AND tenant_id = $2`,
        [id, tenantId]
      )

      logger.info('Pipeline deleted', { pipelineId: id, tenantId, userId })

      res.json({
        success: true,
        message: 'Pipeline deleted successfully',
      })
    } catch (error: any) {
      logger.error('Failed to delete pipeline', { error: error.message, pipelineId: req.params.id })
      res.status(500).json({
        success: false,
        message: 'Failed to delete pipeline',
      })
    }
  }
)

export default router

