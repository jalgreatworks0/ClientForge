/**
 * BullMQ v3 Queue Configuration
 * Production-ready queue setup with DLQ and monitoring
 */

import { Queue, Worker, QueueEvents, Job, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import { logger } from '../../backend/utils/logging/logger';
import { queueJobsProcessed, queueJobsDLQ, queueJobDuration } from '../../backend/services/monitoring/metrics.service';

// Redis connection with proper settings for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

// CRITICAL: Set Redis to not evict queue data
connection.config('SET', 'maxmemory-policy', 'noeviction').catch((err) => {
  logger.warn('Could not set maxmemory-policy (may be managed Redis)', { error: err.message });
});

// Default job options
const defaultJobOptions: JobsOptions = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000
  },
  removeOnComplete: {
    count: 100,
    age: 3600 // 1 hour
  },
  removeOnFail: false  // Keep failed for DLQ
};

/**
 * Queue Registry - Maintains all queues and their schedulers
 */
class QueueRegistry {
  private queues: Map<string, Queue> = new Map();
  private dlqs: Map<string, Queue> = new Map();
  private events: Map<string, QueueEvents> = new Map();

  /**
   * Create a new queue with DLQ and monitoring
   */
  async createQueue(name: string, options?: Partial<JobsOptions>): Promise<Queue> {
    if (this.queues.has(name)) {
      return this.queues.get(name)!;
    }

    logger.info(`Creating queue: ${name}`);

    // Note: QueueScheduler was removed in BullMQ v4+, delayed jobs work automatically now

    // Create main queue
    const queue = new Queue(name, {
      connection,
      defaultJobOptions: {
        ...defaultJobOptions,
        ...options
      }
    });

    // Create DLQ for failed jobs
    const dlq = new Queue(`${name}:dlq`, { connection });
    this.dlqs.set(name, dlq);

    // Set up queue events for monitoring
    const queueEvents = new QueueEvents(name, { connection });
    try { await Promise.race([queueEvents.waitUntilReady(), new Promise((_, reject) => setTimeout(() => reject(new Error("QueueEvents timeout")), 5000))]); } catch (e) { logger.warn(`Queue events timeout for ${name}, continuing`); }

    // Monitor failed jobs and move to DLQ
    // @ts-expect-error BullMQ type definitions may be incomplete
    queueEvents.on('failed', async ({ jobId, failedReason, attemptsMade }) => {
      try {
        const job = await queue.getJob(jobId!);

        if (!job) return;

        if (attemptsMade && attemptsMade >= (job.opts.attempts || 5)) {
          // Move to DLQ
          await dlq.add('failed', {
            ...job.data,
            originalJobId: jobId,
            originalQueue: name,
            failedReason,
            failedAt: new Date().toISOString(),
            attemptsMade
          }, {
            removeOnComplete: false,
            removeOnFail: false
          });

          logger.error('Job moved to DLQ', {
            queue: name,
            jobId,
            reason: failedReason,
            attemptsMade
          });

          // Update metrics
          queueJobsDLQ.inc({ queue: name });
        }
      } catch (error: any) {
        logger.error('Failed to move job to DLQ', {
          queue: name,
          jobId,
          error: error.message
        });
      }
    });

    // Monitor completed jobs
    queueEvents.on('completed', ({ jobId, returnvalue }) => {
      queueJobsProcessed.inc({ queue: name, status: 'completed' });
    });

    // Monitor failed jobs
    queueEvents.on('failed', ({ jobId }) => {
      queueJobsProcessed.inc({ queue: name, status: 'failed' });
    });

    this.queues.set(name, queue);
    this.events.set(name, queueEvents);

    logger.info(`Queue created successfully: ${name}`);
    return queue;
  }

  /**
   * Get an existing queue
   */
  getQueue(name: string): Queue | undefined {
    return this.queues.get(name);
  }

  /**
   * Get DLQ for a queue
   */
  getDLQ(name: string): Queue | undefined {
    return this.dlqs.get(name);
  }

  /**
   * Get all queue names
   */
  getQueueNames(): string[] {
    return Array.from(this.queues.keys());
  }

  /**
   * Create worker for processing jobs
   */
  createWorker<T = any>(
    queueName: string,
    processor: (job: Job<T>) => Promise<any>,
    options?: {
      concurrency?: number;
      limiter?: {
        max: number;
        duration: number;
      };
    }
  ): Worker {
    return createWorker(queueName, processor, options);
  }

  /**
   * Graceful shutdown of all queues
   */
  async closeAll(): Promise<void> {
    logger.info('Closing all queues...');

    // Close queue events
    for (const [name, events] of this.events.entries()) {
      await events.close();
      logger.info(`Queue events closed: ${name}`);
    }

    // Close queues
    for (const [name, queue] of this.queues.entries()) {
      await queue.close();
      logger.info(`Queue closed: ${name}`);
    }

    // Close DLQs
    for (const [name, dlq] of this.dlqs.entries()) {
      await dlq.close();
      logger.info(`DLQ closed: ${name}`);
    }

    // Close Redis connection
    await connection.quit();
    logger.info('Redis connection closed');
  }
}

// Export singleton instance
export const queueRegistry = new QueueRegistry();

/**
 * Create worker for processing jobs
 */
export function createWorker<T = any>(
  queueName: string,
  processor: (job: Job<T>) => Promise<any>,
  options?: {
    concurrency?: number;
    limiter?: {
      max: number;
      duration: number;
    };
  }
): Worker {
  const worker = new Worker(queueName, async (job: Job<T>) => {
    const start = Date.now();

    try {
      logger.info(`Processing job`, {
        queue: queueName,
        jobId: job.id,
        attemptsMade: job.attemptsMade
      });

      const result = await processor(job);

      const duration = (Date.now() - start) / 1000;
      queueJobDuration.observe({ queue: queueName }, duration);

      logger.info(`Job completed`, {
        queue: queueName,
        jobId: job.id,
        duration
      });

      return result;
    } catch (error: any) {
      const duration = (Date.now() - start) / 1000;
      queueJobDuration.observe({ queue: queueName }, duration);

      logger.error(`Job failed`, {
        queue: queueName,
        jobId: job.id,
        error: error.message,
        attemptsMade: job.attemptsMade,
        duration
      });

      throw error;
    }
  }, {
    connection,
    concurrency: options?.concurrency || 10,
    limiter: options?.limiter
  });

  worker.on('error', (error) => {
    logger.error(`Worker error in queue: ${queueName}`, { error: error.message });
  });

  return worker;
}

/**
 * Initialize commonly used queues
 */
export async function initializeQueues() {
  logger.info('Initializing queues...');

  // Email queue
  await queueRegistry.createQueue('email', {
    attempts: 5,
    backoff: { type: 'exponential', delay: 2000 }
  });

  // Data sync queue (for Elasticsearch)
  await queueRegistry.createQueue('data-sync', {
    attempts: 3,
    backoff: { type: 'fixed', delay: 5000 }
  });

  // Embedding generation queue
  await queueRegistry.createQueue('embeddings', {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });

  // File processing queue (virus scan, etc.)
  await queueRegistry.createQueue('file-processing', {
    attempts: 2,
    backoff: { type: 'fixed', delay: 3000 }
  });

  // Notification queue
  await queueRegistry.createQueue('notifications', {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  });

  logger.info('All queues initialized');
}

/**
 * Graceful shutdown handler
 */
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing queues...');
  await queueRegistry.closeAll();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, closing queues...');
  await queueRegistry.closeAll();
  process.exit(0);
});

export { connection };
export default queueRegistry;
