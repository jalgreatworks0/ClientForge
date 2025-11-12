/**
 * Billing Module
 * Handles subscription management, invoicing, payment processing, and usage metering
 * Integrates with Stripe for payments and TaxJar for tax compliance
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import { Express } from 'express';
import express from 'express';

import { IModule, ModuleContext, ModuleHealth } from '../../core/modules/ModuleContract';
import { logger } from '../../utils/logging/logger';

// Import routes
import billingRoutes from '../../api/rest/v1/routes/billing-routes';
import subscriptionRoutes from '../../api/rest/v1/routes/subscription-routes';
import webhookRoutes from '../../api/rest/v1/routes/webhook-routes';

// Import workers
import {
  invoiceQueue,
  invoiceWorker,
  queueInvoiceGeneration,
} from '../../workers/billing/invoice-generator.worker';
import {
  paymentRetryQueue,
  paymentRetryWorker,
  queuePaymentRetry,
  startScheduledRetryProcessor,
  stopScheduledRetryProcessor,
} from '../../workers/billing/payment-retry.worker';

export class BillingModule implements IModule {
  name = 'billing';
  version = '1.0.0';
  dependencies: string[] = []; // No module dependencies
  optionalDependencies = ['email']; // Email for invoice delivery

  metadata = {
    description: 'Complete billing system with Stripe integration, subscriptions, and usage metering',
    author: 'ClientForge CRM Team',
    tags: ['billing', 'payments', 'subscriptions', 'stripe', 'invoicing'],
  };

  /**
   * Initialize module
   */
  async initialize(context: ModuleContext): Promise<void> {
    logger.info('[Billing] Initializing billing module...');

    // Verify environment variables
    this.verifyEnvironmentVariables(context);

    // Create required directories
    await this.createDirectories();

    // Start scheduled payment retry processor
    startScheduledRetryProcessor();

    logger.info('[Billing] Module initialized successfully');
  }

  /**
   * Register HTTP routes
   */
  registerRoutes(app: Express, context: ModuleContext): void {
    logger.info('[Billing] Registering routes...');

    // Webhook route needs raw body for signature verification
    app.post(
      '/api/v1/webhooks/stripe',
      express.raw({ type: 'application/json' }),
      webhookRoutes
    );

    // Regular billing routes
    app.use('/api/v1/billing', billingRoutes);
    app.use('/api/v1/subscriptions', subscriptionRoutes);

    // Static file serving for invoice PDFs
    const invoicesPath = path.join(process.cwd(), 'storage', 'invoices');
    app.use('/invoices', express.static(invoicesPath));

    logger.info('[Billing] Routes registered successfully');
  }

  /**
   * Register background jobs
   */
  async registerJobs(context: ModuleContext): Promise<void> {
    logger.info('[Billing] Registering background workers...');

    // Workers are already initialized when imported at app startup
    // They run in the background independently
    logger.info('[Billing] Background workers registered (initialized at startup)');
  }

  /**
   * Register event handlers
   */
  registerEventHandlers(context: ModuleContext): void {
    logger.info('[Billing] Registering event handlers...');

    // Listen for subscription events from other modules
    context.events.on('subscription:created', async (data: any) => {
      logger.info('[Billing] Subscription created event received', { data });
      // Additional processing if needed
    });

    context.events.on('subscription:canceled', async (data: any) => {
      logger.info('[Billing] Subscription canceled event received', { data });
      // Additional processing if needed
    });

    context.events.on('invoice:paid', async (data: any) => {
      logger.info('[Billing] Invoice paid event received', { data });
      // Emit event for other modules (e.g., email module to send receipt)
      context.events.emit('billing:invoice-paid', data);
    });

    context.events.on('payment:failed', async (data: any) => {
      logger.info('[Billing] Payment failed event received', { data });
      // Emit event for other modules (e.g., email module to send failure notice)
      context.events.emit('billing:payment-failed', data);
    });

    logger.info('[Billing] Event handlers registered successfully');
  }

  /**
   * Run database migrations
   */
  async migrate(context: ModuleContext): Promise<void> {
    logger.info('[Billing] Running database migrations...');

    try {
      // Read migration file
      const migrationPath = path.join(
        process.cwd(),
        'database',
        'migrations',
        '012_billing_system.sql'
      );

      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

      // Execute migration
      await context.db.query(migrationSQL);

      logger.info('[Billing] Database migration completed successfully');
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        logger.info('[Billing] Tables already exist, skipping migration');
      } else {
        logger.error('[Billing] Migration failed', { error: error.message });
        throw error;
      }
    }
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    logger.info('[Billing] Shutting down billing module...');

    try {
      // Stop scheduled retry processor
      stopScheduledRetryProcessor();

      // Close workers
      await invoiceWorker.close();
      await paymentRetryWorker.close();

      // Close queues
      await invoiceQueue.close();
      await paymentRetryQueue.close();

      logger.info('[Billing] Module shut down successfully');
    } catch (error: any) {
      logger.error('[Billing] Error during shutdown', { error: error.message });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(context: ModuleContext): Promise<ModuleHealth> {
    try {
      // Check database connection
      await context.db.query('SELECT 1');

      // Check if Stripe is configured
      if (!process.env.STRIPE_SECRET_KEY) {
        logger.warn('[Billing] Stripe not configured');
        return { status: 'degraded', message: 'Stripe not configured' };
      }

      // Check workers are running
      const invoiceWorkerRunning = !invoiceWorker.isRunning() === false;
      const paymentRetryWorkerRunning = !paymentRetryWorker.isRunning() === false;

      if (!invoiceWorkerRunning || !paymentRetryWorkerRunning) {
        logger.warn('[Billing] Workers not running');
        return {
          status: 'degraded',
          message: 'Some workers not running',
          details: { invoiceWorkerRunning, paymentRetryWorkerRunning }
        };
      }

      return { status: 'ok', message: 'Billing module healthy' };
    } catch (error: any) {
      logger.error('[Billing] Health check failed', { error: error.message });
      return {
        status: 'down',
        message: 'Health check failed',
        details: { error: error.message }
      };
    }
  }

  /**
   * Verify required environment variables
   */
  private verifyEnvironmentVariables(context: ModuleContext): void {
    const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
    const missing: string[] = [];

    for (const envVar of required) {
      if (!context.env[envVar]) {
        missing.push(envVar);
      }
    }

    if (missing.length > 0) {
      logger.warn('[Billing] Missing environment variables', { missing });
      logger.warn('[Billing] Stripe integration will not work until these are set');
    } else {
      logger.info('[Billing] All required environment variables present');
    }

    // Optional variables
    if (!context.env.TAXJAR_API_KEY) {
      logger.info('[Billing] TaxJar not configured - tax calculation disabled');
    }
  }

  /**
   * Create required directories
   */
  private async createDirectories(): Promise<void> {
    const directories = [
      path.join(process.cwd(), 'storage', 'invoices'),
    ];

    for (const dir of directories) {
      try {
        await fs.mkdir(dir, { recursive: true });
        logger.info('[Billing] Created directory', { path: dir });
      } catch (error: any) {
        if (error.code !== 'EEXIST') {
          logger.error('[Billing] Failed to create directory', {
            path: dir,
            error: error.message,
          });
        }
      }
    }
  }
}

// Export a singleton instance
export const billingModule = new BillingModule();
