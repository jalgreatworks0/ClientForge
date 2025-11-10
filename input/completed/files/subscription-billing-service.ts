/**
 * Subscription Billing Service
 * Handles subscription management, invoicing, and Stripe integration
 */

import { logger } from '../../../utils/logging/logger'
import { AppError, NotFoundError, ValidationError } from '../../../utils/errors/app-error'
import Stripe from 'stripe'

// Initialize Stripe (use environment variable)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SubscriptionPlan {
  id: string
  tenantId: string
  name: string
  description?: string
  billingInterval: 'monthly' | 'yearly' | 'quarterly'
  price: number
  currency: string
  trialPeriodDays: number
  features: string[]
  isActive: boolean
  stripePriceId?: string
  createdAt: Date
  updatedAt: Date
}

export interface Subscription {
  id: string
  tenantId: string
  accountId: string
  planId: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid'
  currentPeriodStart?: Date
  currentPeriodEnd?: Date
  trialEnd?: Date
  cancelAtPeriodEnd: boolean
  canceledAt?: Date
  createdAt: Date
  updatedAt: Date
}

export interface Invoice {
  id: string
  tenantId: string
  subscriptionId?: string
  accountId?: string
  invoiceNumber: string
  stripeInvoiceId?: string
  amountSubtotal: number
  amountTax: number
  amountTotal: number
  currency: string
  status: 'draft' | 'open' | 'paid' | 'void' | 'uncollectible'
  dueDate?: Date
  paidAt?: Date
  invoicePdfUrl?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
}

export interface Payment {
  id: string
  tenantId: string
  invoiceId?: string
  stripePaymentIntentId?: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed' | 'canceled' | 'refunded'
  paymentMethod?: string
  failureMessage?: string
  paidAt?: Date
  refundedAt?: Date
  createdAt: Date
}

export interface CreatePlanInput {
  name: string
  description?: string
  billingInterval: 'monthly' | 'yearly' | 'quarterly'
  price: number
  currency?: string
  trialPeriodDays?: number
  features?: string[]
}

export interface CreateSubscriptionInput {
  accountId: string
  planId: string
  paymentMethodId?: string
  trialDays?: number
}

export interface UpdateSubscriptionInput {
  planId?: string
  cancelAtPeriodEnd?: boolean
}

// ============================================================================
// SUBSCRIPTION BILLING SERVICE
// ============================================================================

export class SubscriptionBillingService {
  // ========================================================================
  // SUBSCRIPTION PLANS
  // ========================================================================

  /**
   * Create a new subscription plan (and sync with Stripe)
   */
  async createPlan(
    tenantId: string,
    userId: string,
    data: CreatePlanInput
  ): Promise<SubscriptionPlan> {
    try {
      // Create price in Stripe
      const stripePrice = await stripe.prices.create({
        currency: data.currency || 'usd',
        unit_amount: Math.round(data.price * 100), // Convert to cents
        recurring: {
          interval: data.billingInterval === 'quarterly' ? 'month' : data.billingInterval,
          interval_count: data.billingInterval === 'quarterly' ? 3 : 1,
        },
        product_data: {
          name: data.name,
          description: data.description,
        },
      })

      // TODO: Insert into database
      // const plan = await db.subscriptionPlans.create({
      //   tenantId,
      //   ...data,
      //   stripePriceId: stripePrice.id,
      // })

      logger.info('Subscription plan created', {
        tenantId,
        planName: data.name,
        stripePriceId: stripePrice.id,
      })

      // Placeholder return
      return {
        id: 'plan-placeholder',
        tenantId,
        stripePriceId: stripePrice.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        features: data.features || [],
        ...data,
      } as SubscriptionPlan
    } catch (error) {
      logger.error('Failed to create subscription plan', { error, tenantId })
      throw new AppError('Failed to create subscription plan', 500)
    }
  }

  /**
   * List all subscription plans
   */
  async listPlans(tenantId: string): Promise<SubscriptionPlan[]> {
    // TODO: Fetch from database
    // return await db.subscriptionPlans.findAll({ where: { tenantId, isActive: true } })
    return []
  }

  /**
   * Get plan by ID
   */
  async getPlanById(id: string, tenantId: string): Promise<SubscriptionPlan> {
    // TODO: Fetch from database
    // const plan = await db.subscriptionPlans.findOne({ where: { id, tenantId } })
    // if (!plan) throw new NotFoundError('Subscription plan')
    // return plan
    throw new NotFoundError('Subscription plan')
  }

  // ========================================================================
  // SUBSCRIPTIONS
  // ========================================================================

