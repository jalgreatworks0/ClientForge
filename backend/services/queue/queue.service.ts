/**
 * Job Queue Service
 * Background job processing using Bull and Redis
 */

import Queue, { Job, JobOptions } from 'bull'
import { logger } from '../../utils/logging/logger'

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
  private emailQueue?: Queue<EmailJob>
  private searchIndexQueue?: Queue<SearchIndexJob>
  private reportQueue?: Queue<ReportJob>
  private notificationQueue?: Queue<NotificationJob>

  private redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  }

  /**
   * Initialize all queues
   */
  initialize(): void {
    try {
      // Email Queue
      this.emailQueue = new Queue<EmailJob>('email', {
        redis: this.redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: 100,
          removeOnFail: 500,
        },
      })

      this.emailQueue.process(this.processEmailJob.bind(this))

      // Search Index Queue
      this.searchIndexQueue = new Queue<SearchIndexJob>('search-index', {
        redis: this.redisConfig,
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: 50,
          removeOnFail: 200,
        },
      })

      this.searchIndexQueue.process(this.processSearchIndexJob.bind(this))

      // Report Queue
      this.reportQueue = new Queue<ReportJob>('reports', {
        redis: this.redisConfig,
        defaultJobOptions: {
          attempts: 2,
          timeout: 300000, // 5 minutes
          removeOnComplete: 20,
          removeOnFail: 100,
        },
      })

      this.reportQueue.process(this.processReportJob.bind(this))

      // Notification Queue
      this.notificationQueue = new Queue<NotificationJob>('notifications', {
        redis: this.redisConfig,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'fixed',
            delay: 5000,
          },
          removeOnComplete: 100,
          removeOnFail: 200,
        },
      })

      this.notificationQueue.process(this.processNotificationJob.bind(this))

      // Set up event listeners
      this.setupEventListeners()

      logger.info('Job queues initialized successfully')
    } catch (error) {
      logger.error('Failed to initialize job queues', { error })
      throw error
    }
  }

  /**
   * Set up event listeners for queue monitoring
   */
  private setupEventListeners(): void {
    const queues = [
      { name: 'email', queue: this.emailQueue },
      { name: 'search-index', queue: this.searchIndexQueue },
      { name: 'reports', queue: this.reportQueue },
      { name: 'notifications', queue: this.notificationQueue },
    ]

    queues.forEach(({ name, queue }) => {
      queue?.on('completed', (job: Job) => {
        logger.info(`Job completed in ${name} queue`, {
          jobId: job.id,
          duration: Date.now() - job.timestamp,
        })
      })

      queue?.on('failed', (job: Job, err: Error) => {
        logger.error(`Job failed in ${name} queue`, {
          jobId: job.id,
          error: err.message,
          attempts: job.attemptsMade,
        })
      })

      queue?.on('stalled', (job: Job) => {
        logger.warn(`Job stalled in ${name} queue`, { jobId: job.id })
      })
    })
  }

  /**
   * Add email job to queue
   */
  async addEmailJob(data: EmailJob, options?: JobOptions): Promise<Job<EmailJob>> {
    if (!this.emailQueue) {
      throw new Error('Email queue not initialized')
    }

    return this.emailQueue.add(data, options)
  }

  /**
   * Add search index job to queue
   */
  async addSearchIndexJob(data: SearchIndexJob, options?: JobOptions): Promise<Job<SearchIndexJob>> {
    if (!this.searchIndexQueue) {
      throw new Error('Search index queue not initialized')
    }

    return this.searchIndexQueue.add(data, options)
  }

  /**
   * Add report generation job to queue
   */
  async addReportJob(data: ReportJob, options?: JobOptions): Promise<Job<ReportJob>> {
    if (!this.reportQueue) {
      throw new Error('Report queue not initialized')
    }

    return this.reportQueue.add(data, options)
  }

  /**
   * Add notification job to queue
   */
  async addNotificationJob(data: NotificationJob, options?: JobOptions): Promise<Job<NotificationJob>> {
    if (!this.notificationQueue) {
      throw new Error('Notification queue not initialized')
    }

    return this.notificationQueue.add(data, options)
  }

  /**
   * Process email job
   */
  private async processEmailJob(job: Job<EmailJob>): Promise<void> {
    const { to, subject, html, tenantId } = job.data

    logger.info('Processing email job', { jobId: job.id, to, subject, tenantId })

    // TODO: Implement actual email sending logic using nodemailer or similar
    // For now, just log the email
    logger.info('Email sent successfully (mock)', { to, subject })

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  /**
   * Process search index job
   */
  private async processSearchIndexJob(job: Job<SearchIndexJob>): Promise<void> {
    const { action, index, id, document, tenantId } = job.data

    logger.info('Processing search index job', { jobId: job.id, action, index, id, tenantId })

    // TODO: Implement actual Elasticsearch indexing logic
    // For now, just log the action
    logger.info('Search index updated successfully (mock)', { action, index, id })

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  /**
   * Process report generation job
   */
  private async processReportJob(job: Job<ReportJob>): Promise<void> {
    const { reportType, userId, tenantId, filters, format } = job.data

    logger.info('Processing report job', { jobId: job.id, reportType, userId, tenantId, format })

    // TODO: Implement actual report generation logic
    // For now, just log the report request
    logger.info('Report generated successfully (mock)', { reportType, format })

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 500))
  }

  /**
   * Process notification job
   */
  private async processNotificationJob(job: Job<NotificationJob>): Promise<void> {
    const { userId, tenantId, type, title, message } = job.data

    logger.info('Processing notification job', { jobId: job.id, userId, tenantId, type, title })

    // TODO: Implement actual notification logic (WebSocket, push notifications, etc.)
    // For now, just log the notification
    logger.info('Notification sent successfully (mock)', { userId, type, title })

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 50))
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: 'email' | 'search-index' | 'reports' | 'notifications'): Promise<any> {
    const queueMap = {
      email: this.emailQueue,
      'search-index': this.searchIndexQueue,
      reports: this.reportQueue,
      notifications: this.notificationQueue,
    }

    const queue = queueMap[queueName]
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

    const queues = [this.emailQueue, this.searchIndexQueue, this.reportQueue, this.notificationQueue]

    await Promise.all(queues.map((queue) => queue?.close()))

    logger.info('Job queues shut down successfully')
  }
}

// Singleton instance
export const queueService = new QueueService()
