/**
 * Unit Tests: TaskService
 * Tests for task and activity business logic
 */

import { TaskService } from '../../../backend/core/tasks/task-service'
import { taskRepository } from '../../../backend/core/tasks/task-repository'
import { ValidationError, NotFoundError } from '../../../backend/utils/errors/app-error'
import { TaskStatus, TaskPriority, ActivityType } from '../../../backend/core/tasks/task-types'

// Mock the repository
jest.mock('../../../backend/core/tasks/task-repository')

const mockedTaskRepo = taskRepository as jest.Mocked<typeof taskRepository>

describe('TaskService', () => {
  let taskService: TaskService

  const mockTask = {
    id: 'task-123',
    tenantId: 'tenant-123',
    title: 'Follow up with Acme Corp',
    description: 'Discuss Q1 pricing and contract terms',
    status: TaskStatus.PENDING,
    priority: TaskPriority.HIGH,
    assignedTo: 'user-123',
    createdBy: 'user-456',
    dueDate: new Date('2025-12-31'),
    completedAt: null,
    startDate: new Date('2025-11-01'),
    relatedEntityType: 'deal',
    relatedEntityId: 'deal-123',
    tags: ['sales', 'urgent'],
    createdAt: new Date('2025-11-01'),
    updatedAt: new Date('2025-11-01'),
    deletedAt: null,
  }

  const mockActivity = {
    id: 'activity-123',
    tenantId: 'tenant-123',
    type: ActivityType.CALL,
    title: 'Discovery Call with John Doe',
    description: 'Discussed requirements and timeline',
    outcome: 'completed',
    entityType: 'contact',
    entityId: 'contact-123',
    performedBy: 'user-123',
    performedAt: new Date('2025-11-05'),
    durationMinutes: 30,
    emailSubject: null,
    emailTo: null,
    emailCc: null,
    emailBcc: null,
    meetingLocation: null,
    meetingStartTime: null,
    meetingEndTime: null,
    callDirection: 'outbound',
    callPhoneNumber: '+1234567890',
    tags: ['discovery', 'sales'],
    attachments: null,
    createdAt: new Date('2025-11-05'),
    updatedAt: new Date('2025-11-05'),
    deletedAt: null,
  }

  beforeEach(() => {
    taskService = new TaskService()
    jest.clearAllMocks()
  })

  describe('createTask', () => {
    it('should create task with valid data', async () => {
      const createData = {
        title: 'Follow up with Acme Corp',
        description: 'Discuss pricing',
        priority: TaskPriority.HIGH,
        assignedTo: 'user-123',
        dueDate: new Date('2025-12-31'),
        relatedEntityType: 'deal',
        relatedEntityId: 'deal-123',
      }

      mockedTaskRepo.create.mockResolvedValue(mockTask)

      const result = await taskService.createTask('tenant-123', 'user-456', createData)

      expect(result).toEqual(mockTask)
      expect(mockedTaskRepo.create).toHaveBeenCalledWith('tenant-123', {
        ...createData,
        createdBy: 'user-456',
      })
    })

    it('should throw error if start date is after due date', async () => {
      const createData = {
        title: 'Invalid task',
        startDate: new Date('2025-12-31'),
        dueDate: new Date('2025-11-01'),
      }

      await expect(
        taskService.createTask('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)

      expect(mockedTaskRepo.create).not.toHaveBeenCalled()
    })
  })

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      mockedTaskRepo.findById.mockResolvedValue(mockTask)

      const result = await taskService.getTaskById('task-123', 'tenant-123')

      expect(result).toEqual(mockTask)
      expect(mockedTaskRepo.findById).toHaveBeenCalledWith('task-123', 'tenant-123')
    })

    it('should throw NotFoundError when task not found', async () => {
      mockedTaskRepo.findById.mockResolvedValue(null)

      await expect(
        taskService.getTaskById('task-123', 'tenant-123')
      ).rejects.toThrow(NotFoundError)
    })

    it('should return task with relations when requested', async () => {
      const taskWithRelations = {
        ...mockTask,
        assignee: { id: 'user-123', firstName: 'John', lastName: 'Doe', email: 'john@example.com' },
        creator: { id: 'user-456', firstName: 'Jane', lastName: 'Smith', email: 'jane@example.com' },
      }

      mockedTaskRepo.findByIdWithRelations.mockResolvedValue(taskWithRelations as any)

      const result = await taskService.getTaskById('task-123', 'tenant-123', true)

      expect(result).toEqual(taskWithRelations)
      expect(mockedTaskRepo.findByIdWithRelations).toHaveBeenCalledWith('task-123', 'tenant-123')
    })
  })

  describe('updateTask', () => {
    it('should update task with valid data', async () => {
      const updateData = {
        title: 'Updated title',
        priority: TaskPriority.URGENT,
      }

      mockedTaskRepo.findById.mockResolvedValue(mockTask)
      mockedTaskRepo.update.mockResolvedValue({ ...mockTask, ...updateData })

      const result = await taskService.updateTask('task-123', 'tenant-123', 'user-123', updateData)

      expect(result.title).toBe('Updated title')
      expect(result.priority).toBe(TaskPriority.URGENT)
      expect(mockedTaskRepo.update).toHaveBeenCalledWith('task-123', 'tenant-123', updateData)
    })

    it('should throw error when task not found', async () => {
      mockedTaskRepo.findById.mockResolvedValue(null)

      await expect(
        taskService.updateTask('task-123', 'tenant-123', 'user-123', { title: 'Updated' })
      ).rejects.toThrow(NotFoundError)

      expect(mockedTaskRepo.update).not.toHaveBeenCalled()
    })

    it('should set completedAt when status changed to completed', async () => {
      const updateData = {
        status: TaskStatus.COMPLETED,
      }

      mockedTaskRepo.findById.mockResolvedValue(mockTask)
      mockedTaskRepo.update.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      })

      await taskService.updateTask('task-123', 'tenant-123', 'user-123', updateData)

      expect(mockedTaskRepo.update).toHaveBeenCalledWith(
        'task-123',
        'tenant-123',
        expect.objectContaining({
          status: TaskStatus.COMPLETED,
          completedAt: expect.any(Date),
        })
      )
    })

    it('should clear completedAt when status changed from completed', async () => {
      const completedTask = { ...mockTask, status: TaskStatus.COMPLETED, completedAt: new Date() }
      const updateData = {
        status: TaskStatus.IN_PROGRESS,
      }

      mockedTaskRepo.findById.mockResolvedValue(completedTask)
      mockedTaskRepo.update.mockResolvedValue({
        ...completedTask,
        status: TaskStatus.IN_PROGRESS,
        completedAt: null,
      })

      await taskService.updateTask('task-123', 'tenant-123', 'user-123', updateData)

      expect(mockedTaskRepo.update).toHaveBeenCalledWith(
        'task-123',
        'tenant-123',
        expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          completedAt: null,
        })
      )
    })

    it('should throw error if new dates are invalid', async () => {
      const updateData = {
        startDate: new Date('2025-12-31'),
        dueDate: new Date('2025-11-01'),
      }

      mockedTaskRepo.findById.mockResolvedValue(mockTask)

      await expect(
        taskService.updateTask('task-123', 'tenant-123', 'user-123', updateData)
      ).rejects.toThrow(ValidationError)
    })
  })

  describe('deleteTask', () => {
    it('should delete task successfully', async () => {
      mockedTaskRepo.findById.mockResolvedValue(mockTask)
      mockedTaskRepo.delete.mockResolvedValue(undefined)

      await taskService.deleteTask('task-123', 'tenant-123', 'user-123')

      expect(mockedTaskRepo.delete).toHaveBeenCalledWith('task-123', 'tenant-123')
    })

    it('should throw error when task not found', async () => {
      mockedTaskRepo.findById.mockResolvedValue(null)

      await expect(
        taskService.deleteTask('task-123', 'tenant-123', 'user-123')
      ).rejects.toThrow(NotFoundError)

      expect(mockedTaskRepo.delete).not.toHaveBeenCalled()
    })
  })

  describe('searchTasks', () => {
    it('should search tasks with query', async () => {
      const searchResults = [mockTask]
      mockedTaskRepo.search.mockResolvedValue(searchResults)

      const result = await taskService.searchTasks('tenant-123', 'Follow up', 20)

      expect(result).toEqual(searchResults)
      expect(mockedTaskRepo.search).toHaveBeenCalledWith('tenant-123', 'Follow up', 20)
    })

    it('should throw error for empty query', async () => {
      await expect(
        taskService.searchTasks('tenant-123', '', 20)
      ).rejects.toThrow(ValidationError)

      expect(mockedTaskRepo.search).not.toHaveBeenCalled()
    })

    it('should trim query before searching', async () => {
      mockedTaskRepo.search.mockResolvedValue([])

      await taskService.searchTasks('tenant-123', '  Follow up  ', 20)

      expect(mockedTaskRepo.search).toHaveBeenCalledWith('tenant-123', 'Follow up', 20)
    })
  })

  describe('bulkOperation', () => {
    it('should perform bulk delete', async () => {
      const taskIds = ['task-1', 'task-2', 'task-3']
      mockedTaskRepo.bulkDelete.mockResolvedValue(3)

      const result = await taskService.bulkOperation('tenant-123', 'user-123', {
        taskIds,
        operation: 'delete',
      })

      expect(result).toEqual({ success: 3, failed: 0 })
      expect(mockedTaskRepo.bulkDelete).toHaveBeenCalledWith(taskIds, 'tenant-123')
    })

    it('should perform bulk status change', async () => {
      const taskIds = ['task-1', 'task-2']

      mockedTaskRepo.findById.mockResolvedValue(mockTask)
      mockedTaskRepo.update.mockResolvedValue({ ...mockTask, status: TaskStatus.IN_PROGRESS })

      const result = await taskService.bulkOperation('tenant-123', 'user-123', {
        taskIds,
        operation: 'change_status',
        data: { status: TaskStatus.IN_PROGRESS },
      })

      expect(result.success).toBe(2)
      expect(result.failed).toBe(0)
    })

    it('should perform bulk assign', async () => {
      const taskIds = ['task-1', 'task-2']

      mockedTaskRepo.findById.mockResolvedValue(mockTask)
      mockedTaskRepo.update.mockResolvedValue({ ...mockTask, assignedTo: 'user-789' })

      const result = await taskService.bulkOperation('tenant-123', 'user-123', {
        taskIds,
        operation: 'assign',
        data: { assignedTo: 'user-789' },
      })

      expect(result.success).toBe(2)
    })

    it('should perform bulk add tags', async () => {
      const taskIds = ['task-1']
      const existingTask = { ...mockTask, tags: ['existing'] }

      mockedTaskRepo.findById.mockResolvedValue(existingTask)
      mockedTaskRepo.update.mockResolvedValue({ ...existingTask, tags: ['existing', 'new-tag'] })

      const result = await taskService.bulkOperation('tenant-123', 'user-123', {
        taskIds,
        operation: 'add_tags',
        data: { tags: ['new-tag'] },
      })

      expect(result.success).toBe(1)
      expect(mockedTaskRepo.update).toHaveBeenCalledWith(
        'task-1',
        'tenant-123',
        expect.objectContaining({
          tags: expect.arrayContaining(['existing', 'new-tag']),
        })
      )
    })

    it('should perform bulk remove tags', async () => {
      const taskIds = ['task-1']
      const existingTask = { ...mockTask, tags: ['tag1', 'tag2', 'tag3'] }

      mockedTaskRepo.findById.mockResolvedValue(existingTask)
      mockedTaskRepo.update.mockResolvedValue({ ...existingTask, tags: ['tag1', 'tag3'] })

      const result = await taskService.bulkOperation('tenant-123', 'user-123', {
        taskIds,
        operation: 'remove_tags',
        data: { tags: ['tag2'] },
      })

      expect(result.success).toBe(1)
      expect(mockedTaskRepo.update).toHaveBeenCalledWith(
        'task-1',
        'tenant-123',
        expect.objectContaining({
          tags: expect.not.arrayContaining(['tag2']),
        })
      )
    })

    it('should handle partial failures in bulk operations', async () => {
      const taskIds = ['task-1', 'task-2', 'task-3']

      mockedTaskRepo.findById
        .mockResolvedValueOnce(mockTask)
        .mockResolvedValueOnce(null) // This one fails
        .mockResolvedValueOnce(mockTask)
      mockedTaskRepo.update.mockResolvedValue(mockTask)

      const result = await taskService.bulkOperation('tenant-123', 'user-123', {
        taskIds,
        operation: 'update',
        data: { priority: TaskPriority.HIGH },
      })

      expect(result.success).toBe(2)
      expect(result.failed).toBe(1)
      expect(result.errors).toHaveLength(1)
    })
  })

  describe('createActivity', () => {
    it('should create activity with valid data', async () => {
      const createData = {
        type: ActivityType.CALL,
        title: 'Discovery Call',
        description: 'Discussed requirements',
        entityType: 'contact',
        entityId: 'contact-123',
        durationMinutes: 30,
        callDirection: 'outbound' as const,
        callPhoneNumber: '+1234567890',
      }

      mockedTaskRepo.createActivity.mockResolvedValue(mockActivity)

      const result = await taskService.createActivity('tenant-123', 'user-123', createData)

      expect(result).toEqual(mockActivity)
      expect(mockedTaskRepo.createActivity).toHaveBeenCalledWith('tenant-123', 'user-123', createData)
    })

    it('should throw error if meeting start time is after end time', async () => {
      const createData = {
        type: ActivityType.MEETING,
        title: 'Invalid meeting',
        entityType: 'contact',
        entityId: 'contact-123',
        meetingStartTime: new Date('2025-11-05T15:00:00'),
        meetingEndTime: new Date('2025-11-05T14:00:00'),
      }

      await expect(
        taskService.createActivity('tenant-123', 'user-123', createData)
      ).rejects.toThrow(ValidationError)

      expect(mockedTaskRepo.createActivity).not.toHaveBeenCalled()
    })

    it('should calculate duration from meeting times if not provided', async () => {
      const createData = {
        type: ActivityType.MEETING,
        title: 'Team Meeting',
        entityType: 'account',
        entityId: 'account-123',
        meetingStartTime: new Date('2025-11-05T14:00:00'),
        meetingEndTime: new Date('2025-11-05T15:30:00'),
      }

      mockedTaskRepo.createActivity.mockResolvedValue(mockActivity)

      await taskService.createActivity('tenant-123', 'user-123', createData)

      expect(mockedTaskRepo.createActivity).toHaveBeenCalledWith(
        'tenant-123',
        'user-123',
        expect.objectContaining({
          durationMinutes: 90,
        })
      )
    })
  })

  describe('getStatistics', () => {
    it('should return task statistics', async () => {
      const tasks = [
        mockTask,
        { ...mockTask, id: 'task-2', status: TaskStatus.COMPLETED, completedAt: new Date() },
        { ...mockTask, id: 'task-3', status: TaskStatus.IN_PROGRESS },
        { ...mockTask, id: 'task-4', status: TaskStatus.CANCELLED },
      ]

      mockedTaskRepo.list.mockResolvedValue({
        tasks,
        total: 4,
        page: 1,
        limit: 10000,
        totalPages: 1,
      })

      const stats = await taskService.getStatistics('tenant-123')

      expect(stats.totalTasks).toBe(4)
      expect(stats.pendingTasks).toBe(1)
      expect(stats.inProgressTasks).toBe(1)
      expect(stats.completedTasks).toBe(1)
      expect(stats.cancelledTasks).toBe(1)
      expect(stats).toHaveProperty('byPriority')
      expect(stats).toHaveProperty('byAssignee')
      expect(stats).toHaveProperty('completionRate')
    })
  })

  describe('createTaskReminder', () => {
    it('should create reminder for valid task', async () => {
      const reminderData = {
        taskId: 'task-123',
        remindAt: new Date('2025-12-30'),
        reminderType: 'email' as const,
      }

      const mockReminder = {
        id: 'reminder-123',
        tenantId: 'tenant-123',
        taskId: 'task-123',
        remindAt: new Date('2025-12-30'),
        reminderType: 'email',
        isSent: false,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockedTaskRepo.findById.mockResolvedValue(mockTask)
      mockedTaskRepo.createTaskReminder.mockResolvedValue(mockReminder as any)

      const result = await taskService.createTaskReminder('tenant-123', reminderData)

      expect(result).toEqual(mockReminder)
      expect(mockedTaskRepo.createTaskReminder).toHaveBeenCalledWith('tenant-123', reminderData)
    })

    it('should throw error if task not found', async () => {
      const reminderData = {
        taskId: 'invalid-task',
        remindAt: new Date('2025-12-30'),
        reminderType: 'email' as const,
      }

      mockedTaskRepo.findById.mockResolvedValue(null)

      await expect(
        taskService.createTaskReminder('tenant-123', reminderData)
      ).rejects.toThrow(NotFoundError)

      expect(mockedTaskRepo.createTaskReminder).not.toHaveBeenCalled()
    })

    it('should throw error if reminder time is in the past', async () => {
      const reminderData = {
        taskId: 'task-123',
        remindAt: new Date('2020-01-01'),
        reminderType: 'email' as const,
      }

      mockedTaskRepo.findById.mockResolvedValue(mockTask)

      await expect(
        taskService.createTaskReminder('tenant-123', reminderData)
      ).rejects.toThrow(ValidationError)

      expect(mockedTaskRepo.createTaskReminder).not.toHaveBeenCalled()
    })
  })
})
