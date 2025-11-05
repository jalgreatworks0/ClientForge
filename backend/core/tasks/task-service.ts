/**
 * Task Service
 * Business logic for task and activity management
 */

import { taskRepository } from './task-repository'
import {
  Task,
  TaskWithRelations,
  Activity,
  ActivityWithRelations,
  ActivityParticipant,
  TaskReminder,
  CreateTaskInput,
  UpdateTaskInput,
  CreateActivityInput,
  UpdateActivityInput,
  CreateTaskReminderInput,
  TaskListOptions,
  TaskListResult,
  ActivityListOptions,
  ActivityListResult,
  BulkTaskOperationInput,
  BulkOperationResult,
  TaskStatistics,
  ActivityStatistics,
  TaskStatus,
  TaskPriority,
} from './task-types'
import { ValidationError, NotFoundError } from '../../utils/errors/app-error'

export class TaskService {
  // =====================================================
  // TASK OPERATIONS
  // =====================================================

  async createTask(tenantId: string, userId: string, data: CreateTaskInput): Promise<Task> {
    // Validate dates
    if (data.dueDate && data.startDate) {
      if (new Date(data.startDate) > new Date(data.dueDate)) {
        throw new ValidationError('Start date cannot be after due date')
      }
    }

    // Set createdBy to current user
    const taskData = {
      ...data,
      createdBy: userId,
    }

    const task = await taskRepository.create(tenantId, taskData)

    return task
  }

  async getTaskById(id: string, tenantId: string, includeRelations: boolean = false): Promise<Task | TaskWithRelations> {
    const task = includeRelations
      ? await taskRepository.findByIdWithRelations(id, tenantId)
      : await taskRepository.findById(id, tenantId)

    if (!task) {
      throw new NotFoundError('Task not found')
    }

    return task
  }

  async listTasks(tenantId: string, options: TaskListOptions): Promise<TaskListResult> {
    return await taskRepository.list(tenantId, options)
  }

  async updateTask(id: string, tenantId: string, userId: string, data: UpdateTaskInput): Promise<Task> {
    // Verify task exists
    const existingTask = await taskRepository.findById(id, tenantId)
    if (!existingTask) {
      throw new NotFoundError('Task not found')
    }

    // Validate dates if being updated
    if (data.dueDate || data.startDate) {
      const newDueDate = data.dueDate ? new Date(data.dueDate) : existingTask.dueDate
      const newStartDate = data.startDate ? new Date(data.startDate) : existingTask.startDate

      if (newStartDate && newDueDate && newStartDate > newDueDate) {
        throw new ValidationError('Start date cannot be after due date')
      }
    }

    // If status changed to completed, set completedAt
    if (data.status === TaskStatus.COMPLETED && existingTask.status !== TaskStatus.COMPLETED) {
      data.completedAt = new Date()
    }

    // If status changed from completed, clear completedAt
    if (data.status && data.status !== TaskStatus.COMPLETED && existingTask.status === TaskStatus.COMPLETED) {
      data.completedAt = null
    }

    const task = await taskRepository.update(id, tenantId, data)

    return task
  }

  async deleteTask(id: string, tenantId: string, userId: string): Promise<void> {
    const task = await taskRepository.findById(id, tenantId)
    if (!task) {
      throw new NotFoundError('Task not found')
    }

    await taskRepository.delete(id, tenantId)
  }

  async searchTasks(tenantId: string, query: string, limit: number): Promise<Task[]> {
    if (!query || query.trim().length === 0) {
      throw new ValidationError('Search query cannot be empty')
    }

    return await taskRepository.search(tenantId, query.trim(), limit)
  }

  async bulkOperation(tenantId: string, userId: string, input: BulkTaskOperationInput): Promise<BulkOperationResult> {
    const { taskIds, operation, data } = input

    let success = 0
    let failed = 0
    const errors: Array<{ id: string; error: string }> = []

    if (operation === 'delete') {
      success = await taskRepository.bulkDelete(taskIds, tenantId)
      failed = taskIds.length - success
      return { success, failed }
    }

    // For other operations, process individually
    for (const taskId of taskIds) {
      try {
        const task = await taskRepository.findById(taskId, tenantId)
        if (!task) {
          failed++
          errors.push({ id: taskId, error: 'Task not found' })
          continue
        }

        let updateData: UpdateTaskInput = {}

        switch (operation) {
          case 'update':
            updateData = data || {}
            break

          case 'assign':
            if (!data?.assignedTo) {
              throw new ValidationError('assignedTo is required for assign operation')
            }
            updateData = { assignedTo: data.assignedTo }
            break

          case 'change_status':
            if (!data?.status) {
              throw new ValidationError('status is required for change_status operation')
            }
            updateData = { status: data.status }
            break

          case 'change_priority':
            if (!data?.priority) {
              throw new ValidationError('priority is required for change_priority operation')
            }
            updateData = { priority: data.priority }
            break

          case 'add_tags':
            if (!data?.tags || data.tags.length === 0) {
              throw new ValidationError('tags are required for add_tags operation')
            }
            updateData = {
              tags: [...new Set([...(task.tags || []), ...data.tags])],
            }
            break

          case 'remove_tags':
            if (!data?.tags || data.tags.length === 0) {
              throw new ValidationError('tags are required for remove_tags operation')
            }
            updateData = {
              tags: (task.tags || []).filter((tag) => !data.tags!.includes(tag)),
            }
            break

          default:
            throw new ValidationError(`Unknown operation: ${operation}`)
        }

        await taskRepository.update(taskId, tenantId, updateData)
        success++
      } catch (error: any) {
        failed++
        errors.push({ id: taskId, error: error.message })
      }
    }

    return {
      success,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    }
  }

