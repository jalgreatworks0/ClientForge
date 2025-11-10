/**
 * Deals API Routes
 * RESTful endpoints for deals/opportunities management
 */

import { Router } from 'express'

import { authenticate } from '../../../../middleware/authenticate'
import { requirePermission } from '../../../../middleware/authorize'
import { validateRequest } from '../../../../middleware/validate-request'
import * as dealController from '../../../../core/deals/deal-controller'
import {
  createDealSchema,
  updateDealSchema,
  bulkDealOperationSchema,
  changeDealStageSchema,
  closeDealSchema,
} from '../../../../core/deals/deal-validators'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/v1/deals/statistics
 * Get deal statistics and metrics
 *
 * @returns {200} Statistics object
 * @requires permission:deals:read
 */
router.get(
  '/statistics',
  requirePermission('deals:read'),
  dealController.getStatistics
)

/**
 * GET /api/v1/deals/search
 * Search deals with full-text search
 *
 * Query params:
 * @param {string} q - Search query
 * @param {number} limit - Results limit (default: 20, max: 100)
 *
 * @returns {200} Array of matching deals
 * @requires permission:deals:read
 */
router.get(
  '/search',
  requirePermission('deals:read'),
  dealController.searchDeals
)

/**
 * POST /api/v1/deals/export
 * Export deals to CSV/Excel/JSON
 *
 * @body {string} format - Export format (csv, xlsx, json)
 * @body {object} filters - Optional filters
 *
 * @returns {200} Export file
 * @requires permission:deals:export
 */
router.post(
  '/export',
  requirePermission('deals:export'),
  dealController.exportDeals
)

/**
 * POST /api/v1/deals/import
 * Import deals from CSV/Excel
 *
 * @body {file} file - CSV or Excel file
 *
 * @returns {200} Import results
 * @requires permission:deals:create
 */
router.post(
  '/import',
  requirePermission('deals:create'),
  dealController.importDeals
)

/**
 * POST /api/v1/deals/bulk
 * Bulk operations on deals
 *
 * @body {string[]} dealIds - Array of deal IDs
 * @body {string} operation - Operation type (update, delete, assign, add_tags, remove_tags, change_stage, close_won, close_lost)
 * @body {object} data - Operation data
 *
 * @returns {200} Operation results
 * @requires permission:deals:update
 */
router.post(
  '/bulk',
  requirePermission('deals:update'),
  validateRequest({ body: bulkDealOperationSchema }),
  dealController.bulkOperation
)

/**
 * GET /api/v1/deals
 * List deals with pagination and filters
 *
 * Query params:
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20, max: 100)
 * @param {string} sortBy - Sort field (default: createdAt)
 * @param {string} sortOrder - Sort order (asc, desc)
 * @param {string} search - Search term
 * @param {string} ownerId - Filter by owner
 * @param {string} accountId - Filter by account
 * @param {string} contactId - Filter by contact
 * @param {string} pipelineId - Filter by pipeline
 * @param {string} stageId - Filter by stage
 * @param {number} amountMin - Minimum deal amount
 * @param {number} amountMax - Maximum deal amount
 * @param {number} probabilityMin - Minimum probability
 * @param {number} probabilityMax - Maximum probability
 * @param {string[]} tags - Filter by tags
 * @param {boolean} isClosed - Filter by closed status
 * @param {boolean} isWon - Filter by won status
 * @param {string} leadSource - Filter by lead source
 *
 * @returns {200} Paginated list of deals
 * @requires permission:deals:read
 */
router.get(
  '/',
  requirePermission('deals:read'),
  dealController.listDeals
)

/**
 * POST /api/v1/deals
 * Create a new deal
 *
 * @body {string} name - Deal name (required)
 * @body {string} ownerId - Owner user ID (required)
 * @body {string} pipelineId - Pipeline ID (required)
 * @body {string} stageId - Stage ID (required)
 * @body {string} accountId - Associated account ID
 * @body {string} contactId - Associated contact ID
 * @body {number} amount - Deal amount
 * @body {string} currency - Currency code (default: USD)
 * @body {number} probability - Win probability 0-100
 * @body {date} expectedCloseDate - Expected close date
 * @body {string} leadSource - Lead source
 * @body {string} nextStep - Next step
 * @body {string} description - Description
 * @body {string[]} tags - Tags
 * @body {string[]} competitors - Competitors
 * @body {string[]} decisionMakers - Decision makers
 * @body {string[]} keyContacts - Key contacts
 *
 * @returns {201} Created deal
 * @requires permission:deals:create
 */
router.post(
  '/',
  requirePermission('deals:create'),
  validateRequest({ body: createDealSchema }),
  dealController.createDeal
)

/**
 * GET /api/v1/deals/:id
 * Get deal by ID
 *
 * Query params:
 * @param {string} include - Include related data (relations)
 *
 * @returns {200} Deal details
 * @requires permission:deals:read
 */
router.get(
  '/:id',
  requirePermission('deals:read'),
  dealController.getDealById
)

/**
 * PUT /api/v1/deals/:id
 * Update deal
 *
 * @body All fields are optional (partial update)
 *
 * @returns {200} Updated deal
 * @requires permission:deals:update
 */
router.put(
  '/:id',
  requirePermission('deals:update'),
  validateRequest({ body: updateDealSchema }),
  dealController.updateDeal
)

/**
 * DELETE /api/v1/deals/:id
 * Delete deal (soft delete)
 *
 * @returns {200} Success message
 * @requires permission:deals:delete
 */
router.delete(
  '/:id',
  requirePermission('deals:delete'),
  dealController.deleteDeal
)

/**
 * POST /api/v1/deals/:id/change-stage
 * Change deal stage
 *
 * @body {string} toStageId - Target stage ID (required)
 * @body {string} notes - Notes about stage change
 *
 * @returns {200} Updated deal
 * @requires permission:deals:update
 */
router.post(
  '/:id/change-stage',
  requirePermission('deals:update'),
  validateRequest({ body: changeDealStageSchema }),
  dealController.changeDealStage
)

/**
 * POST /api/v1/deals/:id/close
 * Close deal as won or lost
 *
 * @body {boolean} isWon - true for won, false for lost (required)
 * @body {date} actualCloseDate - Actual close date
 * @body {string} lostReason - Reason if lost (required when isWon=false)
 * @body {string} notes - Notes about closure
 *
 * @returns {200} Updated deal
 * @requires permission:deals:update
 */
router.post(
  '/:id/close',
  requirePermission('deals:update'),
  validateRequest({ body: closeDealSchema }),
  dealController.closeDeal
)

/**
 * GET /api/v1/deals/:id/history
 * Get deal stage change history
 *
 * @returns {200} Array of stage changes
 * @requires permission:deals:read
 */
router.get(
  '/:id/history',
  requirePermission('deals:read'),
  dealController.getDealHistory
)

export default router
