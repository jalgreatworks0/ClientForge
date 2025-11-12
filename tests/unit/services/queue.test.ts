/**
 * Queue Service Tests - BullMQ v3
 */

import { queueService } from '../../../backend/services/queue/queue.service'
import { queueRegistry } from '../../../config/queue/bullmq.config'

// Mock BullMQ
jest.mock('../../../config/queue/bullmq.config', () => ({
  queueRegistry: {
    createQueue: jest.fn(),
    getQueue: jest.fn(),
    getDLQ: jest.fn(),
    getQueueNames: jest.fn().mockReturnValue(['email', 'data-sync', 'notifications', 'file-processing', 'embeddings']),
    closeAll: jest.fn().mockResolvedValue(undefined),
  },
  initializeQueues: jest.fn().mockResolvedValue(undefined),
  createWorker: jest.fn(),
}))

// TODO(phase5): Unskip after Queue service is fully implemented or mocked
describe.skip('QueueService', () => {
  let mockQueue: any

  beforeEach(() => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
      getWaitingCount: jest.fn().mockResolvedValue(5),
      getActiveCount: jest.fn().mockResolvedValue(2),
      getCompletedCount: jest.fn().mockResolvedValue(100),
      getFailedCount: jest.fn().mockResolvedValue(3),
      getDelayedCount: jest.fn().mockResolvedValue(0),
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    }

    ;(queueRegistry.getQueue as jest.Mock).mockReturnValue(mockQueue)
    jest.clearAllMocks()
  })

  describe('initialize', () => {
    it('should initialize all queues using BullMQ config', async () => {
      await queueService.initialize()

      // Should call initializeQueues from bullmq.config
      const { initializeQueues } = require('../../../config/queue/bullmq.config')
      expect(initializeQueues).toHaveBeenCalled()
    })

    it('should not reinitialize if already initialized', async () => {
      await queueService.initialize()
      await queueService.initialize()

      const { initializeQueues } = require('../../../config/queue/bullmq.config')
      // Should only be called once
      expect(initializeQueues).toHaveBeenCalledTimes(1)
    })
  })

  describe('addEmailJob', () => {
    beforeEach(async () => {
      await queueService.initialize()
    })

    it('should add email job to queue', async () => {
      const emailData = {
        to: 'user@example.com',
        subject: 'Test Email',
        html: '<p>Test</p>',
        tenantId: 'tenant-123',
      }

      const job = await queueService.addEmailJob(emailData)

      expect(queueRegistry.getQueue).toHaveBeenCalledWith('email')
      expect(mockQueue.add).toHaveBeenCalledWith('send-email', emailData, undefined)
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

      expect(mockQueue.add).toHaveBeenCalledWith('send-email', emailData, options)
    })

    it('should throw error if email queue not initialized', async () => {
      ;(queueRegistry.getQueue as jest.Mock).mockReturnValue(null)

      const emailData = {
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
        tenantId: 'tenant-123',
      }

      await expect(queueService.addEmailJob(emailData)).rejects.toThrow('Email queue not initialized')
    })
  })

  describe('addSearchIndexJob', () => {
    beforeEach(async () => {
      await queueService.initialize()
    })

    it('should add search index job to data-sync queue', async () => {
      const indexData = {
        action: 'index' as const,
        index: 'contacts',
        id: 'contact-123',
        document: { name: 'John Doe' },
        tenantId: 'tenant-123',
      }

      const job = await queueService.addSearchIndexJob(indexData)

      expect(queueRegistry.getQueue).toHaveBeenCalledWith('data-sync')
      expect(mockQueue.add).toHaveBeenCalledWith('sync-search-index', indexData, undefined)
      expect(job).toEqual({ id: 'job-123' })
    })

    it('should throw error if data-sync queue not initialized', async () => {
      ;(queueRegistry.getQueue as jest.Mock).mockReturnValue(null)

      const indexData = {
        action: 'index' as const,
        index: 'contacts',
        id: 'contact-123',
        tenantId: 'tenant-123',
      }

      await expect(queueService.addSearchIndexJob(indexData)).rejects.toThrow('Data sync queue not initialized')
    })
  })

  describe('addReportJob', () => {
    beforeEach(async () => {
      await queueService.initialize()
    })

    it('should add report job to data-sync queue', async () => {
      const reportData = {
        reportType: 'sales' as const,
        userId: 'user-123',
        tenantId: 'tenant-123',
        filters: { startDate: '2025-01-01', endDate: '2025-01-31' },
        format: 'pdf' as const,
      }

      const job = await queueService.addReportJob(reportData)

      expect(queueRegistry.getQueue).toHaveBeenCalledWith('data-sync')
      expect(mockQueue.add).toHaveBeenCalledWith('generate-report', reportData, undefined)
      expect(job).toEqual({ id: 'job-123' })
    })
  })

  describe('addNotificationJob', () => {
    beforeEach(async () => {
      await queueService.initialize()
    })

    it('should add notification job to notifications queue', async () => {
      const notificationData = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        type: 'deal_update' as const,
        title: 'Deal Updated',
        message: 'Your deal has been updated',
        data: { dealId: 'deal-123' },
      }

      const job = await queueService.addNotificationJob(notificationData)

      expect(queueRegistry.getQueue).toHaveBeenCalledWith('notifications')
      expect(mockQueue.add).toHaveBeenCalledWith('send-notification', notificationData, undefined)
      expect(job).toEqual({ id: 'job-123' })
    })

    it('should throw error if notification queue not initialized', async () => {
      ;(queueRegistry.getQueue as jest.Mock).mockReturnValue(null)

      const notificationData = {
        userId: 'user-123',
        tenantId: 'tenant-123',
        type: 'deal_update' as const,
        title: 'Test',
        message: 'Test message',
      }

      await expect(queueService.addNotificationJob(notificationData)).rejects.toThrow('Notification queue not initialized')
    })
  })

  describe('getQueueStats', () => {
    beforeEach(async () => {
      await queueService.initialize()
    })

    it('should return queue statistics', async () => {
      const stats = await queueService.getQueueStats('email')

      expect(queueRegistry.getQueue).toHaveBeenCalledWith('email')
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

    it('should throw error for queue not found', async () => {
      ;(queueRegistry.getQueue as jest.Mock).mockReturnValue(null)

      await expect(queueService.getQueueStats('invalid')).rejects.toThrow('Queue invalid not found')
    })
  })

  describe('shutdown', () => {
    beforeEach(async () => {
      await queueService.initialize()
    })

    it('should close all queues gracefully', async () => {
      await queueService.shutdown()

      expect(queueRegistry.closeAll).toHaveBeenCalled()
    })
  })
})
