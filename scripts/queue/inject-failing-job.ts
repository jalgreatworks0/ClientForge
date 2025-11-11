#!/usr/bin/env tsx
/**
 * Inject Failing Job Test Script
 * Creates jobs that will intentionally fail to test DLQ alerts
 *
 * Usage:
 *   npx tsx scripts/queue/inject-failing-job.ts [queue-name] [count]
 *   npm run queue:inject-failure
 *
 * Examples:
 *   npm run queue:inject-failure                    # Add 5 failing jobs to email queue
 *   npx tsx scripts/queue/inject-failing-job.ts email 10  # Add 10 failing jobs to email
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

interface InjectOptions {
  queue: string
  count: number
}

async function injectFailingJobs(options: InjectOptions): Promise<void> {
  const { queue: queueName, count } = options

  // Validate queue name
  if (!QUEUE_NAMES.includes(queueName)) {
    throw new Error(`Unknown queue: ${queueName}. Available: ${QUEUE_NAMES.join(', ')}`)
  }

  const queue = new Queue(queueName, {
    connection: {
      url: REDIS_URL
    }
  })

  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║          Inject Failing Jobs - ClientForge CRM Test           ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  console.log(`Redis: ${REDIS_URL}`)
  console.log(`Queue: ${queueName}`)
  console.log(`Count: ${count}\n`)

  console.log('⚠  WARNING: This will create jobs that INTENTIONALLY FAIL')
  console.log('   Use this only for testing DLQ alerts and monitoring\n')

  const jobIds: string[] = []

  try {
    for (let i = 0; i < count; i++) {
      const job = await queue.add(
        'test-failure',
        {
          testId: `test-failure-${Date.now()}-${i}`,
          shouldFail: true,
          failureType: 'intentional-test',
          message: 'This job is designed to fail for testing purposes',
          injectedAt: new Date().toISOString()
        },
        {
          attempts: 5, // Will fail 5 times before going to DLQ
          backoff: {
            type: 'exponential',
            delay: 1000 // Start with 1 second backoff
          }
        }
      )

      if (job.id) {
        jobIds.push(job.id)
      }

      process.stdout.write(`Creating failing jobs: ${i + 1}/${count}\r`)
    }

    console.log(`\n\n✓ Successfully injected ${count} failing jobs`)
    console.log(`  Job IDs: ${jobIds.slice(0, 3).join(', ')}${jobIds.length > 3 ? ', ...' : ''}`)

    console.log('\n═══════════════════════════════════════════════════════════════════')
    console.log('\n📊 MONITORING:')
    console.log(`   1. Check queue health: npm run queue:health`)
    console.log(`   2. Watch Prometheus metrics: curl http://localhost:3001/metrics | grep crm_queue`)
    console.log(`   3. Check Grafana dashboard for alerts`)
    console.log(`   4. Clear DLQ after test: npm run queue:clear-dlq ${queueName}`)

    console.log('\n⏱  EXPECTED TIMELINE:')
    console.log(`   - Attempt 1: Immediate`)
    console.log(`   - Attempt 2: ~1 second`)
    console.log(`   - Attempt 3: ~2 seconds`)
    console.log(`   - Attempt 4: ~4 seconds`)
    console.log(`   - Attempt 5: ~8 seconds`)
    console.log(`   - DLQ: After ~15 seconds total`)

    console.log('\n📈 PROMETHEUS ALERTS:')
    console.log(`   - DLQ alert should fire after 5 minutes with jobs in DLQ`)
    console.log(`   - Failed job counter should increment`)
    console.log(`   - Active jobs gauge should spike during processing`)

    console.log('\n🧹 CLEANUP:')
    console.log(`   Run: npm run queue:clear-dlq ${queueName}`)
    console.log(`   Or: redis-cli DEL bull:${queueName}:failed\n`)

    await queue.close()
    process.exit(0)
  } catch (error: any) {
    console.error(`\n❌ Error injecting jobs: ${error.message}`)
    await queue.close()
    process.exit(1)
  }
}

// Parse command line arguments
const queueName = process.argv[2] || 'email'
const count = parseInt(process.argv[3] || '5', 10)

if (isNaN(count) || count < 1 || count > 100) {
  console.error('❌ Invalid count. Must be between 1 and 100.')
  process.exit(1)
}

// Run
injectFailingJobs({ queue: queueName, count }).catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
