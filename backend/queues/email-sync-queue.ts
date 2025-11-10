/**
 * Email Sync Queue
 * Background job processor for syncing emails from Gmail and Outlook accounts
 */

import Queue from 'bull'
import { emailIntegrationService } from '../core/email/email-integration-service'
import { db } from '../database/postgresql/pool'
import { logger } from '../utils/logging/logger'

// Redis connection for Bull
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: 0,
}

// Create email sync queue
export const emailSyncQueue = new Queue('email-sync', {
  redis: redisConfig,
  defaultJobOptions: {
    attempts: 3, // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000, // Start with 2 seconds, then 4, 8, etc.
    },
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 200, // Keep last 200 failed jobs
  },
})

interface EmailSyncJob {
  accountId: string
  userId: string
  tenantId: string
  provider: 'gmail' | 'outlook'
}

/**
 * Process email sync jobs
 */
emailSyncQueue.process(async (job) => {
  const { accountId, userId, tenantId, provider }: EmailSyncJob = job.data

  logger.info('[Email Sync Queue] Processing sync job', {
    accountId,
    userId,
    tenantId,
    provider,
    jobId: job.id,
  })

  try {
    // Sync emails for this account
    const messageCount = await emailIntegrationService.syncAccount(accountId)

    logger.info('[Email Sync Queue] Sync completed', {
      accountId,
      messageCount,
      jobId: job.id,
    })

    return {
      success: true,
      accountId,
      messageCount,
      syncedAt: new Date().toISOString(),
    }
  } catch (error: any) {
    logger.error('[Email Sync Queue] Sync failed', {
      accountId,
      error: error.message,
      stack: error.stack,
      jobId: job.id,
    })

    // Don't throw - let job retry automatically
    throw new Error(`Email sync failed for account ${accountId}: ${error.message}`)
  }
})

/**
 * Schedule periodic sync for all active accounts
 */
export async function scheduleEmailSyncJobs() {
  try {
    logger.info('[Email Sync Queue] Scheduling sync jobs for all active accounts')

    // Get all active email accounts
    const result = await db.query(
      `SELECT id, user_id, tenant_id, provider, email
       FROM email_accounts
       WHERE is_active = true
         AND sync_enabled = true
         AND deleted_at IS NULL`
    )

    const accounts = result.rows

    logger.info('[Email Sync Queue] Found active accounts', {
      count: accounts.length,
    })

    // Add sync job for each account
    for (const account of accounts) {
      const jobData: EmailSyncJob = {
        accountId: account.id,
        userId: account.user_id,
        tenantId: account.tenant_id,
        provider: account.provider,
      }

      // Add job with unique ID to prevent duplicates
      await emailSyncQueue.add(jobData, {
        jobId: `sync-${account.id}`,
        removeOnComplete: true,
        removeOnFail: false,
      })

      logger.info('[Email Sync Queue] Scheduled sync job', {
        accountId: account.id,
        email: account.email,
        provider: account.provider,
      })
    }

    return accounts.length
  } catch (error: any) {
    logger.error('[Email Sync Queue] Failed to schedule sync jobs', {
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

/**
 * Start recurring email sync job (every 5 minutes)
 */
export async function startRecurringEmailSync() {
  try {
    // Remove existing repeatable job if any
    const repeatableJobs = await emailSyncQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      if (job.name === 'recurring-email-sync') {
        await emailSyncQueue.removeRepeatableByKey(job.key)
      }
    }

    // Add new repeatable job - sync all accounts every 5 minutes
    await emailSyncQueue.add(
      'recurring-email-sync',
      {}, // Empty data - we'll fetch all accounts in the processor
      {
        repeat: {
          every: 5 * 60 * 1000, // 5 minutes in milliseconds
        },
        jobId: 'recurring-email-sync',
      }
    )

    logger.info('[Email Sync Queue] Started recurring email sync (every 5 minutes)')

    // Also run initial sync immediately
    await scheduleEmailSyncJobs()
  } catch (error: any) {
    logger.error('[Email Sync Queue] Failed to start recurring sync', {
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

// Process recurring sync jobs
emailSyncQueue.process('recurring-email-sync', async (job) => {
  logger.info('[Email Sync Queue] Running scheduled sync for all accounts', {
    jobId: job.id,
  })

  try {
    const count = await scheduleEmailSyncJobs()
    return {
      success: true,
      accountsScheduled: count,
      syncedAt: new Date().toISOString(),
    }
  } catch (error: any) {
    logger.error('[Email Sync Queue] Recurring sync failed', {
      error: error.message,
      jobId: job.id,
    })
    throw error
  }
})

// Event listeners for monitoring
emailSyncQueue.on('completed', (job, result) => {
  logger.info('[Email Sync Queue] Job completed', {
    jobId: job.id,
    result,
  })
})

emailSyncQueue.on('failed', (job, error) => {
  logger.error('[Email Sync Queue] Job failed', {
    jobId: job?.id,
    error: error.message,
    attempts: job?.attemptsMade,
  })
})

emailSyncQueue.on('error', (error) => {
  logger.error('[Email Sync Queue] Queue error', {
    error: error.message,
  })
})

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('[Email Sync Queue] Shutting down gracefully')
  await emailSyncQueue.close()
})

export default emailSyncQueue
