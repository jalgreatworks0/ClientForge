/**
 * Subscription Service
 * Manages subscription lifecycle including creation, upgrades, downgrades, and cancellations
 * Handles proration, billing cycles, and subscription status management
 */

import Stripe from 'stripe';
import { Pool } from 'pg';
import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';
import { StripeService } from './stripe.service';

export interface SubscriptionPlan {
  id: string;
  name: string;
  stripePriceId: string;
  stripePlanId: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
  features: Record<string, any>;
  limits: Record<string, number>;
  isActive: boolean;
  trialPeriodDays?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubscriptionInfo {
  id: string;
  tenantId: string;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  planId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionParams {
  tenantId: string;
  planId: string;
  paymentMethodId?: string;
  trialDays?: number;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
}

export interface UpdateSubscriptionParams {
  newPlanId: string;
  prorationBehavior?: 'create_prorations' | 'none' | 'always_invoice';
  billingCycleAnchor?: 'now' | 'unchanged';
}

export class SubscriptionService {
  private pool: Pool;
  private stripeService: StripeService;

  constructor() {
    this.pool = getPool();
    this.stripeService = new StripeService();
  }

  /**
   * Get all available subscription plans
   */
  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    try {
      const result = await this.pool.query(
        `SELECT
          id, name, stripe_price_id, stripe_plan_id, amount, currency,
          interval, interval_count, features, limits, is_active,
          trial_period_days, created_at, updated_at
         FROM subscription_plans
         WHERE is_active = true
         ORDER BY amount ASC`
      );

      logger.info('[Subscription] Retrieved available plans', {
        count: result.rows.length,
      });

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        stripePriceId: row.stripe_price_id,
        stripePlanId: row.stripe_plan_id,
        amount: row.amount,
        currency: row.currency,
        interval: row.interval,
        intervalCount: row.interval_count,
        features: row.features,
        limits: row.limits,
        isActive: row.is_active,
        trialPeriodDays: row.trial_period_days,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error: any) {
      logger.error('[Subscription] Failed to get available plans', {
        error: error.message,
      });
      throw new Error('Failed to get available plans');
    }
  }

  /**
   * Get a specific plan by ID
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    try {
      if (!planId) {
        throw new Error('planId is required');
      }

      const result = await this.pool.query(
        `SELECT
          id, name, stripe_price_id, stripe_plan_id, amount, currency,
          interval, interval_count, features, limits, is_active,
          trial_period_days, created_at, updated_at
         FROM subscription_plans
         WHERE id = $1`,
        [planId]
      );

      if (result.rows.length === 0) {
        logger.warn('[Subscription] Plan not found', { planId });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        stripePriceId: row.stripe_price_id,
        stripePlanId: row.stripe_plan_id,
        amount: row.amount,
        currency: row.currency,
        interval: row.interval,
        intervalCount: row.interval_count,
        features: row.features,
        limits: row.limits,
        isActive: row.is_active,
        trialPeriodDays: row.trial_period_days,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error: any) {
      logger.error('[Subscription] Failed to get plan', {
        planId,
        error: error.message,
      });
      throw new Error('Failed to get plan');
    }
  }

  /**
   * Get current subscription for a tenant
   */
  async getCurrentSubscription(tenantId: string): Promise<SubscriptionInfo | null> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      const result = await this.pool.query(
        `SELECT
          id, tenant_id, stripe_subscription_id, stripe_customer_id,
          plan_id, status, current_period_start, current_period_end,
          cancel_at_period_end, canceled_at, trial_start, trial_end,
          created_at, updated_at
         FROM subscriptions
         WHERE tenant_id = $1 AND status IN ('active', 'trialing', 'past_due')
         ORDER BY created_at DESC
         LIMIT 1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        logger.info('[Subscription] No active subscription found', { tenantId });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        stripeSubscriptionId: row.stripe_subscription_id,
        stripeCustomerId: row.stripe_customer_id,
        planId: row.plan_id,
        status: row.status,
        currentPeriodStart: row.current_period_start,
        currentPeriodEnd: row.current_period_end,
        cancelAtPeriodEnd: row.cancel_at_period_end,
        canceledAt: row.canceled_at,
        trialStart: row.trial_start,
        trialEnd: row.trial_end,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error: any) {
      logger.error('[Subscription] Failed to get current subscription', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to get current subscription');
    }
  }

  /**
   * Create a new subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<SubscriptionInfo> {
    const {
      tenantId,
      planId,
      paymentMethodId,
      trialDays,
      prorationBehavior = 'create_prorations',
    } = params;

    try {
      if (!tenantId || !planId) {
        throw new Error('tenantId and planId are required');
      }

      // Check if tenant already has an active subscription
      const existing = await this.getCurrentSubscription(tenantId);
      if (existing) {
        throw new Error(
          'Tenant already has an active subscription. Use updateSubscription to change plans.'
        );
      }

      // Get plan details
      const plan = await this.getPlan(planId);
      if (!plan) {
        throw new Error('Plan not found');
      }

      if (!plan.isActive) {
        throw new Error('Plan is not active');
      }

      // Get or create Stripe customer
      let customerId = await this.stripeService.getCustomerIdForTenant(tenantId);
      if (!customerId) {
        // Need to create customer first
        throw new Error(
          'No Stripe customer found for this tenant. Please create a customer first.'
        );
      }

      // Prepare subscription params
      const stripe = this.stripeService.getStripeInstance();
      const subscriptionParams: Stripe.SubscriptionCreateParams = {
        customer: customerId,
        items: [{ price: plan.stripePriceId }],
        proration_behavior: prorationBehavior,
        metadata: {
          tenantId,
          planId,
        },
      };

      // Add payment method if provided
      if (paymentMethodId) {
        subscriptionParams.default_payment_method = paymentMethodId;
      }

      // Add trial if specified or if plan has default trial
      const trialPeriodDays = trialDays ?? plan.trialPeriodDays;
      if (trialPeriodDays && trialPeriodDays > 0) {
        subscriptionParams.trial_period_days = trialPeriodDays;
      }

      // Create subscription in Stripe
      const subscription = await stripe.subscriptions.create(subscriptionParams);

      // Store in database
      await this.pool.query(
        `INSERT INTO subscriptions (
          tenant_id, stripe_subscription_id, stripe_customer_id, plan_id,
          status, current_period_start, current_period_end,
          cancel_at_period_end, trial_start, trial_end
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tenantId,
          subscription.id,
          customerId,
          planId,
          subscription.status,
          new Date(subscription.current_period_start * 1000),
          new Date(subscription.current_period_end * 1000),
          subscription.cancel_at_period_end,
          subscription.trial_start ? new Date(subscription.trial_start * 1000) : null,
          subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        ]
      );

      logger.info('[Subscription] Subscription created successfully', {
        tenantId,
        subscriptionId: subscription.id,
        planId,
        status: subscription.status,
      });

      const created = await this.getCurrentSubscription(tenantId);
      if (!created) {
        throw new Error('Subscription created but not found in database');
      }

      return created;
    } catch (error: any) {
      logger.error('[Subscription] Failed to create subscription', {
        tenantId,
        planId,
        error: error.message,
      });

      if (error.message.includes('already has an active subscription')) {
        throw error;
      }

      throw new Error('Failed to create subscription');
    }
  }

  /**
   * Update subscription (upgrade/downgrade)
   */
  async updateSubscription(
    tenantId: string,
    params: UpdateSubscriptionParams
  ): Promise<SubscriptionInfo> {
    const {
      newPlanId,
      prorationBehavior = 'create_prorations',
      billingCycleAnchor = 'unchanged',
    } = params;

    try {
      if (!tenantId || !newPlanId) {
        throw new Error('tenantId and newPlanId are required');
      }

      // Get current subscription
      const current = await this.getCurrentSubscription(tenantId);
      if (!current) {
        throw new Error('No active subscription found for this tenant');
      }

      // Check if already on this plan
      if (current.planId === newPlanId) {
        logger.info('[Subscription] Already on requested plan', {
          tenantId,
          planId: newPlanId,
        });
        return current;
      }

      // Get new plan details
      const newPlan = await this.getPlan(newPlanId);
      if (!newPlan) {
        throw new Error('New plan not found');
      }

      if (!newPlan.isActive) {
        throw new Error('New plan is not active');
      }

      // Get current plan for comparison
      const currentPlan = await this.getPlan(current.planId);

      // Update subscription in Stripe
      const stripe = this.stripeService.getStripeInstance();
      const subscription = await stripe.subscriptions.retrieve(
        current.stripeSubscriptionId
      );

      const updateParams: Stripe.SubscriptionUpdateParams = {
        items: [
          {
            id: subscription.items.data[0].id,
            price: newPlan.stripePriceId,
          },
        ],
        proration_behavior: prorationBehavior,
        metadata: {
          tenantId,
          planId: newPlanId,
          previousPlanId: current.planId,
        },
      };

      if (billingCycleAnchor === 'now') {
        updateParams.billing_cycle_anchor = 'now';
      }

      const updated = await stripe.subscriptions.update(
        current.stripeSubscriptionId,
        updateParams
      );

      // Update in database
      await this.pool.query(
        `UPDATE subscriptions
         SET plan_id = $1,
             status = $2,
             current_period_start = $3,
             current_period_end = $4,
             updated_at = NOW()
         WHERE id = $5`,
        [
          newPlanId,
          updated.status,
          new Date(updated.current_period_start * 1000),
          new Date(updated.current_period_end * 1000),
          current.id,
        ]
      );

      logger.info('[Subscription] Subscription updated successfully', {
        tenantId,
        subscriptionId: current.stripeSubscriptionId,
        oldPlanId: current.planId,
        newPlanId,
        oldAmount: currentPlan?.amount,
        newAmount: newPlan.amount,
      });

      const result = await this.getCurrentSubscription(tenantId);
      if (!result) {
        throw new Error('Subscription updated but not found in database');
      }

      return result;
    } catch (error: any) {
      logger.error('[Subscription] Failed to update subscription', {
        tenantId,
        newPlanId,
        error: error.message,
      });
      throw new Error('Failed to update subscription');
    }
  }

  /**
   * Cancel subscription (at period end or immediately)
   */
  async cancelSubscription(
    tenantId: string,
    immediate: boolean = false
  ): Promise<SubscriptionInfo> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      // Get current subscription
      const current = await this.getCurrentSubscription(tenantId);
      if (!current) {
        throw new Error('No active subscription found for this tenant');
      }

      const stripe = this.stripeService.getStripeInstance();

      let updated: Stripe.Subscription;

      if (immediate) {
        // Cancel immediately
        updated = await stripe.subscriptions.cancel(current.stripeSubscriptionId);
      } else {
        // Cancel at period end
        updated = await stripe.subscriptions.update(current.stripeSubscriptionId, {
          cancel_at_period_end: true,
        });
      }

      // Update in database
      await this.pool.query(
        `UPDATE subscriptions
         SET status = $1,
             cancel_at_period_end = $2,
             canceled_at = $3,
             updated_at = NOW()
         WHERE id = $4`,
        [
          updated.status,
          updated.cancel_at_period_end,
          updated.canceled_at ? new Date(updated.canceled_at * 1000) : null,
          current.id,
        ]
      );

      logger.info('[Subscription] Subscription canceled', {
        tenantId,
        subscriptionId: current.stripeSubscriptionId,
        immediate,
        status: updated.status,
      });

      const result = await this.getCurrentSubscription(tenantId);
      if (!result) {
        // If immediate cancellation, subscription might be inactive now
        const canceledResult = await this.pool.query(
          `SELECT
            id, tenant_id, stripe_subscription_id, stripe_customer_id,
            plan_id, status, current_period_start, current_period_end,
            cancel_at_period_end, canceled_at, trial_start, trial_end,
            created_at, updated_at
           FROM subscriptions
           WHERE tenant_id = $1
           ORDER BY updated_at DESC
           LIMIT 1`,
          [tenantId]
        );

        if (canceledResult.rows.length > 0) {
          const row = canceledResult.rows[0];
          return {
            id: row.id,
            tenantId: row.tenant_id,
            stripeSubscriptionId: row.stripe_subscription_id,
            stripeCustomerId: row.stripe_customer_id,
            planId: row.plan_id,
            status: row.status,
            currentPeriodStart: row.current_period_start,
            currentPeriodEnd: row.current_period_end,
            cancelAtPeriodEnd: row.cancel_at_period_end,
            canceledAt: row.canceled_at,
            trialStart: row.trial_start,
            trialEnd: row.trial_end,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
          };
        }

        throw new Error('Subscription canceled but not found in database');
      }

      return result;
    } catch (error: any) {
      logger.error('[Subscription] Failed to cancel subscription', {
        tenantId,
        immediate,
        error: error.message,
      });
      throw new Error('Failed to cancel subscription');
    }
  }

  /**
   * Reactivate a canceled subscription (only if not yet ended)
   */
  async reactivateSubscription(tenantId: string): Promise<SubscriptionInfo> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      const current = await this.getCurrentSubscription(tenantId);
      if (!current) {
        throw new Error('No subscription found for this tenant');
      }

      if (!current.cancelAtPeriodEnd) {
        logger.info('[Subscription] Subscription is not scheduled for cancellation', {
          tenantId,
        });
        return current;
      }

      // Reactivate in Stripe
      const stripe = this.stripeService.getStripeInstance();
      const updated = await stripe.subscriptions.update(current.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update in database
      await this.pool.query(
        `UPDATE subscriptions
         SET cancel_at_period_end = false,
             canceled_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [current.id]
      );

      logger.info('[Subscription] Subscription reactivated', {
        tenantId,
        subscriptionId: current.stripeSubscriptionId,
      });

      const result = await this.getCurrentSubscription(tenantId);
      if (!result) {
        throw new Error('Subscription reactivated but not found in database');
      }

      return result;
    } catch (error: any) {
      logger.error('[Subscription] Failed to reactivate subscription', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to reactivate subscription');
    }
  }

  /**
   * Check if tenant has access to a feature
   */
  async hasFeature(tenantId: string, featureName: string): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription(tenantId);
      if (!subscription) {
        return false;
      }

      const plan = await this.getPlan(subscription.planId);
      if (!plan) {
        return false;
      }

      return plan.features[featureName] === true;
    } catch (error: any) {
      logger.error('[Subscription] Failed to check feature access', {
        tenantId,
        featureName,
        error: error.message,
      });
      return false;
    }
  }

  /**
   * Check if tenant is within usage limits
   */
  async isWithinLimit(tenantId: string, limitName: string, currentUsage: number): Promise<boolean> {
    try {
      const subscription = await this.getCurrentSubscription(tenantId);
      if (!subscription) {
        return false;
      }

      const plan = await this.getPlan(subscription.planId);
      if (!plan) {
        return false;
      }

      const limit = plan.limits[limitName];
      if (limit === undefined || limit === null) {
        return true; // No limit set
      }

      if (limit === -1) {
        return true; // Unlimited
      }

      return currentUsage < limit;
    } catch (error: any) {
      logger.error('[Subscription] Failed to check usage limit', {
        tenantId,
        limitName,
        currentUsage,
        error: error.message,
      });
      return false;
    }
  }
}
