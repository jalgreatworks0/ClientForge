/**
 * Subscription API Routes
 * Handles subscription management, plans, upgrades, and cancellations
 */

import { Router, Request, Response } from 'express';
import { SubscriptionService } from '../../../../services/billing/subscription.service';
import { InvoiceService } from '../../../../services/billing/invoice.service';
import { UsageMeteringService } from '../../../../services/billing/usage-metering.service';
import { logger } from '../../../../utils/logging/logger';

const router = Router();
const subscriptionService = new SubscriptionService();
const invoiceService = new InvoiceService();
const usageMeteringService = new UsageMeteringService();

// =============================================================================
// SUBSCRIPTION PLANS
// =============================================================================

/**
 * GET /api/v1/subscriptions/plans
 * Get all available subscription plans
 */
router.get('/plans', async (req: Request, res: Response) => {
  try {
    const plans = await subscriptionService.getAvailablePlans();

    res.json({
      plans: plans.map(plan => ({
        id: plan.id,
        name: plan.name,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        features: plan.features,
        limits: plan.limits,
        trialPeriodDays: plan.trialPeriodDays,
      })),
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to get plans', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get subscription plans' });
  }
});

/**
 * GET /api/v1/subscriptions/plans/:planId
 * Get a specific plan
 */
router.get('/plans/:planId', async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;

    const plan = await subscriptionService.getPlan(planId);
    if (!plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    res.json({
      plan: {
        id: plan.id,
        name: plan.name,
        amount: plan.amount,
        currency: plan.currency,
        interval: plan.interval,
        intervalCount: plan.intervalCount,
        features: plan.features,
        limits: plan.limits,
        trialPeriodDays: plan.trialPeriodDays,
      },
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to get plan', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get plan' });
  }
});

// =============================================================================
// CURRENT SUBSCRIPTION
// =============================================================================

/**
 * GET /api/v1/subscriptions/current
 * Get current subscription for tenant
 */
router.get('/current', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await subscriptionService.getCurrentSubscription(tenantId);
    if (!subscription) {
      return res.status(404).json({ error: 'No active subscription found' });
    }

    const plan = await subscriptionService.getPlan(subscription.planId);

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
        plan: plan ? {
          id: plan.id,
          name: plan.name,
          amount: plan.amount,
          currency: plan.currency,
          interval: plan.interval,
          features: plan.features,
          limits: plan.limits,
        } : null,
      },
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to get current subscription', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get subscription' });
  }
});

// =============================================================================
// CREATE SUBSCRIPTION
// =============================================================================

/**
 * POST /api/v1/subscriptions
 * Create a new subscription
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { planId, paymentMethodId, trialDays, prorationBehavior } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'Plan ID is required' });
    }

    const subscription = await subscriptionService.createSubscription({
      tenantId,
      planId,
      paymentMethodId,
      trialDays,
      prorationBehavior,
    });

    logger.info('[SubscriptionAPI] Subscription created', {
      tenantId,
      subscriptionId: subscription.id,
      planId,
    });

    res.status(201).json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
        trialStart: subscription.trialStart,
        trialEnd: subscription.trialEnd,
      },
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to create subscription', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
});

// =============================================================================
// UPDATE SUBSCRIPTION (Upgrade/Downgrade)
// =============================================================================

/**
 * PUT /api/v1/subscriptions/current
 * Update current subscription (change plan)
 */
router.put('/current', async (req: Request, res: Response) => {
  try {
    const { planId, prorationBehavior, billingCycleAnchor } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!planId) {
      return res.status(400).json({ error: 'New plan ID is required' });
    }

    const subscription = await subscriptionService.updateSubscription(tenantId, {
      newPlanId: planId,
      prorationBehavior,
      billingCycleAnchor,
    });

    logger.info('[SubscriptionAPI] Subscription updated', {
      tenantId,
      subscriptionId: subscription.id,
      newPlanId: planId,
    });

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        planId: subscription.planId,
        currentPeriodStart: subscription.currentPeriodStart,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to update subscription', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to update subscription' });
  }
});

// =============================================================================
// CANCEL SUBSCRIPTION
// =============================================================================

/**
 * DELETE /api/v1/subscriptions/current
 * Cancel current subscription
 */
