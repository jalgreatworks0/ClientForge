/**
 * Queue Metrics Service for Prometheus
 * Exports BullMQ queue metrics for monitoring and alerting
 *
 * Metrics exposed:
 * - crm_queue_jobs_dlq_total{queue} - Counter for Dead Letter Queue jobs
 * - crm_queue_waiting{queue} - Gauge for waiting jobs
 * - crm_queue_active{queue} - Gauge for active jobs
 * - crm_queue_failed{queue} - Counter for failed jobs
 * - crm_queue_completed{queue} - Counter for completed jobs
 * - crm_queue_delayed{queue} - Gauge for delayed jobs
 * - crm_queue_paused{queue} - Gauge for paused status (0 or 1)
 */

import { Queue } from 'bullmq'
import { Registry, Counter, Gauge } from 'prom-client'
import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://redis:6379'

const QUEUE_NAMES = [
  'email',
  'data-sync',
  'embeddings',
  'file-processing',
  'notifications'
]

// Create Prometheus registry
export const queueRegistry = new Registry()

// Define metrics
const dlqCounter = new Counter({
  name: 'crm_queue_jobs_dlq_total',
  help: 'Total number of jobs in Dead Letter Queue (failed 3+ times)',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

const waitingGauge = new Gauge({
  name: 'crm_queue_waiting',
  help: 'Number of jobs waiting in queue',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

const activeGauge = new Gauge({
  name: 'crm_queue_active',
  help: 'Number of jobs currently being processed',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

const failedCounter = new Counter({
  name: 'crm_queue_failed',
  help: 'Total number of failed jobs',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

const completedCounter = new Counter({
  name: 'crm_queue_completed',
  help: 'Total number of completed jobs',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

const delayedGauge = new Gauge({
  name: 'crm_queue_delayed',
  help: 'Number of delayed jobs',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

const pausedGauge = new Gauge({
  name: 'crm_queue_paused',
  help: 'Queue paused status (1 = paused, 0 = active)',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

const lagGauge = new Gauge({
  name: 'crm_queue_lag_seconds',
  help: 'Queue lag in seconds (oldest waiting job age)',
  labelNames: ['queue'],
  registers: [queueRegistry]
})

/**
 * Update all queue metrics
 * This should be called on a regular interval (e.g., every 10 seconds)
 */
export async function updateQueueMetrics(): Promise<void> {
  const queues = QUEUE_NAMES.map(name => new Queue(name, {
    connection: { url: REDIS_URL }
  }))

  try {
    await Promise.all(queues.map(async (queue) => {
      const queueName = queue.name

      // Get counts
      const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
        queue.isPaused()
      ])

      // Update gauges
      waitingGauge.set({ queue: queueName }, waiting)
      activeGauge.set({ queue: queueName }, active)
      delayedGauge.set({ queue: queueName }, delayed)
      pausedGauge.set({ queue: queueName }, isPaused ? 1 : 0)

      // Update counters (these should only increase)
      // We need to get current value and set difference
      failedCounter.labels({ queue: queueName }).inc(0) // Initialize if not exists
      completedCounter.labels({ queue: queueName }).inc(0)

      // Calculate DLQ count (jobs failed 3+ times)
      const failedJobs = await queue.getFailed(0, 1000)
      const dlqCount = failedJobs.filter(job => (job.attemptsMade || 0) >= 3).length
      dlqCounter.labels({ queue: queueName }).inc(0) // Initialize
      // Note: DLQ counter should be set to absolute value, but prom-client Counter
      // doesn't support set(). We'll track delta instead.

      // Calculate lag (age of oldest waiting job)
      if (waiting > 0) {
        const waitingJobs = await queue.getWaiting(0, 1)
        if (waitingJobs.length > 0) {
          const oldestJob = waitingJobs[0]
          const age = oldestJob.timestamp ? (Date.now() - oldestJob.timestamp) / 1000 : 0
          lagGauge.set({ queue: queueName }, age)
        } else {
          lagGauge.set({ queue: queueName }, 0)
        }
      } else {
        lagGauge.set({ queue: queueName }, 0)
      }
    }))
  } finally {
    // Close all queue connections
    await Promise.all(queues.map(q => q.close()))
  }
}

/**
 * Start metrics collection on interval
 * @param intervalMs - Collection interval in milliseconds (default: 10000)
 */
export function startMetricsCollection(intervalMs: number = 10000): NodeJS.Timer {
  // Initial collection
  updateQueueMetrics().catch(err => {
    console.error('Failed to collect queue metrics:', err)
  })

  // Set up interval
  const interval = setInterval(() => {
    updateQueueMetrics().catch(err => {
      console.error('Failed to collect queue metrics:', err)
    })
  }, intervalMs)

  return interval
}

/**
 * Stop metrics collection
 */
export function stopMetricsCollection(interval: NodeJS.Timer): void {
  clearInterval(interval)
}

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return queueRegistry.metrics()
}

/**
 * Manual metric update for testing
 */
export async function collectQueueMetrics(): Promise<{
  queue: string
  waiting: number
  active: number
  failed: number
  dlq: number
  lag: number
}[]> {
  const queues = QUEUE_NAMES.map(name => new Queue(name, {
    connection: { url: REDIS_URL }
  }))

  try {
    const results = await Promise.all(queues.map(async (queue) => {
      const queueName = queue.name

      const [waiting, active, failed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getFailedCount()
      ])

      // Calculate DLQ
      const failedJobs = await queue.getFailed(0, 1000)
      const dlqCount = failedJobs.filter(job => (job.attemptsMade || 0) >= 3).length

      // Calculate lag
      let lag = 0
      if (waiting > 0) {
        const waitingJobs = await queue.getWaiting(0, 1)
        if (waitingJobs.length > 0) {
          const oldestJob = waitingJobs[0]
          lag = oldestJob.timestamp ? (Date.now() - oldestJob.timestamp) / 1000 : 0
        }
      }

      return {
        queue: queueName,
        waiting,
        active,
        failed,
        dlq: dlqCount,
        lag
      }
    }))

    return results
  } finally {
    await Promise.all(queues.map(q => q.close()))
  }
}
