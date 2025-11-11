#!/usr/bin/env tsx
/**
 * Clear Dead Letter Queue (DLQ) Script
 * Removes jobs that have failed 3+ times from all queues
 *
 * Usage:
 *   npx tsx scripts/queue/clear-dlq.ts [queue-name]
 *   npm run queue:clear-dlq
 *
 * Examples:
 *   npm run queue:clear-dlq              # Clear all queues
 *   npx tsx scripts/queue/clear-dlq.ts email  # Clear specific queue
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

interface DLQJobInfo {
  id: string
  name: string
  attempts: number
  failedReason?: string
  timestamp?: number
}

async function clearQueueDLQ(queueName: string): Promise<{
  queue: string
  dlqCount: number
  removedCount: number
  jobs: DLQJobInfo[]
}> {
  const queue = new Queue(queueName, {
    connection: {
      url: REDIS_URL
    }
  })

  try {
    // Get all failed jobs
    const failedJobs = await queue.getFailed(0, 1000)

    // Filter DLQ jobs (failed 3+ times)
    const dlqJobs = failedJobs.filter(job => (job.attemptsMade || 0) >= 3)

    const jobInfos: DLQJobInfo[] = dlqJobs.map(job => ({
      id: job.id || 'unknown',
      name: job.name || 'unknown',
      attempts: job.attemptsMade || 0,
      failedReason: job.failedReason,
      timestamp: job.timestamp
    }))

    // Remove DLQ jobs
    for (const job of dlqJobs) {
      if (job.id) {
        await job.remove()
      }
    }

    await queue.close()

    return {
      queue: queueName,
      dlqCount: dlqJobs.length,
      removedCount: dlqJobs.length,
      jobs: jobInfos
    }
  } catch (error: any) {
    await queue.close()
    throw new Error(`Failed to clear DLQ for queue ${queueName}: ${error.message}`)
  }
}

async function clearAllDLQs(specificQueue?: string): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║           Clear Dead Letter Queue - ClientForge CRM           ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  console.log(`Redis: ${REDIS_URL}`)

  if (specificQueue) {
    console.log(`Target: ${specificQueue} queue\n`)
  } else {
    console.log(`Target: All queues\n`)
  }

  const queuesToProcess = specificQueue
    ? [specificQueue]
    : QUEUE_NAMES

  // Validate queue name
  if (specificQueue && !QUEUE_NAMES.includes(specificQueue)) {
    console.error(`❌ Unknown queue: ${specificQueue}`)
    console.error(`   Available queues: ${QUEUE_NAMES.join(', ')}\n`)
    process.exit(1)
  }

  const results: any[] = []
  let totalRemoved = 0

  for (const queueName of queuesToProcess) {
    try {
      console.log(`Processing ${queueName}...`)
      const result = await clearQueueDLQ(queueName)
      results.push(result)
      totalRemoved += result.removedCount

      if (result.dlqCount > 0) {
        console.log(`  ✓ Removed ${result.removedCount} DLQ jobs`)

        // Show first 5 jobs
        const jobsToShow = result.jobs.slice(0, 5)
        for (const job of jobsToShow) {
          const age = job.timestamp
            ? `${Math.round((Date.now() - job.timestamp) / 1000 / 60)}m ago`
            : 'unknown age'
          console.log(`    - ${job.name} (${job.attempts} attempts, ${age})`)
          if (job.failedReason) {
            console.log(`      Reason: ${job.failedReason.substring(0, 80)}${job.failedReason.length > 80 ? '...' : ''}`)
          }
        }

        if (result.jobs.length > 5) {
          console.log(`    ... and ${result.jobs.length - 5} more`)
        }
      } else {
        console.log(`  ✓ No DLQ jobs found`)
      }
    } catch (error: any) {
      console.error(`  ✗ ${queueName}: ${error.message}`)
    }
  }

  console.log('\n═══════════════════════════════════════════════════════════════════')
  console.log(`\nTotal DLQ jobs removed: ${totalRemoved}`)

  if (totalRemoved > 0) {
    console.log('\n⚠  RECOMMENDATION:')
    console.log('   - Review error logs to identify root cause')
    console.log('   - Check if workers are configured correctly')
    console.log('   - Consider increasing retry attempts or adding exponential backoff')
    console.log('   - Monitor queue health: npm run queue:health\n')
  } else {
    console.log('\n✓ All queues clean - no DLQ jobs to remove\n')
  }

  process.exit(0)
}

// Parse command line arguments
const specificQueue = process.argv[2]

// Run
clearAllDLQs(specificQueue).catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
