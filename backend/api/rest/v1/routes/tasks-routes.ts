/**
 * Tasks & Activities API Routes
 * RESTful endpoints for task management and activity tracking
 */

import { Router } from 'express'

import { authenticate } from '../../../../middleware/authenticate'
import { requirePermission } from '../../../../middleware/authorize'
import { validateRequest } from '../../../../middleware/validate-request'
import * as taskController from '../../../../core/tasks/task-controller'
import {
  createTaskSchema,
  updateTaskSchema,
  bulkTaskOperationSchema,
  createActivitySchema,
  updateActivitySchema,
  createTaskReminderSchema,
} from '../../../../core/tasks/task-validators'

const router = Router()

// All routes require authentication
router.use(authenticate)

// =====================================================
// TASK ROUTES
// =====================================================

/**
 * GET /api/v1/tasks/statistics
 * Get task statistics and metrics
 *
 * @returns {200} Statistics object
 * @requires permission:tasks:read
 */
router.get(
  '/statistics',
  requirePermission('tasks:read'),
  taskController.getStatistics
)

/**
 * GET /api/v1/tasks/search
 * Search tasks with full-text search
 *
 * Query params:
 * @param {string} q - Search query
 * @param {number} limit - Results limit (default: 20, max: 100)
 *
 * @returns {200} Array of matching tasks
 * @requires permission:tasks:read
 */
router.get(
  '/search',
  requirePermission('tasks:read'),
  taskController.searchTasks
)

/**
 * POST /api/v1/tasks/export
 * Export tasks to CSV/Excel/JSON
 *
 * @body {string} format - Export format (csv, xlsx, json)
 * @body {object} filters - Optional filters
 *
 * @returns {200} Export file
 * @requires permission:tasks:export
 */
router.post(
  '/export',
  requirePermission('tasks:export'),
  taskController.exportTasks
)

/**
 * POST /api/v1/tasks/import
 * Import tasks from CSV/Excel
 *
 * @body {file} file - CSV or Excel file
 *
 * @returns {200} Import results
 * @requires permission:tasks:create
 */
router.post(
  '/import',
  requirePermission('tasks:create'),
  taskController.importTasks
)

/**
 * POST /api/v1/tasks/bulk
 * Bulk operations on tasks
 *
 * @body {string[]} taskIds - Array of task IDs
 * @body {string} operation - Operation type (update, delete, assign, change_status, change_priority, add_tags, remove_tags)
 * @body {object} data - Operation data
 *
 * @returns {200} Operation results
 * @requires permission:tasks:update
 */
router.post(
  '/bulk',
  requirePermission('tasks:update'),
  validateRequest({ body: bulkTaskOperationSchema }),
  taskController.bulkOperation
)

/**
 * GET /api/v1/tasks
 * List tasks with pagination and filters
 *
 * Query params:
 * @param {number} page - Page number (default: 1)
 * @param {number} limit - Items per page (default: 20, max: 100)
 * @param {string} sortBy - Sort field (default: createdAt)
 * @param {string} sortOrder - Sort order (asc, desc)
 * @param {string} search - Search term
 * @param {string} status - Filter by status
 * @param {string} priority - Filter by priority
 * @param {string} assignedTo - Filter by assignee
 * @param {string} createdBy - Filter by creator
 * @param {date} dueDateFrom - Filter by due date from
 * @param {date} dueDateTo - Filter by due date to
 * @param {string} relatedEntityType - Filter by related entity type
 * @param {string} relatedEntityId - Filter by related entity ID
 * @param {string[]} tags - Filter by tags
 *
 * @returns {200} Paginated list of tasks
 * @requires permission:tasks:read
 */
router.get(
  '/',
  requirePermission('tasks:read'),
  taskController.listTasks
)

/**
 * POST /api/v1/tasks
 * Create a new task
 *
 * @body {string} title - Task title (required)
 * @body {string} description - Task description
 * @body {string} status - Task status (pending, in_progress, completed, cancelled, on_hold)
 * @body {string} priority - Task priority (low, medium, high, urgent)
 * @body {string} assignedTo - Assigned user ID
 * @body {date} dueDate - Due date
 * @body {date} startDate - Start date
 * @body {string} relatedEntityType - Related entity type (contact, account, deal, etc.)
 * @body {string} relatedEntityId - Related entity ID
 * @body {string[]} tags - Tags
 *
 * @returns {201} Created task
 * @requires permission:tasks:create
 */
router.post(
  '/',
  requirePermission('tasks:create'),
  validateRequest({ body: createTaskSchema }),
  taskController.createTask
)

/**
 * GET /api/v1/tasks/:id
 * Get task by ID
 *
 * Query params:
 * @param {string} include - Include related data (relations)
 *
 * @returns {200} Task details
 * @requires permission:tasks:read
 */
router.get(
  '/:id',
  requirePermission('tasks:read'),
  taskController.getTaskById
)

/**
 * PUT /api/v1/tasks/:id
 * Update task
 *
 * @body All fields are optional (partial update)
 *
 * @returns {200} Updated task
 * @requires permission:tasks:update
 */
router.put(
  '/:id',
  requirePermission('tasks:update'),
  validateRequest({ body: updateTaskSchema }),
  taskController.updateTask
)

/**
 * DELETE /api/v1/tasks/:id
 * Delete task (soft delete)
 *
 * @returns {200} Success message
 * @requires permission:tasks:delete
 */
router.delete(
  '/:id',
  requirePermission('tasks:delete'),
  taskController.deleteTask
)

/**
 * POST /api/v1/tasks/:id/reminders
 * Create a task reminder
 *
 * @body {date} remindAt - Reminder date/time (required)
 * @body {string} reminderType - Reminder type (email, notification, sms)
 *
 * @returns {201} Created reminder
 * @requires permission:tasks:update
 */
router.post(
  '/:id/reminders',
  requirePermission('tasks:update'),
  validateRequest({ body: createTaskReminderSchema }),
  taskController.createTaskReminder
)

/**
 * GET /api/v1/tasks/:id/reminders
 * Get task reminders
 *
 * @returns {200} Array of reminders
 * @requires permission:tasks:read
 */
router.get(
  '/:id/reminders',
  requirePermission('tasks:read'),
  taskController.getTaskReminders
)

export default router
