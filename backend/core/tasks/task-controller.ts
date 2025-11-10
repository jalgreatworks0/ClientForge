/**
 * Task Controller
 * HTTP request handlers for tasks and activities API
 */

import { Response, NextFunction } from 'express'
import { AuthRequest } from '../../middleware/authenticate'
import { taskService } from './task-service'
import {
  createTaskSchema,
  updateTaskSchema,
  taskListOptionsSchema,
  bulkTaskOperationSchema,
  createActivitySchema,
  updateActivitySchema,
  activityListOptionsSchema,
  createTaskReminderSchema,
  searchQuerySchema,
  entityActivitiesQuerySchema,
  entityTasksQuerySchema,
} from './task-validators'
import {
  CreateActivityInput,
} from './task-types'

// =====================================================
// TASK CONTROLLERS
// =====================================================

/**
 * GET /api/v1/tasks
 * List tasks with pagination and filters
 */
export const listTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const options = taskListOptionsSchema.parse({
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      sortBy: req.query.sortBy || 'createdAt',
      sortOrder: req.query.sortOrder || 'desc',
      filters: {
        search: req.query.search,
        status: req.query.status,
        priority: req.query.priority,
        assignedTo: req.query.assignedTo,
        createdBy: req.query.createdBy,
        dueDateFrom: req.query.dueDateFrom,
        dueDateTo: req.query.dueDateTo,
        relatedEntityType: req.query.relatedEntityType,
        relatedEntityId: req.query.relatedEntityId,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      },
    })

    const result = await taskService.listTasks(tenantId, options)

    res.json({
      success: true,
      data: result.tasks,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/tasks
 * Create a new task
 */
export const createTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = createTaskSchema.parse(req.body)

    const task = await taskService.createTask(tenantId, userId, validatedData)

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/tasks/:id
 * Get task by ID
 */
export const getTaskById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params
    const includeRelations = req.query.include === 'relations'

    const task = await taskService.getTaskById(id, tenantId, includeRelations)

    res.json({
      success: true,
      data: task,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/v1/tasks/:id
 * Update task
 */
export const updateTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    const validatedData = updateTaskSchema.parse(req.body)

    const task = await taskService.updateTask(id, tenantId, userId, validatedData)

    res.json({
      success: true,
      data: task,
      message: 'Task updated successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/v1/tasks/:id
 * Delete task (soft delete)
 */
export const deleteTask = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    await taskService.deleteTask(id, tenantId, userId)

    res.json({
      success: true,
      message: 'Task deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/tasks/search
 * Search tasks with full-text search
 */
export const searchTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const { q, limit } = searchQuerySchema.parse({
      q: req.query.q,
      limit: parseInt(req.query.limit as string, 10) || 20,
    })

    const tasks = await taskService.searchTasks(tenantId, q, limit)

    res.json({
      success: true,
      data: tasks,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/tasks/bulk
 * Bulk operations on tasks
 */
export const bulkOperation = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = bulkTaskOperationSchema.parse(req.body)

    const result = await taskService.bulkOperation(tenantId, userId, validatedData)

    res.json({
      success: true,
      data: result,
      message: `Bulk ${validatedData.operation} completed: ${result.success} succeeded, ${result.failed} failed`,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/tasks/statistics
 * Get task statistics and metrics
 */
export const getStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const statistics = await taskService.getStatistics(tenantId)

    res.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    next(error)
  }
}

// =====================================================
// ACTIVITY CONTROLLERS
// =====================================================

/**
 * GET /api/v1/activities
 * List activities with pagination and filters
 */
export const listActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const options = activityListOptionsSchema.parse({
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      sortBy: req.query.sortBy || 'performedAt',
      sortOrder: req.query.sortOrder || 'desc',
      filters: {
        search: req.query.search,
        type: req.query.type,
        entityType: req.query.entityType,
        entityId: req.query.entityId,
        performedBy: req.query.performedBy,
        performedAtFrom: req.query.performedAtFrom,
        performedAtTo: req.query.performedAtTo,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
      },
    })

    const result = await taskService.listActivities(tenantId, options)

    res.json({
      success: true,
      data: result.activities,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/activities
 * Create a new activity
 */
export const createActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId

    const validatedData = createActivitySchema.parse(req.body) as CreateActivityInput

    const activity = await taskService.createActivity(tenantId, userId, validatedData)

    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activity created successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/activities/:id
 * Get activity by ID
 */
export const getActivityById = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    const activity = await taskService.getActivityById(id, tenantId)

    res.json({
      success: true,
      data: activity,
    })
  } catch (error) {
    next(error)
  }
}

/**
 * PUT /api/v1/activities/:id
 * Update activity
 */
export const updateActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    const validatedData = updateActivitySchema.parse(req.body)

    const activity = await taskService.updateActivity(id, tenantId, userId, validatedData)

    res.json({
      success: true,
      data: activity,
      message: 'Activity updated successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * DELETE /api/v1/activities/:id
 * Delete activity (soft delete)
 */
export const deleteActivity = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const userId = req.user!.userId
    const { id } = req.params

    await taskService.deleteActivity(id, tenantId, userId)

    res.json({
      success: true,
      message: 'Activity deleted successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/activities/statistics
 * Get activity statistics and metrics
 */
export const getActivityStatistics = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId

    const statistics = await taskService.getActivityStatistics(tenantId)

    res.json({
      success: true,
      data: statistics,
    })
  } catch (error) {
    next(error)
  }
}

// =====================================================
// TASK REMINDER CONTROLLERS
// =====================================================

/**
 * POST /api/v1/tasks/:id/reminders
 * Create a task reminder
 */
export const createTaskReminder = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    const validatedData = createTaskReminderSchema.parse({
      ...req.body,
      taskId: id,
    })

    const reminder = await taskService.createTaskReminder(tenantId, validatedData)

    res.status(201).json({
      success: true,
      data: reminder,
      message: 'Reminder created successfully',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * GET /api/v1/tasks/:id/reminders
 * Get task reminders
 */
export const getTaskReminders = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { id } = req.params

    const reminders = await taskService.getTaskReminders(id, tenantId)

    res.json({
      success: true,
      data: reminders,
    })
  } catch (error) {
    next(error)
  }
}

// =====================================================
// ENTITY RELATIONSHIP CONTROLLERS
// =====================================================

/**
 * GET /api/v1/entities/:entityType/:entityId/activities
 * Get activities for a specific entity
 */
export const getEntityActivities = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tenantId = req.user!.tenantId
    const { entityType, entityId } = req.params

    const validated = entityActivitiesQuerySchema.parse({
      entityType,
      entityId,
      page: parseInt(req.query.page as string, 10) || 1,
      limit: parseInt(req.query.limit as string, 10) || 20,
      type: req.query.type,
    })

    const result = await taskService.listActivitiesForEntity(
      tenantId,
      validated.entityType,
      validated.entityId,
      validated.page,
      validated.limit
    )

    res.json({
      success: true,
      data: result.activities,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/tasks/import
 * Import tasks from CSV/Excel
 * TODO: Implement import logic
 */
export const importTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(501).json({
      success: false,
      message: 'Import functionality not yet implemented',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * POST /api/v1/tasks/export
 * Export tasks to CSV/Excel/JSON
 * TODO: Implement export logic
 */
export const exportTasks = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.status(501).json({
      success: false,
      message: 'Export functionality not yet implemented',
    })
  } catch (error) {
    next(error)
  }
}
