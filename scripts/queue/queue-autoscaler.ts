/**
 * Queue Autoscaler
 * Automatically scales queue workers based on lag and job processing time
 *
 * Algorithm:
 * - Scale up if: lag > threshold AND avg job duration is high
 * - Scale down if: lag is low AND workers are idle
 * - Min workers: 1 per queue
 * - Max workers: configurable per queue
 *
 * Run with: tsx scripts/queue/queue-autoscaler.ts
 */

import { Queue, Worker } from 'bullmq'
import { getRedisClient } from '../../config/database/redis-config'
import { logger } from '../../backend/utils/logging/logger'
import IORedis from 'ioredis'

interface QueueConfig {
  name: string
  minWorkers: number
  maxWorkers: number
  lagThresholdMs: number // Scale up if lag exceeds this
  targetJobsPerWorker: number // Ideal jobs per worker
}

interface ScalingMetrics {
  queueName: string
  waitingJobs: number
  activeJobs: number
  completedRecent: number
  failedRecent: number
  avgJobDuration: number
  currentWorkers: number
  recommendedWorkers: number
  lag: number
}

const QUEUE_CONFIGS: QueueConfig[] = [
  {
    name: 'email-queue',
    minWorkers: 1,
    maxWorkers: 5,
    lagThresholdMs: 30000, // 30 seconds
    targetJobsPerWorker: 10,
  },
  {
    name: 'analytics-queue',
    minWorkers: 1,
    maxWorkers: 3,
    lagThresholdMs: 60000, // 1 minute
    targetJobsPerWorker: 20,
  },
  {
    name: 'notification-queue',
    minWorkers: 1,
    maxWorkers: 4,
    lagThresholdMs: 15000, // 15 seconds
    targetJobsPerWorker: 15,
  },
  {
    name: 'elasticsearch-sync-queue',
    minWorkers: 2,
    maxWorkers: 6,
    lagThresholdMs: 120000, // 2 minutes
    targetJobsPerWorker: 50,
  },
]

// Track active workers per queue
const activeWorkers: Map<string, Worker[]> = new Map()

export class QueueAutoscaler {
  private redis: IORedis
  private queues: Map<string, Queue>
  private running: boolean = false
  private checkIntervalMs: number = 10000 // Check every 10 seconds

  constructor() {
    this.queues = new Map()
  }

  async initialize(): Promise<void> {
    this.redis = await getRedisClient()

    // Initialize queues
    for (const config of QUEUE_CONFIGS) {
      const queue = new Queue(config.name, {
        connection: this.redis,
      })
      this.queues.set(config.name, queue)

      // Initialize with minimum workers
      await this.setWorkerCount(config.name, config.minWorkers)
    }

    logger.info('Queue autoscaler initialized', {
      queues: QUEUE_CONFIGS.map((c) => c.name),
    })
  }

  /**
   * Start autoscaling loop
   */
  async start(): Promise<void> {
    this.running = true
    logger.info('Queue autoscaler started')

    while (this.running) {
      try {
        await this.checkAndScale()
        await this.sleep(this.checkIntervalMs)
      } catch (error) {
        logger.error('Autoscaler check failed', { error })
        await this.sleep(this.checkIntervalMs)
      }
    }
  }

  /**
   * Stop autoscaling
   */
  async stop(): Promise<void> {
    this.running = false
    logger.info('Stopping queue autoscaler...')

    // Close all workers
    for (const [queueName, workers] of activeWorkers.entries()) {
      for (const worker of workers) {
        await worker.close()
      }
    }

    // Close all queues
    for (const queue of this.queues.values()) {
      await queue.close()
    }

    await this.redis.quit()
    logger.info('Queue autoscaler stopped')
  }

  /**
   * Check all queues and scale as needed
   */
  private async checkAndScale(): Promise<void> {
    const metrics: ScalingMetrics[] = []

    for (const config of QUEUE_CONFIGS) {
      const queueMetrics = await this.getQueueMetrics(config)
      metrics.push(queueMetrics)

      // Make scaling decision
      if (queueMetrics.recommendedWorkers !== queueMetrics.currentWorkers) {
        logger.info('Scaling queue', {
          queue: config.name,
          from: queueMetrics.currentWorkers,
          to: queueMetrics.recommendedWorkers,
          lag: queueMetrics.lag,
          waitingJobs: queueMetrics.waitingJobs,
        })

        await this.setWorkerCount(config.name, queueMetrics.recommendedWorkers)
      }
    }

    // Log summary
    logger.debug('Autoscaler check complete', {
      metrics: metrics.map((m) => ({
        queue: m.queueName,
        workers: m.currentWorkers,
        waiting: m.waitingJobs,
        lag: m.lag,
      })),
    })
  }

