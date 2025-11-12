/**
 * Payment Retry Worker
 * Processes failed payment retry attempts using BullMQ
 * Implements dunning logic with configurable retry schedules
 */

import { Worker, Job, Queue } from 'bullmq';
import { DunningService } from '../../services/billing/dunning.service';
import { logger } from '../../utils/logging/logger';
import IORedis from 'ioredis';

interface PaymentRetryJob {
  tenantId: string;
  invoiceId: string;
  attemptNumber: number;
}

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create queue for payment retries
export const paymentRetryQueue = new Queue<PaymentRetryJob>('payment-retry', {
  connection,
  defaultJobOptions: {
    attempts: 1, // Don't retry - dunning service handles retry logic
    removeOnComplete: {
      age: 30 * 24 * 3600, // Keep completed jobs for 30 days
      count: 10000,
    },
    removeOnFail: {
      age: 90 * 24 * 3600, // Keep failed jobs for 90 days
    },
  },
});

// Create worker to process payment retry jobs
export const paymentRetryWorker = new Worker<PaymentRetryJob>(
  'payment-retry',
  async (job: Job<PaymentRetryJob>) => {
    const { tenantId, invoiceId, attemptNumber } = job.data;

    logger.info('[PaymentRetryWorker] Processing payment retry', {
      jobId: job.id,
      tenantId,
      invoiceId,
      attemptNumber,
    });

    try {
      const dunningService = new DunningService();

      await job.updateProgress(10);

      // Attempt to retry the payment
      const success = await dunningService.retryPayment(tenantId, invoiceId);

      await job.updateProgress(100);

      logger.info('[PaymentRetryWorker] Payment retry completed', {
        jobId: job.id,
        tenantId,
        invoiceId,
        attemptNumber,
        success,
      });

      return {
        success,
        tenantId,
        invoiceId,
        attemptNumber,
      };
    } catch (error: any) {
      logger.error('[PaymentRetryWorker] Payment retry failed', {
        jobId: job.id,
        tenantId,
        invoiceId,
        attemptNumber,
        error: error.message,
        stack: error.stack,
      });

      // Don't throw - we don't want BullMQ to retry
      // Dunning service handles the retry logic
      return {
        success: false,
        tenantId,
        invoiceId,
        attemptNumber,
        error: error.message,
      };
    }
  },
  {
    connection,
    concurrency: 3, // Process 3 retries concurrently (conservative)
    limiter: {
      max: 50, // Max 50 retries
      duration: 60000, // per minute
    },
  }
);

// Worker event listeners
paymentRetryWorker.on('completed', (job, result) => {
  if (result.success) {
    logger.info('[PaymentRetryWorker] Payment retry succeeded', {
      jobId: job.id,
      tenantId: result.tenantId,
      invoiceId: result.invoiceId,
    });
  } else {
    logger.warn('[PaymentRetryWorker] Payment retry did not succeed', {
      jobId: job.id,
      tenantId: result.tenantId,
      invoiceId: result.invoiceId,
      error: result.error,
    });
  }
});

paymentRetryWorker.on('failed', (job, error) => {
  logger.error('[PaymentRetryWorker] Job failed unexpectedly', {
    jobId: job?.id,
    error: error.message,
  });
});

paymentRetryWorker.on('error', error => {
  logger.error('[PaymentRetryWorker] Worker error', {
    error: error.message,
  });
});

// Helper function to queue payment retry
export async function queuePaymentRetry(
  data: PaymentRetryJob,
  options?: {
    delay?: number;
    priority?: number;
  }
): Promise<Job<PaymentRetryJob>> {
  return await paymentRetryQueue.add('retry-payment', data, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: `retry-${data.tenantId}-${data.invoiceId}-${data.attemptNumber}`,
  });
}

// Scheduled job processor - runs periodically to check for due retries
export async function processScheduledRetries(): Promise<void> {
  logger.info('[PaymentRetryWorker] Processing scheduled retries');

  try {
    const dunningService = new DunningService();
    const result = await dunningService.processScheduledRetries();

    logger.info('[PaymentRetryWorker] Scheduled retries processed', {
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
    });
  } catch (error: any) {
    logger.error('[PaymentRetryWorker] Failed to process scheduled retries', {
      error: error.message,
    });
  }
}

// Schedule the retry processor to run every 30 minutes
const RETRY_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes

let retryCheckInterval: NodeJS.Timeout;

export function startScheduledRetryProcessor(): void {
  logger.info('[PaymentRetryWorker] Starting scheduled retry processor');

  // Run immediately on start
  processScheduledRetries().catch(error => {
    logger.error('[PaymentRetryWorker] Initial retry check failed', {
      error: error.message,
    });
  });

  // Then run every 30 minutes
  retryCheckInterval = setInterval(() => {
    processScheduledRetries().catch(error => {
      logger.error('[PaymentRetryWorker] Scheduled retry check failed', {
        error: error.message,
      });
    });
  }, RETRY_CHECK_INTERVAL);
}

export function stopScheduledRetryProcessor(): void {
  if (retryCheckInterval) {
    clearInterval(retryCheckInterval);
    logger.info('[PaymentRetryWorker] Scheduled retry processor stopped');
  }
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  logger.info('[PaymentRetryWorker] Shutting down gracefully...');

  stopScheduledRetryProcessor();
  await paymentRetryWorker.close();
  await paymentRetryQueue.close();
  connection.disconnect();

  logger.info('[PaymentRetryWorker] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start the scheduled processor
startScheduledRetryProcessor();

logger.info('[PaymentRetryWorker] Payment retry worker started');
