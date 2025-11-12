/**
 * Stripe Service
 * Handles all Stripe API interactions for billing and payment processing
 * Provides customer management, payment methods, and webhook handling
 */

import Stripe from 'stripe';
import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

export interface CreateCustomerParams {
  tenantId: string;
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

export interface AttachPaymentMethodResult {
  paymentMethod: Stripe.PaymentMethod;
  stored: boolean;
}

export class StripeService {
  private pool: Pool;
  private stripe: Stripe;

  constructor() {
    this.pool = getPool();

    if (!process.env.STRIPE_SECRET_KEY) {
      logger.warn('[Stripe] STRIPE_SECRET_KEY not set - billing features unavailable'); return;
    }

    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2023-10-16',
      typescript: true,
      maxNetworkRetries: 3,
      timeout: 30000,
    });

    logger.info('[Stripe] Service initialized');
  }

  /**
   * Create a new Stripe customer and store in database
   */
  async createCustomer(params: CreateCustomerParams): Promise<Stripe.Customer> {
    const { tenantId, email, name, metadata } = params;

    try {
      // Validate inputs
      if (!tenantId || !email) {
        throw new Error('tenantId and email are required');
      }

      if (!this.isValidEmail(email)) {
        throw new Error('Invalid email format');
      }

      // Check if customer already exists for this tenant
      const existing = await this.pool.query(
        'SELECT stripe_customer_id FROM billing_customers WHERE tenantId = $1',
        [tenantId]
      );

      if (existing.rows.length > 0) {
        logger.warn('[Stripe] Customer already exists for tenant', { tenantId });
        return await this.stripe.customers.retrieve(existing.rows[0].stripe_customer_id) as Stripe.Customer;
      }

      // Create customer in Stripe
      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          tenantId,
          environment: process.env.NODE_ENV || 'development',
          ...metadata,
        },
      });

      // Store in database
      await this.pool.query(
        `INSERT INTO billing_customers (tenantId, stripe_customer_id, email, name, currency)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (tenantId) DO UPDATE SET
         stripe_customer_id = EXCLUDED.stripe_customer_id,
         email = EXCLUDED.email,
         name = EXCLUDED.name,
         updated_at = NOW()`,
        [tenantId, customer.id, email, name || null, customer.currency || 'usd']
      );

      logger.info('[Stripe] Customer created successfully', {
        tenantId,
        customerId: customer.id,
        email,
      });

      return customer;
    } catch (error: any) {
      logger.error('[Stripe] Customer creation failed', {
        tenantId,
        email,
        error: error.message,
        code: error.code,
      });

      if (error.type === 'StripeInvalidRequestError') {
        throw new Error('Invalid customer data provided');
      }

      throw new Error('Failed to create Stripe customer');
    }
  }

  /**
   * Retrieve a Stripe customer by ID
   */
  async getCustomer(stripeCustomerId: string): Promise<Stripe.Customer | null> {
    try {
      if (!stripeCustomerId) {
        return null;
      }

      const customer = await this.stripe.customers.retrieve(stripeCustomerId);

      if (customer.deleted) {
        logger.warn('[Stripe] Attempted to retrieve deleted customer', { stripeCustomerId });
        return null;
      }

      return customer as Stripe.Customer;
    } catch (error: any) {
      if (error.code === 'resource_missing') {
        logger.warn('[Stripe] Customer not found', { stripeCustomerId });
        return null;
      }

      logger.error('[Stripe] Error retrieving customer', {
        stripeCustomerId,
        error: error.message,
      });

      return null;
    }
  }

  /**
   * Get Stripe customer ID for a tenant
   */
  async getCustomerIdForTenant(tenantId: string): Promise<string | null> {
    try {
      const result = await this.pool.query(
        'SELECT stripe_customer_id FROM billing_customers WHERE tenantId = $1',
        [tenantId]
      );

      return result.rows.length > 0 ? result.rows[0].stripe_customer_id : null;
    } catch (error: any) {
      logger.error('[Stripe] Error getting customer ID for tenant', {
        tenantId,
        error: error.message,
      });
      return null;
    }
  }

  /**
   * Attach a payment method to a customer
   */
  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<AttachPaymentMethodResult> {
    try {
      if (!customerId || !paymentMethodId) {
        throw new Error('customerId and paymentMethodId are required');
      }

      // Attach payment method to customer in Stripe
      const paymentMethod = await this.stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      // Retrieve payment method details
      const pm = await this.stripe.paymentMethods.retrieve(paymentMethodId);

      // Get tenant ID from customer
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      const tenantId = customer.metadata?.tenantId;

      if (!tenantId) {
        logger.warn('[Stripe] No tenantId in customer metadata', { customerId });
      }

      // Store in database
      let stored = false;
      if (tenantId) {
        await this.pool.query(
          `INSERT INTO payment_methods (
            tenantId, stripe_payment_method_id, stripe_customer_id,
            type, card_brand, card_last4, card_exp_month, card_exp_year
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (stripe_payment_method_id) DO UPDATE SET
          updated_at = NOW()`,
          [
            tenantId,
            paymentMethod.id,
            customerId,
            pm.type,
            pm.card?.brand || null,
            pm.card?.last4 || null,
            pm.card?.exp_month || null,
            pm.card?.exp_year || null,
          ]
        );
        stored = true;
      }

      logger.info('[Stripe] Payment method attached', {
        customerId,
        paymentMethodId,
        type: pm.type,
        tenantId,
      });

      return { paymentMethod, stored };
    } catch (error: any) {
      logger.error('[Stripe] Payment method attachment failed', {
        customerId,
        paymentMethodId,
        error: error.message,
        code: error.code,
      });

      if (error.code === 'resource_missing') {
        throw new Error('Payment method or customer not found');
      }

      throw new Error('Failed to attach payment method');
    }
  }

  /**
   * Set a payment method as the default for a customer
   */
  async setDefaultPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<void> {
    try {
      if (!customerId || !paymentMethodId) {
        throw new Error('customerId and paymentMethodId are required');
      }

      // Update customer's default payment method in Stripe
      await this.stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      // Update database - set all to false, then set this one to true
      const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
      const tenantId = customer.metadata?.tenantId;

      if (tenantId) {
        await this.pool.query('BEGIN');

        // Set all payment methods for this tenant to non-default
        await this.pool.query(
          'UPDATE payment_methods SET is_default = false WHERE tenantId = $1',
          [tenantId]
        );

        // Set the specified payment method as default
        await this.pool.query(
          'UPDATE payment_methods SET is_default = true WHERE stripe_payment_method_id = $1',
          [paymentMethodId]
        );

        await this.pool.query('COMMIT');
      }

      logger.info('[Stripe] Default payment method set', {
        customerId,
        paymentMethodId,
        tenantId,
      });
    } catch (error: any) {
      await this.pool.query('ROLLBACK');

      logger.error('[Stripe] Failed to set default payment method', {
        customerId,
        paymentMethodId,
        error: error.message,
      });

      throw new Error('Failed to set default payment method');
    }
  }

  /**
   * Detach a payment method from a customer
   */
  async detachPaymentMethod(paymentMethodId: string): Promise<void> {
    try {
      if (!paymentMethodId) {
        throw new Error('paymentMethodId is required');
      }

      // Detach from Stripe
      await this.stripe.paymentMethods.detach(paymentMethodId);

      // Remove from database
      await this.pool.query(
        'DELETE FROM payment_methods WHERE stripe_payment_method_id = $1',
        [paymentMethodId]
      );

      logger.info('[Stripe] Payment method detached', { paymentMethodId });
    } catch (error: any) {
      logger.error('[Stripe] Failed to detach payment method', {
        paymentMethodId,
        error: error.message,
      });

      throw new Error('Failed to detach payment method');
    }
  }

  /**
   * Create a SetupIntent for adding payment methods with 3D Secure/SCA
   */
  async createSetupIntent(customerId: string): Promise<Stripe.SetupIntent> {
    try {
      if (!customerId) {
        throw new Error('customerId is required');
      }

      const setupIntent = await this.stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'off_session',
      });

      logger.info('[Stripe] SetupIntent created', {
        customerId,
        setupIntentId: setupIntent.id,
      });

      return setupIntent;
    } catch (error: any) {
      logger.error('[Stripe] SetupIntent creation failed', {
        customerId,
        error: error.message,
      });

      throw new Error('Failed to create SetupIntent');
    }
  }

  /**
   * Verify Stripe webhook signature
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    try {
      if (!process.env.STRIPE_WEBHOOK_SECRET) {
        throw new Error('STRIPE_WEBHOOK_SECRET environment variable is not set');
      }

      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      logger.info('[Stripe] Webhook signature verified', {
        eventType: event.type,
        eventId: event.id,
      });

      return event;
    } catch (error: any) {
      logger.error('[Stripe] Webhook signature verification failed', {
        error: error.message,
      });

      throw new Error('Webhook signature verification failed');
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    try {
      logger.info('[Stripe] Processing webhook event', {
        eventType: event.type,
        eventId: event.id,
      });

      switch (event.type) {
        case 'customer.subscription.created':
          await this.handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;

        case 'invoice.payment_succeeded':
          await this.handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;

        case 'payment_method.attached':
          await this.handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'payment_method.detached':
          await this.handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;

        case 'customer.updated':
          await this.handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;

        default:
          logger.info('[Stripe] Unhandled webhook event type', { eventType: event.type });
      }

      logger.info('[Stripe] Webhook event processed successfully', {
        eventType: event.type,
        eventId: event.id,
      });
    } catch (error: any) {
      logger.error('[Stripe] Webhook event processing failed', {
        eventType: event.type,
        eventId: event.id,
        error: error.message,
      });

      throw error;
    }
  }

  /**
   * Private webhook handlers
   */
  private async handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('[Stripe] Subscription created webhook', {
      subscriptionId: subscription.id,
      customerId: subscription.customer,
    });
    // This will be handled by subscription.service.ts
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    logger.info('[Stripe] Subscription updated webhook', {
      subscriptionId: subscription.id,
      status: subscription.status,
    });
    // This will be handled by subscription.service.ts
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    logger.info('[Stripe] Subscription deleted webhook', {
      subscriptionId: subscription.id,
    });
    // This will be handled by subscription.service.ts
  }

  private async handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    logger.info('[Stripe] Invoice payment succeeded webhook', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_paid,
    });
    // This will be handled by invoice.service.ts
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    logger.warn('[Stripe] Invoice payment failed webhook', {
      invoiceId: invoice.id,
      customerId: invoice.customer,
      amount: invoice.amount_due,
    });
    // This will be handled by dunning.service.ts
  }

  private async handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    logger.info('[Stripe] Payment method attached webhook', {
      paymentMethodId: paymentMethod.id,
      customerId: paymentMethod.customer,
    });
  }

  private async handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
    logger.info('[Stripe] Payment method detached webhook', {
      paymentMethodId: paymentMethod.id,
    });
  }

  private async handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
    logger.info('[Stripe] Customer updated webhook', {
      customerId: customer.id,
    });

    // Update customer data in database
    const tenantId = customer.metadata?.tenantId;
    if (tenantId) {
      await this.pool.query(
        `UPDATE billing_customers
         SET email = $1, name = $2, updated_at = NOW()
         WHERE stripe_customer_id = $3`,
        [customer.email, customer.name, customer.id]
      );
    }
  }

  /**
   * Utility: Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Get Stripe instance (for use by other services)
   */
  getStripeInstance(): Stripe {
    return this.stripe;
  }
}
