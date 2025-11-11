/**
 * Email Sync Queue - BullMQ v3
 * Background job processor for syncing emails from Gmail and Outlook accounts
 * Uses centralized BullMQ configuration
 */

import { Job } from 'bullmq'
import { queueRegistry, createWorker } from '../../config/queue/bullmq.config'
import { emailIntegrationService } from '../core/email/email-integration-service'
import { db } from '../database/postgresql/pool'
import { logger } from '../utils/logging/logger'

interface EmailSyncJob {
  accountId: string
  userId: string
  tenantId: string
  provider: 'gmail' | 'outlook'
}

interface RecurringEmailSyncJob {
  // Empty data for recurring job
}

let emailSyncWorker: any = null

/**
 * Initialize Email Sync Queue and Worker
 */
export async function initializeEmailSyncQueue(): Promise<void> {
  try {
    logger.info('[Email Sync Queue] Initializing email sync queue and worker')

    // Queue is already created by initializeQueues() in bullmq.config.ts
    const emailQueue = queueRegistry.getQueue('email')
    if (!emailQueue) {
      throw new Error('Email queue not found - ensure initializeQueues() was called first')
    }

    // Create worker for processing email sync jobs
    emailSyncWorker = createWorker<EmailSyncJob | RecurringEmailSyncJob>(
      'email',
      async (job: Job<EmailSyncJob | RecurringEmailSyncJob>) => {
        // Handle recurring sync job differently
        if (job.name === 'recurring-email-sync') {
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
        }

        // Handle individual account sync job
        const { accountId, userId, tenantId, provider } = job.data as EmailSyncJob

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

          // Throw error to trigger retry
          throw new Error(`Email sync failed for account ${accountId}: ${error.message}`)
        }
      },
      {
        concurrency: 5, // Process up to 5 email syncs concurrently
        limiter: {
          max: 10, // Max 10 jobs
          duration: 60000, // Per 60 seconds
        },
      }
    )

    logger.info('[Email Sync Queue] Email sync worker initialized')
  } catch (error: any) {
    logger.error('[Email Sync Queue] Failed to initialize', {
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

/**
 * Schedule periodic sync for all active accounts
 */
export async function scheduleEmailSyncJobs(): Promise<number> {
  try {
    logger.info('[Email Sync Queue] Scheduling sync jobs for all active accounts')

    const emailQueue = queueRegistry.getQueue('email')
    if (!emailQueue) {
      throw new Error('Email queue not initialized')
    }

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
      await emailQueue.add('sync-account', jobData, {
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
 * Uses BullMQ v3 cron pattern syntax
 */
export async function startRecurringEmailSync(): Promise<void> {
  try {
    const emailQueue = queueRegistry.getQueue('email')
    if (!emailQueue) {
      throw new Error('Email queue not initialized')
    }

    // Remove existing repeatable job if any
    const repeatableJobs = await emailQueue.getRepeatableJobs()
    for (const job of repeatableJobs) {
      if (job.name === 'recurring-email-sync') {
        await emailQueue.removeRepeatableByKey(job.key)
        logger.info('[Email Sync Queue] Removed existing repeatable job')
      }
    }

    // Add new repeatable job using BullMQ v3 cron pattern
    // Every 5 minutes: */5 * * * *
    await emailQueue.add(
      'recurring-email-sync',
      {}, // Empty data - we'll fetch all accounts in the processor
      {
        repeat: {
          pattern: '*/5 * * * *', // Cron pattern for every 5 minutes
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

/**
 * Shutdown email sync worker gracefully
 */
export async function shutdownEmailSyncQueue(): Promise<void> {
  try {
    if (emailSyncWorker) {
      logger.info('[Email Sync Queue] Shutting down worker...')
      await emailSyncWorker.close()
      logger.info('[Email Sync Queue] Worker shut down successfully')
    }
  } catch (error: any) {
    logger.error('[Email Sync Queue] Error shutting down worker', {
      error: error.message,
    })
  }
}