  async getStatistics(tenantId: string): Promise<TaskStatistics> {
    const result = await taskRepository.list(tenantId, {
      page: 1,
      limit: 10000, // Get all for statistics
      sortBy: 'createdAt',
      sortOrder: 'desc',
    })

    const tasks = result.tasks
    const now = new Date()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const stats: TaskStatistics = {
      totalTasks: tasks.length,
      pendingTasks: tasks.filter((t) => t.status === TaskStatus.PENDING).length,
      inProgressTasks: tasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length,
      completedTasks: tasks.filter((t) => t.status === TaskStatus.COMPLETED).length,
      cancelledTasks: tasks.filter((t) => t.status === TaskStatus.CANCELLED).length,
      onHoldTasks: tasks.filter((t) => t.status === TaskStatus.ON_HOLD).length,
      overdueTasks: tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) < now && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED
      ).length,
      dueTodayTasks: tasks.filter((t) => t.dueDate && new Date(t.dueDate) <= todayEnd && new Date(t.dueDate) >= now).length,
      dueThisWeekTasks: tasks.filter(
        (t) => t.dueDate && new Date(t.dueDate) <= weekEnd && new Date(t.dueDate) >= now
      ).length,
      byPriority: {
        low: tasks.filter((t) => t.priority === TaskPriority.LOW).length,
        medium: tasks.filter((t) => t.priority === TaskPriority.MEDIUM).length,
        high: tasks.filter((t) => t.priority === TaskPriority.HIGH).length,
        urgent: tasks.filter((t) => t.priority === TaskPriority.URGENT).length,
      },
      byAssignee: this.calculateByAssignee(tasks),
      completionRate: tasks.length > 0 ? (stats.completedTasks / tasks.length) * 100 : 0,
      averageCompletionTime: this.calculateAverageCompletionTime(tasks),
    }

    return stats
  }

  // =====================================================
  // ACTIVITY OPERATIONS
  // =====================================================

  async createActivity(tenantId: string, userId: string, data: CreateActivityInput): Promise<Activity> {
    // Validate meeting times
    if (data.meetingStartTime && data.meetingEndTime) {
      if (new Date(data.meetingStartTime) >= new Date(data.meetingEndTime)) {
        throw new ValidationError('Meeting start time must be before end time')
      }
    }

    // Calculate duration from meeting times if not provided
    if (data.meetingStartTime && data.meetingEndTime && !data.durationMinutes) {
      const start = new Date(data.meetingStartTime)
      const end = new Date(data.meetingEndTime)
      data.durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
    }

    const activity = await taskRepository.createActivity(tenantId, userId, data)

    return activity
  }

  async getActivityById(id: string, tenantId: string): Promise<Activity> {
    const activity = await taskRepository.findActivityById(id, tenantId)
    if (!activity) {
      throw new NotFoundError('Activity not found')
    }
    return activity
  }

  async listActivities(tenantId: string, options: ActivityListOptions): Promise<ActivityListResult> {
    return await taskRepository.listActivities(tenantId, options)
  }

  async listActivitiesForEntity(
    tenantId: string,
    entityType: string,
    entityId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<ActivityListResult> {
    return await taskRepository.listActivities(tenantId, {
      page,
      limit,
      sortBy: 'performedAt',
      sortOrder: 'desc',
      filters: {
        entityType,
        entityId,
      },
    })
  }

  async updateActivity(id: string, tenantId: string, userId: string, data: UpdateActivityInput): Promise<Activity> {
    const existingActivity = await taskRepository.findActivityById(id, tenantId)
    if (!existingActivity) {
      throw new NotFoundError('Activity not found')
    }

    // Validate meeting times if being updated
    if (data.meetingStartTime || data.meetingEndTime) {
      const newStartTime = data.meetingStartTime
        ? new Date(data.meetingStartTime)
        : existingActivity.meetingStartTime
      const newEndTime = data.meetingEndTime ? new Date(data.meetingEndTime) : existingActivity.meetingEndTime

      if (newStartTime && newEndTime && newStartTime >= newEndTime) {
        throw new ValidationError('Meeting start time must be before end time')
      }
    }

    const activity = await taskRepository.updateActivity(id, tenantId, data)
    return activity
  }

  async deleteActivity(id: string, tenantId: string, userId: string): Promise<void> {
    const activity = await taskRepository.findActivityById(id, tenantId)
    if (!activity) {
      throw new NotFoundError('Activity not found')
    }

    await taskRepository.deleteActivity(id, tenantId)
  }

  async getActivityStatistics(tenantId: string): Promise<ActivityStatistics> {
    const result = await taskRepository.listActivities(tenantId, {
      page: 1,
      limit: 10000, // Get all for statistics
      sortBy: 'performedAt',
      sortOrder: 'desc',
    })

    const activities = result.activities

    const byType = {
      call: activities.filter((a) => a.type === 'call').length,
      email: activities.filter((a) => a.type === 'email').length,
      meeting: activities.filter((a) => a.type === 'meeting').length,
      note: activities.filter((a) => a.type === 'note').length,
      task: activities.filter((a) => a.type === 'task').length,
      custom: activities.filter((a) => a.type === 'custom').length,
    }

    const entityCounts = new Map<string, number>()
    activities.forEach((a) => {
      const count = entityCounts.get(a.entityType) || 0
      entityCounts.set(a.entityType, count + 1)
    })

    const byEntity = Array.from(entityCounts.entries())
      .map(([entityType, count]) => ({ entityType, count }))
      .sort((a, b) => b.count - a.count)

    const userActivityCounts = new Map<string, number>()
    activities.forEach((a) => {
      const count = userActivityCounts.get(a.performedBy) || 0
      userActivityCounts.set(a.performedBy, count + 1)
    })

    const mostActiveUser =
      userActivityCounts.size > 0
        ? Array.from(userActivityCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([userId, activityCount]) => ({
              userId,
              userName: 'Unknown', // TODO: Fetch user name from users table
              activityCount,
            }))[0]
        : null

    return {
      totalActivities: activities.length,
      byType,
      byEntity,
      lastActivityDate: activities.length > 0 ? activities[0].performedAt : null,
      mostActiveUser,
    }
  }

  // =====================================================
  // TASK REMINDERS
  // =====================================================

  async createTaskReminder(tenantId: string, data: CreateTaskReminderInput): Promise<TaskReminder> {
    // Verify task exists
    const task = await taskRepository.findById(data.taskId, tenantId)
    if (!task) {
      throw new NotFoundError('Task not found')
    }

    // Validate reminder time is in the future
    if (new Date(data.remindAt) <= new Date()) {
      throw new ValidationError('Reminder time must be in the future')
    }

    return await taskRepository.createTaskReminder(tenantId, data)
  }

  async getTaskReminders(taskId: string, tenantId: string): Promise<TaskReminder[]> {
    // Verify task exists
    const task = await taskRepository.findById(taskId, tenantId)
    if (!task) {
      throw new NotFoundError('Task not found')
    }

    return await taskRepository.getTaskReminders(taskId, tenantId)
  }

  // =====================================================
  // HELPER METHODS
  // =====================================================

  private calculateByAssignee(
    tasks: Task[]
  ): Array<{ userId: string; userName: string; taskCount: number }> {
    const assigneeCounts = new Map<string, number>()

    tasks.forEach((task) => {
      if (task.assignedTo) {
        const count = assigneeCounts.get(task.assignedTo) || 0
        assigneeCounts.set(task.assignedTo, count + 1)
      }
    })

    return Array.from(assigneeCounts.entries())
      .map(([userId, taskCount]) => ({
        userId,
        userName: 'Unknown', // TODO: Fetch user name from users table
        taskCount,
      }))
      .sort((a, b) => b.taskCount - a.taskCount)
  }

  private calculateAverageCompletionTime(tasks: Task[]): number | null {
    const completedTasks = tasks.filter(
      (t) => t.status === TaskStatus.COMPLETED && t.completedAt && t.createdAt
    )

    if (completedTasks.length === 0) {
      return null
    }

    const totalTime = completedTasks.reduce((sum, task) => {
      const created = new Date(task.createdAt).getTime()
      const completed = new Date(task.completedAt!).getTime()
      return sum + (completed - created)
    }, 0)

    const avgMs = totalTime / completedTasks.length
    const avgDays = avgMs / (1000 * 60 * 60 * 24)

    return Math.round(avgDays * 10) / 10 // Round to 1 decimal
  }
}

// Export singleton instance
export const taskService = new TaskService()