router.delete('/current', async (req: Request, res: Response) => {
  try {
    const { immediate } = req.query;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await subscriptionService.cancelSubscription(
      tenantId,
      immediate === 'true'
    );

    logger.info('[SubscriptionAPI] Subscription canceled', {
      tenantId,
      subscriptionId: subscription.id,
      immediate: immediate === 'true',
    });

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        canceledAt: subscription.canceledAt,
        currentPeriodEnd: subscription.currentPeriodEnd,
      },
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to cancel subscription', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// =============================================================================
// REACTIVATE SUBSCRIPTION
// =============================================================================

/**
 * POST /api/v1/subscriptions/current/reactivate
 * Reactivate a canceled subscription
 */
router.post('/current/reactivate', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await subscriptionService.reactivateSubscription(tenantId);

    logger.info('[SubscriptionAPI] Subscription reactivated', {
      tenantId,
      subscriptionId: subscription.id,
    });

    res.json({
      subscription: {
        id: subscription.id,
        status: subscription.status,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      },
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to reactivate subscription', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to reactivate subscription' });
  }
});

// =============================================================================
// INVOICES
// =============================================================================

/**
 * GET /api/v1/subscriptions/invoices
 * List invoices for tenant
 */
router.get('/invoices', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { limit, offset, status } = req.query;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { invoices, total } = await invoiceService.listInvoices(tenantId, {
      limit: limit ? parseInt(limit as string) : 20,
      offset: offset ? parseInt(offset as string) : 0,
      status: status as string,
    });

    res.json({
      invoices: invoices.map(inv => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        status: inv.status,
        amountDue: inv.amountDue,
        amountPaid: inv.amountPaid,
        amountRemaining: inv.amountRemaining,
        currency: inv.currency,
        dueDate: inv.dueDate,
        paidAt: inv.paidAt,
        pdfUrl: inv.pdfUrl,
        createdAt: inv.createdAt,
      })),
      total,
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to list invoices', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to list invoices' });
  }
});

/**
 * GET /api/v1/subscriptions/invoices/upcoming
 * Get upcoming invoice preview
 */
router.get('/invoices/upcoming', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const upcomingInvoice = await invoiceService.getUpcomingInvoice(tenantId);
    if (!upcomingInvoice) {
      return res.status(404).json({ error: 'No upcoming invoice found' });
    }

    res.json({
      invoice: {
        amountDue: upcomingInvoice.amount_due,
        currency: upcomingInvoice.currency,
        periodStart: new Date(upcomingInvoice.period_start * 1000),
        periodEnd: new Date(upcomingInvoice.period_end * 1000),
        subtotal: upcomingInvoice.subtotal,
        tax: upcomingInvoice.tax || 0,
        total: upcomingInvoice.total,
      },
    });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to get upcoming invoice', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get upcoming invoice' });
  }
});

/**
 * GET /api/v1/subscriptions/invoices/:invoiceId/pdf
 * Generate and download invoice PDF
 */
router.get('/invoices/:invoiceId/pdf', async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const pdfUrl = await invoiceService.generateInvoicePDF(tenantId, invoiceId);

    res.json({ pdfUrl });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to generate invoice PDF', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to generate invoice PDF' });
  }
});

// =============================================================================
// USAGE & LIMITS
// =============================================================================

/**
 * GET /api/v1/subscriptions/usage
 * Get usage summary for current billing period
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const summary = await usageMeteringService.getUsageSummary(tenantId);

    res.json({ usage: summary });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to get usage summary', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get usage summary' });
  }
});

/**
 * GET /api/v1/subscriptions/usage/:metricName/check
 * Check if within usage limit for a metric
 */
router.get('/usage/:metricName/check', async (req: Request, res: Response) => {
  try {
    const { metricName } = req.params;
    const { additionalUsage } = req.query;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const limitCheck = await usageMeteringService.checkUsageLimit(
      tenantId,
      metricName,
      additionalUsage ? parseInt(additionalUsage as string) : 0
    );

    res.json(limitCheck);
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to check usage limit', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to check usage limit' });
  }
});

/**
 * GET /api/v1/subscriptions/usage/:metricName/trends
 * Get usage trends for a metric
 */
router.get('/usage/:metricName/trends', async (req: Request, res: Response) => {
  try {
    const { metricName } = req.params;
    const { days } = req.query;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const trends = await usageMeteringService.getUsageTrends(
      tenantId,
      metricName,
      days ? parseInt(days as string) : 30
    );

    res.json({ trends });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to get usage trends', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get usage trends' });
  }
});

// =============================================================================
// FEATURE ACCESS
// =============================================================================

/**
 * GET /api/v1/subscriptions/features/:featureName
 * Check if tenant has access to a feature
 */
router.get('/features/:featureName', async (req: Request, res: Response) => {
  try {
    const { featureName } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const hasAccess = await subscriptionService.hasFeature(tenantId, featureName);

    res.json({ featureName, hasAccess });
  } catch (error: any) {
    logger.error('[SubscriptionAPI] Failed to check feature access', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to check feature access' });
  }
});

export default router;
