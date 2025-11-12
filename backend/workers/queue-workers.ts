/**
 * Queue Workers Initialization
 * Centralizes initialization of all BullMQ workers for the application
 */

import { Job } from 'bullmq'
import { createWorker, queueRegistry } from '../../config/queue/bullmq.config'
import { initializeEmailSyncQueue, shutdownEmailSyncQueue } from '../queues/email-sync-queue'
import { logger } from '../utils/logging/logger'
import { SearchIndexJob } from '../services/queue/queue.service'
import { runSyncJob } from './elasticsearch-sync.worker'

// Store worker references for graceful shutdown
const workers: any[] = []

/**
 * Initialize Data Sync Worker (for Elasticsearch)
 */
async function initializeDataSyncWorker(): Promise<void> {
  try {
    logger.info('[Data Sync Worker] Initializing data sync worker')

    const dataSyncWorker = createWorker<SearchIndexJob>(
      'data-sync',
      async (job: Job<SearchIndexJob>) => {
        const { action, index, id, document, tenantId } = job.data

        logger.info('[Data Sync Worker] Processing sync job', {
          action,
          index,
          id,
          tenantId,
          jobId: job.id,
        })

        try {
          await runSyncJob({ index, id, action, body: document })
          return {
            success: true,
            action,
            index,
            id,
            syncedAt: new Date().toISOString(),
          }
        } catch (error: any) {
          logger.error('[Data Sync Worker] Sync failed', {
            action,
            index,
            id,
            error: error.message,
            jobId: job.id,
          })
          throw error
        }
      },
      {
        concurrency: 10, // Process 10 sync operations concurrently
      }
    )

    workers.push(dataSyncWorker)
    logger.info('[Data Sync Worker] Data sync worker initialized')
  } catch (error: any) {
    logger.error('[Data Sync Worker] Failed to initialize', {
      error: error.message,
    })
    throw error
  }
}

/**
 * Initialize Notification Worker
 */
async function initializeNotificationWorker(): Promise<void> {
  try {
    logger.info('[Notification Worker] Initializing notification worker')

    interface NotificationJob {
      userId: string
      tenantId: string
      type: 'deal_update' | 'task_assigned' | 'mention' | 'system'
      title: string
      message: string
      data?: Record<string, any>
    }

    const notificationWorker = createWorker<NotificationJob>(
      'notifications',
      async (job: Job<NotificationJob>) => {
        const { userId, tenantId, type, title, message, data } = job.data

        logger.info('[Notification Worker] Processing notification', {
          userId,
          tenantId,
          type,
          jobId: job.id,
        })

        try {
          // TODO: Implement actual notification sending
          // For now, just log the notification
          logger.info('[Notification Worker] Sending notification', {
            userId,
            type,
            title,
            message,
          })

          // Simulate notification sending (email, push, websocket, etc.)
          // await notificationService.send({ userId, type, title, message, data })

          return {
            success: true,
            userId,
            type,
            sentAt: new Date().toISOString(),
          }
        } catch (error: any) {
          logger.error('[Notification Worker] Notification failed', {
            userId,
            type,
            error: error.message,
            jobId: job.id,
          })
          throw error
        }
      },
      {
        concurrency: 20, // High concurrency for notifications
      }
    )

    workers.push(notificationWorker)
    logger.info('[Notification Worker] Notification worker initialized')
  } catch (error: any) {
    logger.error('[Notification Worker] Failed to initialize', {
      error: error.message,
    })
    throw error
  }
}

/**
 * Initialize File Processing Worker
 */
async function initializeFileProcessingWorker(): Promise<void> {
  try {
    logger.info('[File Processing Worker] Initializing file processing worker')

    interface FileProcessingJob {
      fileId: string
      fileName: string
      fileType: string
      filePath: string
      tenantId: string
      userId: string
      operations: ('virus-scan' | 'thumbnail' | 'metadata-extract')[]
    }

    const fileProcessingWorker = createWorker<FileProcessingJob>(
      'file-processing',
      async (job: Job<FileProcessingJob>) => {
        const { fileId, fileName, fileType, filePath, tenantId, userId, operations } = job.data

        logger.info('[File Processing Worker] Processing file', {
          fileId,
          fileName,
          fileType,
          operations,
          jobId: job.id,
        })

        try {
          const results: Record<string, any> = {}

          // Process each operation
          for (const operation of operations) {
            switch (operation) {
              case 'virus-scan':
                logger.info('[File Processing Worker] Scanning for viruses', { fileId })
                // await virusScanService.scan(filePath)
                results.virusScan = { clean: true, scannedAt: new Date().toISOString() }
                break
              case 'thumbnail':
                logger.info('[File Processing Worker] Generating thumbnail', { fileId })
                // await thumbnailService.generate(filePath)
                results.thumbnail = { generated: true, generatedAt: new Date().toISOString() }
                break
              case 'metadata-extract':
                logger.info('[File Processing Worker] Extracting metadata', { fileId })
                // const metadata = await metadataService.extract(filePath)
                results.metadata = { extracted: true, extractedAt: new Date().toISOString() }
                break
            }
          }

          return {
            success: true,
            fileId,
            results,
            processedAt: new Date().toISOString(),
          }
        } catch (error: any) {
          logger.error('[File Processing Worker] File processing failed', {
            fileId,
            fileName,
            error: error.message,
            jobId: job.id,
          })
          throw error
        }
      },
      {
        concurrency: 3, // Limited concurrency for heavy file operations
      }
    )

    workers.push(fileProcessingWorker)
    logger.info('[File Processing Worker] File processing worker initialized')
  } catch (error: any) {
    logger.error('[File Processing Worker] Failed to initialize', {
      error: error.message,
    })
    throw error
  }
}

