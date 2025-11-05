/**
 * Accounts API Routes
 * RESTful endpoints for accounts/companies management
 */

import { Router } from 'express'
import { authenticate } from '../../../middleware/authenticate'
import { authorize, RoleLevel } from '../../../middleware/authorize'
import { requirePermission } from '../../../middleware/authorize'
import { validateRequest } from '../../../middleware/validate-request'
import * as accountController from '../../../core/accounts/account-controller'
import {
  createAccountSchema,
  updateAccountSchema,
  bulkAccountOperationSchema,
  accountNoteSchema,
} from '../../../core/accounts/account-validators'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/v1/accounts/statistics
 * Get account statistics and metrics
 *
 * @returns {200} Statistics object
 * @requires permission:accounts:read
 */
router.get(
  '/statistics',
  requirePermission('accounts:read'),
  accountController.getStatistics
)

/**
 * GET /api/v1/accounts/search
 * Search accounts with full-text search
 *
 * Query params:
 * @param {string} q - Search query
 * @param {number} limit - Results limit (default: 20, max: 100)
 *
 * @returns {200} Array of matching accounts
 * @requires permission:accounts:read
 */
router.get(
  '/search',
  requirePermission('accounts:read'),
  accountController.searchAccounts
)

/**
 * POST /api/v1/accounts/export
 * Export accounts to CSV/Excel/JSON
 *
 * @body {string} format - Export format (csv, xlsx, json)
 * @body {object} filters - Optional filters
 *
 * @returns {200} Export file
 * @requires permission:accounts:export
 */
router.post(
  '/export',
  requirePermission('accounts:export'),
  accountController.exportAccounts
)

/**
 * POST /api/v1/accounts/import
 * Import accounts from CSV/Excel
 *
 * @body {file} file - CSV or Excel file
 *
 * @returns {200} Import results
 * @requires permission:accounts:create
 * @requires role:manager or higher
 */
router.post(
  '/import',
  authorize(RoleLevel.MANAGER),
  requirePermission('accounts:create'),
  accountController.importAccounts
)

/**
 * POST /api/v1/accounts/bulk
 * Bulk operations on accounts
 *
 * @body {string[]} accountIds - Array of account IDs
 * @body {string} operation - Operation type (update, delete, assign, add_tags, remove_tags, change_status)
 * @body {object} data - Operation data
 *
 * @returns {200} Operation results
 * @requires permission:accounts:update (for update/assign/tags/status) or accounts:delete (for delete)
 */
router.post(
  '/bulk',
  requirePermission('accounts:update'),
  validateRequest({ body: bulkAccountOperationSchema }),
  accountController.bulkOperation
)

/**
 * GET /api/v1/accounts
 * List accounts with pagination and filters
 *
 * Query params:
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20, max: 100)
 * @param {string} sortBy - Sort field (default: createdAt)
 * @param {string} sortOrder - Sort order (asc, desc)
 * @param {string} search - Search term
 * @param {string} ownerId - Filter by owner
 * @param {string} industry - Filter by industry
 * @param {string} companySize - Filter by company size
 * @param {string} accountType - Filter by account type
 * @param {string} accountStatus - Filter by account status
 * @param {number} revenueMin - Minimum annual revenue
 * @param {number} revenueMax - Maximum annual revenue
 * @param {string[]} tags - Filter by tags
 * @param {boolean} isActive - Filter by active status
 * @param {string} parentAccountId - Filter by parent account
 * @param {boolean} hasParent - Filter by presence of parent account
 *
 * @returns {200} Paginated list of accounts
 * @requires permission:accounts:read
 */
router.get(
  '/',
  requirePermission('accounts:read'),
  accountController.listAccounts
)

/**
 * POST /api/v1/accounts
 * Create a new account
 *
 * @body {string} name - Account name (required)
 * @body {string} ownerId - Owner user ID (required)
 * @body {string} website - Website URL
 * @body {string} industry - Industry
 * @body {string} companySize - Company size (startup, small, medium, large, enterprise)
 * @body {number} annualRevenue - Annual revenue
 * @body {string} phone - Phone number
 * @body {string} email - Email address
 * @body {string} description - Description
 * @body {string} accountType - Account type (prospect, customer, partner, etc.)
 * @body {string} accountStatus - Account status (active, inactive, pending, churned)
 * @body {string} parentAccountId - Parent account ID
 * @body {string[]} tags - Tags
 * @body {object} billingAddress - Billing address fields
 * @body {object} shippingAddress - Shipping address fields
 * @body {object} social - Social media profiles
 * @body {number} employeeCount - Number of employees
 * @body {number} foundedYear - Year founded
 * @body {string} stockSymbol - Stock symbol
 *
 * @returns {201} Created account
 * @requires permission:accounts:create
 */
router.post(
  '/',
  requirePermission('accounts:create'),
  validateRequest({ body: createAccountSchema }),
  accountController.createAccount
)

/**
 * GET /api/v1/accounts/:id
 * Get account by ID
 *
 * Query params:
 * @param {string} include - Include related data (relations)
 *
 * @returns {200} Account details
 * @requires permission:accounts:read
 */
router.get(
  '/:id',
  requirePermission('accounts:read'),
  accountController.getAccountById
)

/**
 * PUT /api/v1/accounts/:id
 * Update account
 *
 * @body All fields are optional (partial update)
 *
 * @returns {200} Updated account
 * @requires permission:accounts:update
 */
router.put(
  '/:id',
  requirePermission('accounts:update'),
  validateRequest({ body: updateAccountSchema }),
  accountController.updateAccount
)

/**
 * DELETE /api/v1/accounts/:id
 * Delete account (soft delete)
 *
 * @returns {200} Success message
 * @requires permission:accounts:delete
 */
router.delete(
  '/:id',
  requirePermission('accounts:delete'),
  accountController.deleteAccount
)

/**
 * GET /api/v1/accounts/:id/hierarchy
 * Get account hierarchy (parent and all children)
 *
 * @returns {200} Account hierarchy tree
 * @requires permission:accounts:read
 */
router.get(
  '/:id/hierarchy',
  requirePermission('accounts:read'),
  accountController.getAccountHierarchy
)

/**
 * GET /api/v1/accounts/:id/activities
 * Get account activities and interactions
 *
 * @returns {200} Array of activities
 * @requires permission:accounts:read
 */
router.get(
  '/:id/activities',
  requirePermission('accounts:read'),
  accountController.getAccountActivities
)

/**
 * POST /api/v1/accounts/:id/notes
 * Add a note to account
 *
 * @body {string} content - Note content (required)
 *
 * @returns {201} Created note
 * @requires permission:accounts:update
 */
router.post(
  '/:id/notes',
  requirePermission('accounts:update'),
  validateRequest({ body: accountNoteSchema }),
  accountController.addAccountNote
)

/**
 * POST /api/v1/accounts/:id/activity
 * Mark account as having recent activity (updates last_activity_at)
 *
 * @returns {200} Success message
 * @requires permission:accounts:update
 */
router.post(
  '/:id/activity',
  requirePermission('accounts:update'),
  accountController.markActivity
)

export default router
