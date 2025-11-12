/**
 * Dunning Service
 * Handles failed payment recovery, retry logic, and subscription suspension
 * Manages payment retry schedules, customer notifications, and grace periods
 */

import Stripe from 'stripe';
import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

import { StripeService } from './stripe.service';
import { SubscriptionService } from './subscription.service';

export interface DunningAttempt {
  id: string;
  tenantId: string;
  subscriptionId: string;
  invoiceId: string;
  stripeInvoiceId: string;
  attemptNumber: number;
  attemptDate: Date;
  status: 'pending' | 'retrying' | 'succeeded' | 'failed' | 'abandoned';
  failureReason?: string;
  nextAttemptDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface DunningConfig {
  maxRetries: number;
  retryIntervals: number[]; // Days between retries
  gracePeriodDays: number;
  suspendAfterFailures: number;
  cancelAfterDays: number;
  sendNotifications: boolean;
}

export class DunningService {
  private pool: Pool;
  private stripeService: StripeService;
  private subscriptionService: SubscriptionService;

  // Default dunning configuration
  private defaultConfig: DunningConfig = {
    maxRetries: 4,
    retryIntervals: [3, 5, 7, 10], // Retry after 3, 5, 7, and 10 days
    gracePeriodDays: 3,
    suspendAfterFailures: 2,
    cancelAfterDays: 30,
    sendNotifications: true,
  };

  constructor() {
    this.pool = getPool();
    this.stripeService = new StripeService();
    this.subscriptionService = new SubscriptionService();
  }