  /**
   * Get metrics for a queue and calculate recommended worker count
   */
  private async getQueueMetrics(config: QueueConfig): Promise<ScalingMetrics> {
    const queue = this.queues.get(config.name)
    if (!queue) {
      throw new Error(`Queue ${config.name} not found`)
    }

    // Get job counts
    const [waitingJobs, activeJobs, completedRecent, failedRecent] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
    ])

    // Calculate lag (time oldest waiting job has been waiting)
    const lag = await this.calculateLag(queue)

    // Get average job duration from recent completed jobs
    const avgJobDuration = await this.getAvgJobDuration(queue)

    // Get current worker count
    const currentWorkers = activeWorkers.get(config.name)?.length || 0

    // Calculate recommended workers
    const recommendedWorkers = this.calculateRecommendedWorkers(
      config,
      waitingJobs,
      activeJobs,
      lag,
      avgJobDuration,
      currentWorkers
    )

    return {
      queueName: config.name,
      waitingJobs,
      activeJobs,
      completedRecent,
      failedRecent,
      avgJobDuration,
      currentWorkers,
      recommendedWorkers,
      lag,
    }
  }

  /**
   * Calculate lag (how long oldest job has been waiting)
   */
  private async calculateLag(queue: Queue): Promise<number> {
    try {
      const waitingJobs = await queue.getWaiting(0, 1)
      if (waitingJobs.length === 0) {
        return 0
      }

      const oldestJob = waitingJobs[0]
      const now = Date.now()
      return now - (oldestJob.timestamp || now)
    } catch (error) {
      logger.error('Failed to calculate lag', { error })
      return 0
    }
  }

  /**
   * Get average job duration from recent completed jobs
   */
  private async getAvgJobDuration(queue: Queue): Promise<number> {
    try {
      const completedJobs = await queue.getCompleted(0, 10)
      if (completedJobs.length === 0) {
        return 1000 // Default 1 second
      }

      const durations = completedJobs
        .filter((job) => job.finishedOn && job.processedOn)
        .map((job) => (job.finishedOn! - job.processedOn!))

      if (durations.length === 0) {
        return 1000
      }

      return durations.reduce((sum, d) => sum + d, 0) / durations.length
    } catch (error) {
      logger.error('Failed to get avg job duration', { error })
      return 1000
    }
  }

  /**
   * Calculate recommended number of workers
   *
   * Algorithm:
   * 1. If lag > threshold, scale up aggressively
   * 2. If no waiting jobs and low active, scale down
   * 3. Otherwise, calculate based on waiting jobs / target per worker
   * 4. Clamp to min/max
   */
  private calculateRecommendedWorkers(
    config: QueueConfig,
    waitingJobs: number,
    activeJobs: number,
    lag: number,
    avgJobDuration: number,
    currentWorkers: number
  ): number {
    // Scale up if lag is high
    if (lag > config.lagThresholdMs && waitingJobs > 0) {
      // Aggressive scale up
      const needed = Math.ceil(waitingJobs / config.targetJobsPerWorker)
      return Math.min(needed + 1, config.maxWorkers)
    }

    // Scale down if idle
    if (waitingJobs === 0 && activeJobs === 0) {
      return config.minWorkers
    }

    // Calculate based on waiting jobs
    const totalJobs = waitingJobs + activeJobs
    const idealWorkers = Math.ceil(totalJobs / config.targetJobsPerWorker)

    // Don't scale down too aggressively
    if (idealWorkers < currentWorkers && waitingJobs > 0) {
      // Keep current workers if there's still work
      return currentWorkers
    }

    // Clamp to min/max
    return Math.max(config.minWorkers, Math.min(idealWorkers, config.maxWorkers))
  }

  /**
   * Set the number of workers for a queue
   */
  private async setWorkerCount(queueName: string, targetCount: number): Promise<void> {
    const currentWorkers = activeWorkers.get(queueName) || []
    const currentCount = currentWorkers.length

    if (targetCount === currentCount) {
      return // No change needed
    }

    if (targetCount > currentCount) {
      // Scale up - add workers
      const toAdd = targetCount - currentCount
      for (let i = 0; i < toAdd; i++) {
        const worker = await this.createWorker(queueName)
        currentWorkers.push(worker)
      }
      logger.info('Scaled up workers', { queue: queueName, added: toAdd, total: targetCount })
    } else {
      // Scale down - remove workers
      const toRemove = currentCount - targetCount
      for (let i = 0; i < toRemove; i++) {
        const worker = currentWorkers.pop()
        if (worker) {
          await worker.close()
        }
      }
      logger.info('Scaled down workers', { queue: queueName, removed: toRemove, total: targetCount })
    }

    activeWorkers.set(queueName, currentWorkers)
  }

  /**
   * Create a worker for a queue
   */
  private async createWorker(queueName: string): Promise<Worker> {
    const worker = new Worker(
      queueName,
      async (job) => {
        // Import the appropriate processor based on queue name
        let processor
        switch (queueName) {
          case 'email-queue':
            processor = await import('../../backend/queues/email-queue')
            break
          case 'analytics-queue':
            processor = await import('../../backend/queues/analytics-queue')
            break
          case 'notification-queue':
            processor = await import('../../backend/queues/notification-queue')
            break
          case 'elasticsearch-sync-queue':
            processor = await import('../../backend/queues/elasticsearch-sync-queue')
            break
          default:
            throw new Error(`Unknown queue: ${queueName}`)
        }

        return await processor.processJob(job)
      },
      {
        connection: this.redis,
        concurrency: 1,
      }
    )

    worker.on('completed', (job) => {
      logger.debug('Job completed', { queue: queueName, jobId: job.id })
    })

    worker.on('failed', (job, error) => {
      logger.error('Job failed', { queue: queueName, jobId: job?.id, error })
    })

    return worker
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

// Main execution
if (require.main === module) {
  const autoscaler = new QueueAutoscaler()

  // Handle graceful shutdown
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received, shutting down...')
    await autoscaler.stop()
    process.exit(0)
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT received, shutting down...')
    await autoscaler.stop()
    process.exit(0)
  })

  // Start autoscaler
  autoscaler
    .initialize()
    .then(() => autoscaler.start())
    .catch((error) => {
      logger.error('Autoscaler failed to start', { error })
      process.exit(1)
    })
}

export default QueueAutoscaler