  /**
   * Create a new subscription
   */
  async createSubscription(
    tenantId: string,
    userId: string,
    data: CreateSubscriptionInput
  ): Promise<Subscription> {
    try {
      // 1. Get plan details
      const plan = await this.getPlanById(data.planId, tenantId)

      // 2. Get or create Stripe customer
      // TODO: Fetch account details to get email
      const customer = await stripe.customers.create({
        email: 'customer@example.com', // TODO: Get from account
        metadata: {
          tenantId,
          accountId: data.accountId,
        },
      })

      // 3. Attach payment method if provided
      if (data.paymentMethodId) {
        await stripe.paymentMethods.attach(data.paymentMethodId, {
          customer: customer.id,
        })
        await stripe.customers.update(customer.id, {
          invoice_settings: {
            default_payment_method: data.paymentMethodId,
          },
        })
      }

      // 4. Create subscription in Stripe
      const stripeSubscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: plan.stripePriceId }],
        trial_period_days: data.trialDays || plan.trialPeriodDays,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      })

      // 5. Save subscription to database
      // TODO: Insert into database
      // const subscription = await db.subscriptions.create({
      //   tenantId,
      //   accountId: data.accountId,
      //   planId: data.planId,
      //   stripeSubscriptionId: stripeSubscription.id,
      //   stripeCustomerId: customer.id,
      //   status: stripeSubscription.status,
      //   currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
      //   currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      // })

      logger.info('Subscription created', {
        tenantId,
        accountId: data.accountId,
        subscriptionId: stripeSubscription.id,
      })

      // Placeholder return
      return {
        id: 'sub-placeholder',
        tenantId,
        accountId: data.accountId,
        planId: data.planId,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customer.id,
        status: stripeSubscription.status as any,
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        cancelAtPeriodEnd: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    } catch (error) {
      logger.error('Failed to create subscription', { error, tenantId })
      throw new AppError('Failed to create subscription', 500)
    }
  }

  /**
   * Update subscription (change plan, cancel, etc.)
   */
  async updateSubscription(
    id: string,
    tenantId: string,
    userId: string,
    data: UpdateSubscriptionInput
  ): Promise<Subscription> {
    try {
      // TODO: Get subscription from database
      // const subscription = await db.subscriptions.findOne({ where: { id, tenantId } })
      // if (!subscription) throw new NotFoundError('Subscription')

      // Update in Stripe
      const stripeSubscriptionId = 'sub_placeholder' // TODO: Get from database

      if (data.planId) {
        // Change plan
        const newPlan = await this.getPlanById(data.planId, tenantId)
        await stripe.subscriptions.update(stripeSubscriptionId, {
          items: [{ id: 'si_placeholder', price: newPlan.stripePriceId }], // TODO: Get subscription item ID
          proration_behavior: 'always_invoice',
        })
      }

      if (data.cancelAtPeriodEnd !== undefined) {
        // Update cancel at period end
        await stripe.subscriptions.update(stripeSubscriptionId, {
          cancel_at_period_end: data.cancelAtPeriodEnd,
        })
      }

      // TODO: Update in database
      logger.info('Subscription updated', { tenantId, subscriptionId: id })

      throw new NotFoundError('Subscription')
    } catch (error) {
      logger.error('Failed to update subscription', { error, tenantId })
      throw error
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(id: string, tenantId: string, userId: string): Promise<void> {
    try {
      // TODO: Get subscription from database
      // const subscription = await db.subscriptions.findOne({ where: { id, tenantId } })
      // if (!subscription) throw new NotFoundError('Subscription')

      // Cancel in Stripe
      const stripeSubscriptionId = 'sub_placeholder' // TODO: Get from database
      await stripe.subscriptions.cancel(stripeSubscriptionId)

      // TODO: Update in database
      logger.info('Subscription canceled', { tenantId, subscriptionId: id })
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, tenantId })
      throw error
    }
  }

  /**
   * List subscriptions for account
   */
  async listSubscriptionsByAccount(accountId: string, tenantId: string): Promise<Subscription[]> {
    // TODO: Fetch from database
    // return await db.subscriptions.findAll({ where: { accountId, tenantId } })
    return []
  }

  // ========================================================================
  // INVOICES
  // ========================================================================

  /**
   * List invoices for account
   */
  async listInvoicesByAccount(accountId: string, tenantId: string): Promise<Invoice[]> {
    // TODO: Fetch from database
    // return await db.invoices.findAll({ where: { accountId, tenantId } })
    return []
  }

  /**
   * Get invoice by ID
   */
  async getInvoiceById(id: string, tenantId: string): Promise<Invoice> {
    // TODO: Fetch from database
    throw new NotFoundError('Invoice')
  }

  /**
   * Generate invoice PDF
   */
  async generateInvoicePdf(id: string, tenantId: string): Promise<string> {
    // TODO: Implement PDF generation using invoice data
    // Use library like pdfkit or puppeteer
    throw new AppError('PDF generation not implemented', 501)
  }

  // ========================================================================
  // STRIPE WEBHOOKS
  // ========================================================================

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    logger.info('Stripe webhook received', { eventType: event.type })

    try {
      switch (event.type) {
        case 'invoice.paid':
          await this.handleInvoicePaid(event.data.object as Stripe.Invoice)
          break

        case 'invoice.payment_failed':
          await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice)
          break

        case 'customer.subscription.updated':
          await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription)
          break

        case 'customer.subscription.deleted':
          await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription)
          break

        default:
          logger.debug('Unhandled webhook event type', { eventType: event.type })
      }
    } catch (error) {
      logger.error('Webhook processing failed', { error, eventType: event.type })
      throw error
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    // TODO: Update invoice status in database
    logger.info('Invoice paid', { invoiceId: invoice.id })
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    // TODO: Update invoice status and send notification
    logger.warn('Invoice payment failed', { invoiceId: invoice.id })
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    // TODO: Update subscription in database
    logger.info('Subscription updated', { subscriptionId: subscription.id })
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    // TODO: Mark subscription as canceled in database
    logger.info('Subscription deleted', { subscriptionId: subscription.id })
  }

  // ========================================================================
  // PAYMENT METHODS
  // ========================================================================

  /**
   * Add payment method for account
   */
  async addPaymentMethod(
    accountId: string,
    tenantId: string,
    paymentMethodId: string
  ): Promise<void> {
    // TODO: Attach payment method to customer in Stripe and save to database
    logger.info('Payment method added', { accountId, tenantId })
  }

  /**
   * List payment methods for account
   */
  async listPaymentMethods(accountId: string, tenantId: string): Promise<any[]> {
    // TODO: Fetch from database
    return []
  }

  /**
   * Remove payment method
   */
  async removePaymentMethod(id: string, tenantId: string): Promise<void> {
    // TODO: Detach from Stripe and delete from database
    logger.info('Payment method removed', { paymentMethodId: id })
  }
}

// Export singleton instance
export const subscriptionBillingService = new SubscriptionBillingService()