  /**
   * Handle a failed invoice payment
   */
  async handleFailedPayment(
    tenantId: string,
    invoiceId: string,
    stripeInvoiceId: string,
    failureReason: string
  ): Promise<void> {
    try {
      if (!tenantId || !invoiceId || !stripeInvoiceId) {
        throw new Error('tenantId, invoiceId, and stripeInvoiceId are required');
      }

      // Get subscription
      const subscription = await this.subscriptionService.getCurrentSubscription(tenantId);
      if (!subscription) {
        logger.warn('[Dunning] No active subscription found', { tenantId });
        return;
      }

      // Get existing dunning attempts
      const existingAttempts = await this.getDunningAttempts(tenantId, invoiceId);
      const attemptNumber = existingAttempts.length + 1;

      // Get dunning config (could be customized per tenant)
      const config = await this.getDunningConfig(tenantId);

      // Check if we've exceeded max retries
      if (attemptNumber > config.maxRetries) {
        await this.handleMaxRetriesExceeded(tenantId, subscription.id, invoiceId);
        return;
      }

      // Calculate next attempt date
      const nextAttemptDate = this.calculateNextAttemptDate(attemptNumber, config);

      // Create dunning attempt record
      await this.pool.query(
        `INSERT INTO dunning_attempts (
          tenantId, subscription_id, invoice_id, stripe_invoice_id,
          attempt_number, attempt_date, status, failure_reason, next_attempt_date
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          tenantId,
          subscription.id,
          invoiceId,
          stripeInvoiceId,
          attemptNumber,
          new Date(),
          'failed',
          failureReason,
          nextAttemptDate,
        ]
      );

      // Check if we should suspend the subscription
      if (attemptNumber >= config.suspendAfterFailures) {
        await this.suspendSubscription(tenantId, subscription.id);
      }

      // Send notification to customer
      if (config.sendNotifications) {
        await this.sendPaymentFailedNotification(tenantId, {
          attemptNumber,
          nextAttemptDate,
          failureReason,
          invoiceId: stripeInvoiceId,
        });
      }

      logger.info('[Dunning] Failed payment recorded', {
        tenantId,
        invoiceId: stripeInvoiceId,
        attemptNumber,
        nextAttemptDate,
      });
    } catch (error: any) {
      logger.error('[Dunning] Failed to handle failed payment', {
        tenantId,
        invoiceId,
        error: error.message,
      });
      throw new Error('Failed to handle failed payment');
    }
  }

  /**
   * Retry a failed payment
   */
  async retryPayment(tenantId: string, invoiceId: string): Promise<boolean> {
    try {
      if (!tenantId || !invoiceId) {
        throw new Error('tenantId and invoiceId are required');
      }

      // Get invoice from database
      const result = await this.pool.query(
        'SELECT stripe_invoice_id FROM invoices WHERE tenantId = $1 AND id = $2',
        [tenantId, invoiceId]
      );

      if (result.rows.length === 0) {
        throw new Error('Invoice not found');
      }

      const stripeInvoiceId = result.rows[0].stripe_invoice_id;

      // Attempt to pay the invoice
      const stripe = this.stripeService.getStripeInstance();
      const invoice = await stripe.invoices.pay(stripeInvoiceId);

      const success = invoice.status === 'paid';

      if (success) {
        // Mark all dunning attempts as succeeded
        await this.pool.query(
          `UPDATE dunning_attempts
           SET status = 'succeeded', updated_at = NOW()
           WHERE tenantId = $1 AND invoice_id = $2`,
          [tenantId, invoiceId]
        );

        // Reactivate subscription if it was suspended
        await this.reactivateSubscription(tenantId);

        logger.info('[Dunning] Payment retry succeeded', {
          tenantId,
          invoiceId: stripeInvoiceId,
        });
      } else {
        // Record failed retry
        await this.handleFailedPayment(
          tenantId,
          invoiceId,
          stripeInvoiceId,
          'Retry payment failed'
        );

        logger.warn('[Dunning] Payment retry failed', {
          tenantId,
          invoiceId: stripeInvoiceId,
          status: invoice.status,
        });
      }

      return success;
    } catch (error: any) {
      logger.error('[Dunning] Failed to retry payment', {
        tenantId,
        invoiceId,
        error: error.message,
      });

      // Record failed retry
      if (error.type !== 'StripeCardError') {
        throw error;
      }

      return false;
    }
  }

  /**
   * Process scheduled retries (called by cron job)
   */
  async processScheduledRetries(): Promise<{ processed: number; succeeded: number; failed: number }> {
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      // Get all pending retries that are due
      const result = await this.pool.query(
        `SELECT DISTINCT tenantId, invoice_id, next_attempt_date
         FROM dunning_attempts
         WHERE status = 'failed'
           AND next_attempt_date IS NOT NULL
           AND next_attempt_date <= NOW()
           AND attempt_number <= (
             SELECT COALESCE(
               (SELECT max_retries FROM dunning_configs WHERE tenantId = dunning_attempts.tenantId),
               4
             )
           )
         ORDER BY next_attempt_date ASC
         LIMIT 100`
      );

      for (const row of result.rows) {
        processed++;

        try {
          // Mark as retrying
          await this.pool.query(
            `UPDATE dunning_attempts
             SET status = 'retrying', updated_at = NOW()
             WHERE tenantId = $1 AND invoice_id = $2 AND status = 'failed'`,
            [row.tenantId, row.invoice_id]
          );

          const success = await this.retryPayment(row.tenantId, row.invoice_id);

          if (success) {
            succeeded++;
          } else {
            failed++;
          }
        } catch (error: any) {
          logger.error('[Dunning] Failed to process retry', {
            tenantId: row.tenantId,
            invoiceId: row.invoice_id,
            error: error.message,
          });
          failed++;
        }
      }

      logger.info('[Dunning] Scheduled retries processed', {
        processed,
        succeeded,
        failed,
      });

      return { processed, succeeded, failed };
    } catch (error: any) {
      logger.error('[Dunning] Failed to process scheduled retries', {
        error: error.message,
      });
      throw new Error('Failed to process scheduled retries');
    }
  }

  /**
   * Get dunning attempts for an invoice
   */
  async getDunningAttempts(tenantId: string, invoiceId: string): Promise<DunningAttempt[]> {
    try {
      const result = await this.pool.query(
        `SELECT
          id, tenantId, subscription_id, invoice_id, stripe_invoice_id,
          attempt_number, attempt_date, status, failure_reason, next_attempt_date,
          created_at, updated_at
         FROM dunning_attempts
         WHERE tenantId = $1 AND invoice_id = $2
         ORDER BY attempt_number ASC`,
        [tenantId, invoiceId]
      );

      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenantId,
        subscriptionId: row.subscription_id,
        invoiceId: row.invoice_id,
        stripeInvoiceId: row.stripe_invoice_id,
        attemptNumber: row.attempt_number,
        attemptDate: row.attempt_date,
        status: row.status,
        failureReason: row.failure_reason,
        nextAttemptDate: row.next_attempt_date,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error: any) {
      logger.error('[Dunning] Failed to get dunning attempts', {
        tenantId,
        invoiceId,
        error: error.message,
      });
      throw new Error('Failed to get dunning attempts');
    }
  }

  /**
   * Suspend subscription due to payment failures
   */
  private async suspendSubscription(tenantId: string, subscriptionId: string): Promise<void> {
    try {
      // Update subscription status
      await this.pool.query(
        `UPDATE subscriptions
         SET status = 'past_due', updated_at = NOW()
         WHERE id = $1`,
        [subscriptionId]
      );

      logger.warn('[Dunning] Subscription suspended due to payment failures', {
        tenantId,
        subscriptionId,
      });

      // Send notification
      await this.sendSubscriptionSuspendedNotification(tenantId);
    } catch (error: any) {
      logger.error('[Dunning] Failed to suspend subscription', {
        tenantId,
        subscriptionId,
        error: error.message,
      });
    }
  }

  /**
   * Reactivate suspended subscription after successful payment
   */
  private async reactivateSubscription(tenantId: string): Promise<void> {
    try {
      const subscription = await this.subscriptionService.getCurrentSubscription(tenantId);
      if (!subscription) {
        return;
      }

      if (subscription.status === 'past_due') {
        // Update to active
        await this.pool.query(
          `UPDATE subscriptions
           SET status = 'active', updated_at = NOW()
           WHERE id = $1`,
          [subscription.id]
        );

        logger.info('[Dunning] Subscription reactivated after payment', {
          tenantId,
          subscriptionId: subscription.id,
        });

        // Send notification
        await this.sendSubscriptionReactivatedNotification(tenantId);
      }
    } catch (error: any) {
      logger.error('[Dunning] Failed to reactivate subscription', {
        tenantId,
        error: error.message,
      });
    }
  }

  /**
   * Handle max retries exceeded - cancel or mark as abandoned
   */
  private async handleMaxRetriesExceeded(
    tenantId: string,
    subscriptionId: string,
    invoiceId: string
  ): Promise<void> {
    try {
      const config = await this.getDunningConfig(tenantId);

      // Mark attempts as abandoned
      await this.pool.query(
        `UPDATE dunning_attempts
         SET status = 'abandoned', updated_at = NOW()
         WHERE tenantId = $1 AND invoice_id = $2`,
        [tenantId, invoiceId]
      );

      // Check if we should cancel the subscription
      const firstAttempt = await this.pool.query(
        `SELECT attempt_date FROM dunning_attempts
         WHERE tenantId = $1 AND invoice_id = $2
         ORDER BY attempt_number ASC
         LIMIT 1`,
        [tenantId, invoiceId]
      );

      if (firstAttempt.rows.length > 0) {
        const daysSinceFirstAttempt = Math.floor(
          (Date.now() - new Date(firstAttempt.rows[0].attempt_date).getTime()) /
            (1000 * 60 * 60 * 24)
        );

        if (daysSinceFirstAttempt >= config.cancelAfterDays) {
          // Cancel subscription
          await this.subscriptionService.cancelSubscription(tenantId, true);

          logger.warn('[Dunning] Subscription canceled after max retries', {
            tenantId,
            subscriptionId,
            daysSinceFirstAttempt,
          });

          // Send notification
          await this.sendSubscriptionCanceledNotification(tenantId);
        }
      }

      logger.warn('[Dunning] Max retries exceeded', {
        tenantId,
        invoiceId,
      });
    } catch (error: any) {
      logger.error('[Dunning] Failed to handle max retries exceeded', {
        tenantId,
        invoiceId,
        error: error.message,
      });
    }
  }

  /**
   * Get dunning configuration for a tenant (or default)
   */
  private async getDunningConfig(tenantId: string): Promise<DunningConfig> {
    try {
      const result = await this.pool.query(
        `SELECT
          max_retries, retry_intervals, grace_period_days,
          suspend_after_failures, cancel_after_days, send_notifications
         FROM dunning_configs
         WHERE tenantId = $1`,
        [tenantId]
      );

      if (result.rows.length > 0) {
        const row = result.rows[0];
        return {
          maxRetries: row.max_retries,
          retryIntervals: row.retry_intervals,
          gracePeriodDays: row.grace_period_days,
          suspendAfterFailures: row.suspend_after_failures,
          cancelAfterDays: row.cancel_after_days,
          sendNotifications: row.send_notifications,
        };
      }

      return this.defaultConfig;
    } catch (error: any) {
      logger.warn('[Dunning] Failed to get dunning config, using defaults', {
        tenantId,
        error: error.message,
      });
      return this.defaultConfig;
    }
  }

  /**
   * Calculate next attempt date based on retry intervals
   */
  private calculateNextAttemptDate(attemptNumber: number, config: DunningConfig): Date {
    const intervalDays =
      attemptNumber <= config.retryIntervals.length
        ? config.retryIntervals[attemptNumber - 1]
        : config.retryIntervals[config.retryIntervals.length - 1];

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + intervalDays);
    nextDate.setHours(10, 0, 0, 0); // Retry at 10 AM

    return nextDate;
  }

  /**
   * Send payment failed notification (placeholder - implement with email service)
   */
  private async sendPaymentFailedNotification(
    tenantId: string,
    details: {
      attemptNumber: number;
      nextAttemptDate: Date | null;
      failureReason: string;
      invoiceId: string;
    }
  ): Promise<void> {
    logger.info('[Dunning] Would send payment failed notification', {
      tenantId,
      details,
    });
    // TODO: Implement email notification
    // const { emailService } = await import('../email/email.service');
    // await emailService.sendPaymentFailed(userEmail, invoiceNumber, amountDue, nextRetryDate);
  }

  /**
   * Send subscription suspended notification (placeholder)
   */
  private async sendSubscriptionSuspendedNotification(tenantId: string): Promise<void> {
    logger.info('[Dunning] Would send subscription suspended notification', {
      tenantId,
    });
    // TODO: Implement email notification
    // const { emailService } = await import('../email/email.service');
    // await emailService.sendSubscriptionSuspended(userEmail);
  }

  /**
   * Send subscription reactivated notification (placeholder)
   */
  private async sendSubscriptionReactivatedNotification(tenantId: string): Promise<void> {
    logger.info('[Dunning] Would send subscription reactivated notification', {
      tenantId,
    });
    // TODO: Implement email notification
    // const { emailService } = await import('../email/email.service');
    // await emailService.sendSubscriptionReactivated(userEmail);
  }

  /**
   * Send subscription canceled notification (placeholder)
   */
  private async sendSubscriptionCanceledNotification(tenantId: string): Promise<void> {
    logger.info('[Dunning] Would send subscription canceled notification', {
      tenantId,
    });
    // TODO: Implement email notification
    // const { emailService } = await import('../email/email.service');
    // await emailService.sendSubscriptionCanceled(userEmail);
  }
}
