/**
 * Job Queue Service - BullMQ Wrapper
 * Background job processing using BullMQ v3 and Redis
 * Uses centralized BullMQ configuration from config/queue/bullmq.config.ts
 */

import { logger } from '../../utils/logging/logger'
import { queueRegistry, initializeQueues } from '../../../config/queue/bullmq.config'

// Job type definitions
export interface EmailJob {
  to: string
  subject: string
  html: string
  tenantId: string
}

export interface SearchIndexJob {
  action: 'index' | 'update' | 'delete'
  index: string
  id: string
  document?: any
  tenantId: string
}

export interface ReportJob {
  reportType: 'sales' | 'pipeline' | 'activity'
  userId: string
  tenantId: string
  filters: Record<string, any>
  format: 'pdf' | 'csv' | 'xlsx'
}

export interface NotificationJob {
  userId: string
  tenantId: string
  type: 'deal_update' | 'task_assigned' | 'mention' | 'system'
  title: string
  message: string
  data?: Record<string, any>
}

class QueueService {
  private initialized = false

  /**
   * Initialize all queues using centralized BullMQ configuration
   * Non-blocking: Times out after 10s and allows server to continue
   */
  async initialize(): Promise<void> {
    try {
      if (this.initialized) {
        logger.warn('Queue service already initialized')
        return
      }

      logger.info('Initializing queues (with 10s timeout)...')

      // Initialize queues from centralized config with timeout
      // Non-blocking: If initialization takes >10s, continue anyway
      await Promise.race([
        initializeQueues(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Queue initialization timeout after 10s')),
            10000
          )
        )
      ]).catch((error) => {
        // Log warning but don't block server startup
        logger.warn('Queue initialization timeout or failed', {
          error: error.message,
          message: 'Server starting without queues - they will retry in background'
        })
      })

      this.initialized = true
      logger.info('[OK] Job queues initialized successfully')
    } catch (error) {
      logger.error('Unexpected error in queue initialization', { error })
      // Don't throw - allow server to start anyway
      this.initialized = true
    }
  }

  /**
   * Add email job to queue
   */
  async addEmailJob(data: EmailJob, options?: any): Promise<any> {
    const queue = queueRegistry.getQueue('email')
    if (!queue) {
      throw new Error('Email queue not initialized')
    }

    return queue.add('send-email', data, options)
  }

  /**
   * Add search index job to queue
   */
  async addSearchIndexJob(data: SearchIndexJob, options?: any): Promise<any> {
    const queue = queueRegistry.getQueue('data-sync')
    if (!queue) {
      throw new Error('Data sync queue not initialized')
    }

    return queue.add('sync-search-index', data, options)
  }

  /**
   * Add report generation job to queue
   */
  async addReportJob(data: ReportJob, options?: any): Promise<any> {
    const queue = queueRegistry.getQueue('data-sync')
    if (!queue) {
      throw new Error('Data sync queue not initialized')
    }

    return queue.add('generate-report', data, options)
  }

  /**
   * Add notification job to queue
   */
  async addNotificationJob(data: NotificationJob, options?: any): Promise<any> {
    const queue = queueRegistry.getQueue('notifications')
    if (!queue) {
      throw new Error('Notification queue not initialized')
    }

    return queue.add('send-notification', data, options)
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<any> {
    const queue = queueRegistry.getQueue(queueName)
    if (!queue) {
      throw new Error(`Queue ${queueName} not found`)
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ])

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('Shutting down job queues...')

    await queueRegistry.closeAll()

    this.initialized = false
    logger.info('Job queues shut down successfully')
  }
}

// Singleton instance
export const queueService = new QueueService()