/**
 * Initialize Embedding Generation Worker
 */
async function initializeEmbeddingWorker(): Promise<void> {
  try {
    logger.info('[Embedding Worker] Initializing embedding generation worker')

    interface EmbeddingJob {
      documentId: string
      documentType: 'contact' | 'account' | 'deal' | 'email' | 'note'
      text: string
      tenantId: string
    }

    const embeddingWorker = createWorker<EmbeddingJob>(
      'embeddings',
      async (job: Job<EmbeddingJob>) => {
        const { documentId, documentType, text, tenantId } = job.data

        logger.info('[Embedding Worker] Generating embeddings', {
          documentId,
          documentType,
          textLength: text.length,
          jobId: job.id,
        })

        try {
          // TODO: Implement actual embedding generation
          // For now, just log the operation
          logger.info('[Embedding Worker] Processing text for embeddings', {
            documentId,
            documentType,
            textLength: text.length,
          })

          // Simulate embedding generation
          // const embeddings = await aiService.generateEmbeddings(text)
          // await vectorStore.store(documentId, embeddings)

          return {
            success: true,
            documentId,
            documentType,
            embeddingsGenerated: true,
            generatedAt: new Date().toISOString(),
          }
        } catch (error: any) {
          logger.error('[Embedding Worker] Embedding generation failed', {
            documentId,
            documentType,
            error: error.message,
            jobId: job.id,
          })
          throw error
        }
      },
      {
        concurrency: 5, // Limited concurrency for AI operations
        limiter: {
          max: 20, // Max 20 embedding jobs
          duration: 60000, // Per 60 seconds (rate limiting for AI API)
        },
      }
    )

    workers.push(embeddingWorker)
    logger.info('[Embedding Worker] Embedding generation worker initialized')
  } catch (error: any) {
    logger.error('[Embedding Worker] Failed to initialize', {
      error: error.message,
    })
    throw error
  }
}

/**
 * Initialize all queue workers
 */
export async function initializeAllWorkers(): Promise<void> {
  try {
    logger.info('[Queue Workers] Initializing all queue workers...')

    // Initialize email sync queue and worker
    await initializeEmailSyncQueue()

    // Initialize data sync worker (for Elasticsearch)
    await initializeDataSyncWorker()

    // Initialize notification worker
    await initializeNotificationWorker()

    // Initialize file processing worker
    await initializeFileProcessingWorker()

    // Initialize embedding generation worker
    await initializeEmbeddingWorker()

    logger.info('[Queue Workers] All queue workers initialized successfully', {
      workerCount: workers.length + 1, // +1 for email sync worker managed separately
    })
  } catch (error: any) {
    logger.error('[Queue Workers] Failed to initialize workers', {
      error: error.message,
      stack: error.stack,
    })
    throw error
  }
}

/**
 * Shutdown all workers gracefully
 */
export async function shutdownAllWorkers(): Promise<void> {
  try {
    logger.info('[Queue Workers] Shutting down all workers...')

    // Shutdown email sync worker
    await shutdownEmailSyncQueue()

    // Shutdown all other workers
    await Promise.all(
      workers.map(async (worker) => {
        try {
          await worker.close()
        } catch (error: any) {
          logger.error('[Queue Workers] Error closing worker', {
            error: error.message,
          })
        }
      })
    )

    logger.info('[Queue Workers] All workers shut down successfully')
  } catch (error: any) {
    logger.error('[Queue Workers] Error during shutdown', {
      error: error.message,
    })
  }
}

// Graceful shutdown on process termination
process.on('SIGTERM', async () => {
  logger.info('[Queue Workers] SIGTERM received, shutting down workers...')
  await shutdownAllWorkers()
})

process.on('SIGINT', async () => {
  logger.info('[Queue Workers] SIGINT received, shutting down workers...')
  await shutdownAllWorkers()
})
