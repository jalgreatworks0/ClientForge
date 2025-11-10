/**
 * Queue Service Tests
 */

import { queueService } from '../../../backend/services/queue/queue.service'
import Queue from 'bull'

// Mock Bull Queue
jest.mock('bull')

describe('QueueService', () => {
  let mockQueue: any

  beforeEach(() => {
    mockQueue = {
      process: jest.fn(),
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getWaitingCount: jest.fn().mockResolvedValue(5),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getCompletedCount: jest.fn().mockResolvedValue(100),
      getFailedCount: jest.fn().mockResolvedValue(3),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    }

    ;(Queue as unknown as jest.Mock).mockReturnValue(mockQueue)
    jest.clearAllMocks()
  })

  describe('initialize', () => {
    it('should initialize all queues', () => {
      queueService.initialize()

      // Should create 4 queues: email, search-index, reports, notifications
      expect(Queue).toHaveBeenCalledTimes(4)
      expect(Queue).toHaveBeenCalledWith('email', expect.any(Object))
      expect(Queue).toHaveBeenCalledWith('search-index', expect.any(Object))
      expect(Queue).toHaveBeenCalledWith('reports', expect.any(Object))
      expect(Queue).toHaveBeenCalledWith('notifications', expect.any(Object))
    })

    it('should set up event listeners for all queues', () => {
      queueService.initialize()

      // Each queue should have event listeners set up
      expect(mockQueue.on).toHaveBeenCalledWith('completed', expect.any(Function))
      expect(mockQueue.on).toHaveBeenCalledWith('failed', expect.any(Function))
      expect(mockQueue.on).toHaveBeenCalledWith('stalled', expect.any(Function))
    })
  })

  describe('addEmailJob', () => {
    beforeEach(() => {
      queueService.initialize()
    })

    it('should add email job to queue', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>',
        tenantId: 'tenant-123',
      }

      const job = await queueService.addEmailJob(emailData)

      expect(mockQueue.add).toHaveBeenCalledWith(emailData, undefined)
      expect(job).toEqual({ id: 'job-123' })
    })

    it('should accept custom job options', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Urgent Email',
        html: '<p>Urgent</p>',
        tenantId: 'tenant-123',
      }

      const options = { priority: 1, delay: 5000 }

      await queueService.addEmailJob(emailData, options)

      expect(mockQueue.add).toHaveBeenCalledWith(emailData, options)
    })
  })

  describe('addSearchIndexJob', () => {
    beforeEach(() => {
      queueService.initialize()
    })

    it('should add search index job to queue', async () => {
      const indexData = {
        action: 'index' as const,
        index: 'contacts',
        id: 'contact-123',
        document: { name: 'John Doe' },
        tenantId: 'tenant-123',
      }

      const job = await queueService.addSearchIndexJob(indexData)

      expect(mockQueue.add).toHaveBeenCalledWith(indexData, undefined)
      expect(job).toEqual({ id: 'job-123' })
    })
  })

  describe('addReportJob', () => {
    beforeEach(() => {
      queueService.initialize()
    })

    it('should add report job to queue', async () => {
      const reportData = {
        reportType: 'sales' as const,
        userId: 'user-123',
        tenantId: 'tenant-123',
        filters: { startDate: '2025-01-01', endDate: '2025-01-31' },
        format: 'pdf' as const,
      }

      const job = await queueService.addReportJob(reportData)

      expect(mockQueue.add).toHaveBeenCalledWith(reportData, undefined)
      expect(job).toEqual({ id: 'job-123' })
    })
  })

  describe('addNotificationJob', () => {
    beforeEach(() => {
      queueService.initialize()
    })

    it('should add notification job to queue', async () => {
      const notificationData = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        type: 'deal_update' as const,
        title: 'Deal Updated',
        message: 'Your deal has been updated',
        data: { dealId: 'deal-123' },
      }

      const job = await queueService.addNotificationJob(notificationData)

      expect(mockQueue.add).toHaveBeenCalledWith(notificationData, undefined)
      expect(job).toEqual({ id: 'job-123' })
    })
  })

  describe('getQueueStats', () => {
    beforeEach(() => {
      queueService.initialize()
    })

    it('should return queue statistics', async () => {
      const stats = await queueService.getQueueStats('email')

      expect(stats).toEqual({
        name: 'email',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 0,
        total: 110,
      })
    })

    it('should throw error for invalid queue name', async () => {
      await expect(queueService.getQueueStats('invalid' as any)).rejects.toThrow()
    })
  })

  describe('shutdown', () => {
    beforeEach(() => {
      queueService.initialize()
    })

    it('should close all queues gracefully', async () => {
      await queueService.shutdown()

      // Should close all 4 queues
      expect(mockQueue.close).toHaveBeenCalledTimes(4)
    })
  })
})
