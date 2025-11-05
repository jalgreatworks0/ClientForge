/**
 * Contacts API Routes
 * RESTful endpoints for contacts management
 */

import { Router } from 'express'
import { authenticate } from '../../../../middleware/authenticate'
import { authorize, RoleLevel } from '../../../../middleware/authorize'
import { requirePermission } from '../../../../middleware/authorize'
import { validateRequest } from '../../../../middleware/validate-request'
import * as contactController from '../../../../core/contacts/contact-controller'
import {
  createContactSchema,
  updateContactSchema,
  bulkContactOperationSchema,
  contactNoteSchema,
} from '../../../../core/contacts/contact-validators'

const router = Router()

// All routes require authentication
router.use(authenticate)

/**
 * GET /api/v1/contacts/statistics
 * Get contact statistics and metrics
 *
 * @returns {200} Statistics object
 * @requires permission:contacts:read
 */
router.get(
  '/statistics',
  requirePermission('contacts:read'),
  contactController.getStatistics
)

/**
 * GET /api/v1/contacts/search
 * Search contacts with full-text search
 *
 * Query params:
 * @param {string} q - Search query
 * @param {number} limit - Results limit (default: 20, max: 100)
 *
 * @returns {200} Array of matching contacts
 * @requires permission:contacts:read
 */
router.get(
  '/search',
  requirePermission('contacts:read'),
  contactController.searchContacts
)

/**
 * POST /api/v1/contacts/export
 * Export contacts to CSV/Excel/JSON
 *
 * @body {string} format - Export format (csv, xlsx, json)
 * @body {object} filters - Optional filters
 *
 * @returns {200} Export file
 * @requires permission:contacts:export
 */
router.post(
  '/export',
  requirePermission('contacts:export'),
  contactController.exportContacts
)

/**
 * POST /api/v1/contacts/import
 * Import contacts from CSV/Excel
 *
 * @body {file} file - CSV or Excel file
 *
 * @returns {200} Import results
 * @requires permission:contacts:create
 * @requires role:manager or higher
 */
router.post(
  '/import',
  authorize(RoleLevel.MANAGER),
  requirePermission('contacts:create'),
  contactController.importContacts
)

/**
 * POST /api/v1/contacts/bulk
 * Bulk operations on contacts
 *
 * @body {string[]} contactIds - Array of contact IDs
 * @body {string} operation - Operation type (update, delete, assign, add_tags, remove_tags)
 * @body {object} data - Operation data
 *
 * @returns {200} Operation results
 * @requires permission:contacts:update (for update/assign/tags) or contacts:delete (for delete)
 */
router.post(
  '/bulk',
  requirePermission('contacts:update'),
  validateRequest({ body: bulkContactOperationSchema }),
  contactController.bulkOperation
)

/**
 * GET /api/v1/contacts
 * List contacts with pagination and filters
 *
 * Query params:
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20, max: 100)
 * @param {string} sortBy - Sort field (default: createdAt)
 * @param {string} sortOrder - Sort order (asc, desc)
 * @param {string} search - Search term
 * @param {string} ownerId - Filter by owner
 * @param {string} accountId - Filter by account
 * @param {string} leadStatus - Filter by lead status
 * @param {string} lifecycleStage - Filter by lifecycle stage
 * @param {number} leadScoreMin - Minimum lead score
 * @param {number} leadScoreMax - Maximum lead score
 * @param {string[]} tags - Filter by tags
 * @param {boolean} isActive - Filter by active status
 *
 * @returns {200} Paginated list of contacts
 * @requires permission:contacts:read
 */
router.get(
  '/',
  requirePermission('contacts:read'),
  contactController.listContacts
)

/**
 * POST /api/v1/contacts
 * Create a new contact
 *
 * @body {string} firstName - First name (required)
 * @body {string} lastName - Last name (required)
 * @body {string} email - Email address
 * @body {string} phone - Phone number
 * @body {string} mobile - Mobile number
 * @body {string} title - Job title
 * @body {string} department - Department
 * @body {string} ownerId - Owner user ID (required)
 * @body {string} accountId - Associated account ID
 * @body {string} leadSource - Lead source
 * @body {string} leadStatus - Lead status
 * @body {string} lifecycleStage - Lifecycle stage
 * @body {string[]} tags - Tags
 * @body {object} address - Address fields
 * @body {object} social - Social media profiles
 * @body {string} notes - Notes
 *
 * @returns {201} Created contact
 * @requires permission:contacts:create
 */
router.post(
  '/',
  requirePermission('contacts:create'),
  validateRequest({ body: createContactSchema }),
  contactController.createContact
)

/**
 * GET /api/v1/contacts/:id
 * Get contact by ID
 *
 * Query params:
 * @param {string} include - Include related data (relations)
 *
 * @returns {200} Contact details
 * @requires permission:contacts:read
 */
router.get(
  '/:id',
  requirePermission('contacts:read'),
  contactController.getContactById
)

/**
 * PUT /api/v1/contacts/:id
 * Update contact
 *
 * @body All fields are optional (partial update)
 *
 * @returns {200} Updated contact
 * @requires permission:contacts:update
 */
router.put(
  '/:id',
  requirePermission('contacts:update'),
  validateRequest({ body: updateContactSchema }),
  contactController.updateContact
)

/**
 * DELETE /api/v1/contacts/:id
 * Delete contact (soft delete)
 *
 * @returns {200} Success message
 * @requires permission:contacts:delete
 */
router.delete(
  '/:id',
  requirePermission('contacts:delete'),
  contactController.deleteContact
)

/**
 * GET /api/v1/contacts/:id/activities
 * Get contact activities and interactions
 *
 * @returns {200} Array of activities
 * @requires permission:contacts:read
 */
router.get(
  '/:id/activities',
  requirePermission('contacts:read'),
  contactController.getContactActivities
)

/**
 * POST /api/v1/contacts/:id/notes
 * Add a note to contact
 *
 * @body {string} content - Note content (required)
 *
 * @returns {201} Created note
 * @requires permission:contacts:update
 */
router.post(
  '/:id/notes',
  requirePermission('contacts:update'),
  validateRequest({ body: contactNoteSchema }),
  contactController.addContactNote
)

/**
 * POST /api/v1/contacts/:id/contacted
 * Mark contact as contacted (updates last_contacted_at)
 *
 * @returns {200} Success message
 * @requires permission:contacts:update
 */
router.post(
  '/:id/contacted',
  requirePermission('contacts:update'),
  contactController.markAsContacted
)

/**
 * POST /api/v1/contacts/:id/calculate-score
 * Calculate/recalculate lead score
 *
 * @returns {200} Updated lead score
 * @requires permission:contacts:update
 */
router.post(
  '/:id/calculate-score',
  requirePermission('contacts:update'),
  contactController.calculateLeadScore
)

export default router
