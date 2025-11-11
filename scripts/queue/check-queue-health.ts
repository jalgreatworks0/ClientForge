#!/usr/bin/env tsx
/**
 * Queue Health Check Script
 * Displays health stats for all BullMQ queues
 *
 * Usage:
 *   npx tsx scripts/queue/check-queue-health.ts
 *   npm run queue:health
 */

import { Queue } from 'bullmq'
import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379'

const QUEUE_NAMES = [
  'email',
  'data-sync',
  'embeddings',
  'file-processing',
  'notifications'
]

interface QueueHealth {
  name: string
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  paused: boolean
  dlq: number  // Dead Letter Queue count
}

async function getQueueHealth(queueName: string): Promise<QueueHealth> {
  const queue = new Queue(queueName, {
    connection: {
      url: REDIS_URL
    }
  })

  try {
    const [waiting, active, completed, failed, delayed, isPaused] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
      queue.isPaused()
    ])

    // Get DLQ count (jobs that failed 3+ times)
    const failedJobs = await queue.getFailed(0, 1000)
    const dlqCount = failedJobs.filter(job => (job.attemptsMade || 0) >= 3).length

    await queue.close()

    return {
      name: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      paused: isPaused,
      dlq: dlqCount
    }
  } catch (error: any) {
    await queue.close()
    throw new Error(`Failed to get health for queue ${queueName}: ${error.message}`)
  }
}

async function checkAllQueues(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║         BullMQ Queue Health Check - ClientForge CRM           ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  console.log(`Redis: ${REDIS_URL}\n`)

  const results: QueueHealth[] = []
  let hasIssues = false

  for (const queueName of QUEUE_NAMES) {
    try {
      const health = await getQueueHealth(queueName)
      results.push(health)

      // Check for issues
      if (health.dlq > 0 || health.failed > 50 || health.waiting > 1000 || health.paused) {
        hasIssues = true
      }
    } catch (error: any) {
      console.error(`✗ ${queueName}: ${error.message}\n`)
      hasIssues = true
    }
  }

  // Display table
  console.log('Queue              Waiting  Active  Failed  DLQ   Delayed  Paused')
  console.log('═══════════════════════════════════════════════════════════════════')

  for (const queue of results) {
    const status = queue.paused ? '⏸' :
                   queue.dlq > 0 ? '⚠' :
                   queue.failed > 50 ? '⚠' :
                   queue.waiting > 1000 ? '⚠' : '✓'

    console.log(
      `${status} ${queue.name.padEnd(15)} ${String(queue.waiting).padStart(7)} ` +
      `${String(queue.active).padStart(7)} ${String(queue.failed).padStart(7)} ` +
      `${String(queue.dlq).padStart(5)} ${String(queue.delayed).padStart(8)} ` +
      `${queue.paused ? 'YES' : 'NO '}`
    )
  }

  console.log('═══════════════════════════════════════════════════════════════════\n')

  // Summary
  const totals = results.reduce((acc, q) => ({
    waiting: acc.waiting + q.waiting,
    active: acc.active + q.active,
    failed: acc.failed + q.failed,
    dlq: acc.dlq + q.dlq,
    delayed: acc.delayed + q.delayed
  }), { waiting: 0, active: 0, failed: 0, dlq: 0, delayed: 0 })

  console.log(`Total across all queues:`)
  console.log(`  Waiting: ${totals.waiting}`)
  console.log(`  Active:  ${totals.active}`)
  console.log(`  Failed:  ${totals.failed}`)
  console.log(`  DLQ:     ${totals.dlq}`)
  console.log(`  Delayed: ${totals.delayed}\n`)

  // Alerts
  if (hasIssues) {
    console.log('⚠  ALERTS:')
    for (const queue of results) {
      if (queue.dlq > 0) {
        console.log(`   - ${queue.name}: ${queue.dlq} jobs in Dead Letter Queue`)
      }
      if (queue.failed > 50) {
        console.log(`   - ${queue.name}: ${queue.failed} failed jobs (threshold: 50)`)
      }
      if (queue.waiting > 1000) {
        console.log(`   - ${queue.name}: ${queue.waiting} waiting jobs (threshold: 1000)`)
      }
      if (queue.paused) {
        console.log(`   - ${queue.name}: Queue is PAUSED`)
      }
    }
    console.log('')
    process.exit(1)
  } else {
    console.log('✓ All queues healthy\n')
    process.exit(0)
  }
}

// Run
checkAllQueues().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
