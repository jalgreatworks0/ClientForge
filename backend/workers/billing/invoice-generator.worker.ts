/**
 * Invoice Generator Worker
 * Processes invoice generation jobs in the background using BullMQ
 * Handles PDF generation, tax calculation, and delivery
 */

import { Worker, Job, Queue } from 'bullmq';
import { InvoiceService } from '../../services/billing/invoice.service';
import { TaxCalculationService } from '../../services/billing/tax-calculation.service';
import { logger } from '../../utils/logging/logger';
import IORedis from 'ioredis';

interface InvoiceGenerationJob {
  tenantId: string;
  invoiceId: string;
  generatePDF?: boolean;
  sendEmail?: boolean;
  emailRecipient?: string;
}

// Redis connection for BullMQ
const connection = new IORedis({
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
});

// Create queue for invoice generation
export const invoiceQueue = new Queue<InvoiceGenerationJob>('invoice-generation', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // Start with 5 second delay
    },
    removeOnComplete: {
      age: 7 * 24 * 3600, // Keep completed jobs for 7 days
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // Keep failed jobs for 30 days
    },
  },
});

// Create worker to process invoice generation jobs
export const invoiceWorker = new Worker<InvoiceGenerationJob>(
  'invoice-generation',
  async (job: Job<InvoiceGenerationJob>) => {
    const { tenantId, invoiceId, generatePDF = true, sendEmail = false, emailRecipient } = job.data;

    logger.info('[InvoiceWorker] Processing invoice generation job', {
      jobId: job.id,
      tenantId,
      invoiceId,
    });

    try {
      const invoiceService = new InvoiceService();
      const taxService = new TaxCalculationService();

      // Update job progress
      await job.updateProgress(10);

      // Get invoice
      const invoice = await invoiceService.getInvoice(tenantId, invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      await job.updateProgress(20);

      // Generate PDF if requested
      let pdfUrl: string | undefined;
      if (generatePDF) {
        logger.info('[InvoiceWorker] Generating PDF', {
          jobId: job.id,
          invoiceId,
        });

        pdfUrl = await invoiceService.generateInvoicePDF(tenantId, invoiceId);

        await job.updateProgress(60);
      }

      // Send email if requested
      if (sendEmail && emailRecipient) {
        logger.info('[InvoiceWorker] Sending invoice email', {
          jobId: job.id,
          invoiceId,
          recipient: emailRecipient,
        });

        // Send invoice via email - Email service integrated
        const { emailService } = await import('../../services/email/email.service'); await emailService.sendInvoice(emailRecipient, invoice.invoiceNumber, pdfUrl, invoice.amountDue);

        await job.updateProgress(90);
      }

      await job.updateProgress(100);

      logger.info('[InvoiceWorker] Invoice generation completed', {
        jobId: job.id,
        tenantId,
        invoiceId,
        pdfUrl,
      });

      return {
        success: true,
        invoiceId,
        pdfUrl,
        emailSent: sendEmail,
      };
    } catch (error: any) {
      logger.error('[InvoiceWorker] Invoice generation failed', {
        jobId: job.id,
        tenantId,
        invoiceId,
        error: error.message,
        stack: error.stack,
      });

      throw error; // Let BullMQ handle retries
    }
  },
  {
    connection,
    concurrency: 5, // Process 5 invoices concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 60000, // per minute
    },
  }
);

// Worker event listeners
invoiceWorker.on('completed', (job, result) => {
  logger.info('[InvoiceWorker] Job completed successfully', {
    jobId: job.id,
    result,
  });
});

invoiceWorker.on('failed', (job, error) => {
  logger.error('[InvoiceWorker] Job failed', {
    jobId: job?.id,
    error: error.message,
    attempts: job?.attemptsMade,
  });
});

invoiceWorker.on('error', error => {
  logger.error('[InvoiceWorker] Worker error', {
    error: error.message,
  });
});

// Helper function to send invoice email (placeholder)
async function sendInvoiceEmail(
  tenantId: string,
  invoice: any,
  pdfUrl: string | undefined,
  recipient: string
): Promise<void> {
  logger.info('[InvoiceWorker] Email would be sent', {
    tenantId,
    invoiceId: invoice.id,
    recipient,
    pdfUrl,
  });

  // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  // Example:
  // await emailService.send({
  //   to: recipient,
  //   subject: `Invoice ${invoice.invoiceNumber}`,
  //   template: 'invoice',
  //   data: {
  //     invoiceNumber: invoice.invoiceNumber,
  //     amountDue: invoice.amountDue,
  //     dueDate: invoice.dueDate,
  //     pdfUrl: pdfUrl,
  //   },
  // });
}

// Helper function to queue invoice generation
export async function queueInvoiceGeneration(
  data: InvoiceGenerationJob,
  options?: {
    delay?: number;
    priority?: number;
  }
): Promise<Job<InvoiceGenerationJob>> {
  return await invoiceQueue.add('generate-invoice', data, {
    delay: options?.delay,
    priority: options?.priority,
    jobId: `invoice-${data.invoiceId}-${Date.now()}`,
  });
}

// Graceful shutdown
async function gracefulShutdown(): Promise<void> {
  logger.info('[InvoiceWorker] Shutting down gracefully...');

  await invoiceWorker.close();
  await invoiceQueue.close();
  connection.disconnect();

  logger.info('[InvoiceWorker] Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

logger.info('[InvoiceWorker] Invoice generation worker started');
