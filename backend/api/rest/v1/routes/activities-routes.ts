/**
 * Activities API Routes
 * RESTful endpoints for activity tracking
 */

import { Router } from 'express'
import { authenticate } from '../../../../middleware/authenticate'
import { requirePermission } from '../../../../middleware/authorize'
import { validateRequest } from '../../../../middleware/validate-request'
import * as taskController from '../../../../core/tasks/task-controller'
import {
  createActivitySchema,
  updateActivitySchema,
} from '../../../../core/tasks/task-validators'

const router = Router()

// All routes require authentication
router.use(authenticate)

// =====================================================
// ACTIVITY ROUTES
// =====================================================

/**
 * GET /api/v1/activities/statistics
 * Get activity statistics and metrics
 *
 * @returns {200} Statistics object
 * @requires permission:activities:read
 */
router.get(
  '/statistics',
  requirePermission('activities:read'),
  taskController.getActivityStatistics
)

/**
 * GET /api/v1/activities
 * List activities with pagination and filters
 *
 * Query params:
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20, max: 100)
 * @param {string} sortBy - Sort field (default: performedAt)
 * @param {string} sortOrder - Sort order (asc, desc)
 * @param {string} search - Search term
 * @param {string} type - Filter by activity type
 * @param {string} entityType - Filter by entity type
 * @param {string} entityId - Filter by entity ID
 * @param {string} performedBy - Filter by user
 * @param {date} performedAtFrom - Filter by date from
 * @param {date} performedAtTo - Filter by date to
 * @param {string[]} tags - Filter by tags
 *
 * @returns {200} Paginated list of activities
 * @requires permission:activities:read
 */
router.get(
  '/',
  requirePermission('activities:read'),
  taskController.listActivities
)

/**
 * POST /api/v1/activities
 * Create a new activity
 *
 * @body {string} type - Activity type (call, email, meeting, note, task, custom) (required)
 * @body {string} title - Activity title (required)
 * @body {string} description - Activity description
 * @body {string} outcome - Activity outcome
 * @body {string} entityType - Related entity type (required)
 * @body {string} entityId - Related entity ID (required)
 * @body {date} performedAt - When activity was performed
 * @body {number} durationMinutes - Duration in minutes
 * @body {string} emailSubject - Email subject (for email activities)
 * @body {string[]} emailTo - Email recipients (for email activities)
 * @body {string[]} emailCc - Email CC (for email activities)
 * @body {string[]} emailBcc - Email BCC (for email activities)
 * @body {string} meetingLocation - Meeting location (for meeting activities)
 * @body {date} meetingStartTime - Meeting start time (for meeting activities)
 * @body {date} meetingEndTime - Meeting end time (for meeting activities)
 * @body {string} callDirection - Call direction (inbound, outbound) (for call activities)
 * @body {string} callPhoneNumber - Phone number (for call activities)
 * @body {string[]} tags - Tags
 * @body {object} attachments - Attachments metadata
 * @body {array} participants - Activity participants
 *
 * @returns {201} Created activity
 * @requires permission:activities:create
 */
router.post(
  '/',
  requirePermission('activities:create'),
  validateRequest({ body: createActivitySchema }),
  taskController.createActivity
)

/**
 * GET /api/v1/activities/:id
 * Get activity by ID
 *
 * @returns {200} Activity details
 * @requires permission:activities:read
 */
router.get(
  '/:id',
  requirePermission('activities:read'),
  taskController.getActivityById
)

/**
 * PUT /api/v1/activities/:id
 * Update activity
 *
 * @body All fields are optional (partial update)
 *
 * @returns {200} Updated activity
 * @requires permission:activities:update
 */
router.put(
  '/:id',
  requirePermission('activities:update'),
  validateRequest({ body: updateActivitySchema }),
  taskController.updateActivity
)

/**
 * DELETE /api/v1/activities/:id
 * Delete activity (soft delete)
 *
 * @returns {200} Success message
 * @requires permission:activities:delete
 */
router.delete(
  '/:id',
  requirePermission('activities:delete'),
  taskController.deleteActivity
)

export default router
