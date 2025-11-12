/**
 * Webhook Routes
 * Handles incoming webhooks from Stripe and other services
 */

import { Router, Request, Response } from 'express';
import Stripe from 'stripe';

import { StripeService } from '../../../../services/billing/stripe.service';
import { InvoiceService } from '../../../../services/billing/invoice.service';
import { SubscriptionService } from '../../../../services/billing/subscription.service';
import { DunningService } from '../../../../services/billing/dunning.service';
import { logger } from '../../../../utils/logging/logger';

const router = Router();
const stripeService = new StripeService();
const invoiceService = new InvoiceService();
const subscriptionService = new SubscriptionService();
const dunningService = new DunningService();

// =============================================================================
// STRIPE WEBHOOKS
// =============================================================================

/**
 * POST /api/v1/webhooks/stripe
 * Handle Stripe webhook events
 * NOTE: This route should bypass normal JSON parsing middleware
 * Use raw body parser for webhook signature verification
 */
router.post('/stripe', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'];

  if (!signature || typeof signature !== 'string') {
    logger.error('[Webhook] Missing Stripe signature header');
    return res.status(400).json({ error: 'Missing signature' });
  }

  try {
    // Verify webhook signature
    const event = stripeService.verifyWebhookSignature(req.body, signature);

    logger.info('[Webhook] Stripe event received', {
      eventId: event.id,
      eventType: event.type,
    });

    // Handle the event asynchronously
    handleStripeEvent(event).catch(error => {
      logger.error('[Webhook] Error handling Stripe event asynchronously', {
        eventId: event.id,
        eventType: event.type,
        error: error.message,
      });
    });

    // Respond immediately to Stripe
    res.json({ received: true });
  } catch (error: any) {
    logger.error('[Webhook] Webhook signature verification failed', {
      error: error.message,
    });
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }
});

/**
 * Handle Stripe events asynchronously
 */
async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  try {
    switch (event.type) {
      // Subscription events
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription);
        break;

      // Invoice events
      case 'invoice.created':
        await handleInvoiceCreated(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.finalized':
        await handleInvoiceFinalized(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.upcoming':
        await handleInvoiceUpcoming(event.data.object as Stripe.Invoice);
        break;

      // Payment method events
      case 'payment_method.attached':
        await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.detached':
        await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
        break;

      case 'payment_method.updated':
        await handlePaymentMethodUpdated(event.data.object as Stripe.PaymentMethod);
        break;

      // Customer events
      case 'customer.updated':
        await handleCustomerUpdated(event.data.object as Stripe.Customer);
        break;

      case 'customer.deleted':
        await handleCustomerDeleted(event.data.object as Stripe.Customer);
        break;

      default:
        logger.info('[Webhook] Unhandled Stripe event type', {
          eventType: event.type,
        });
    }

    logger.info('[Webhook] Stripe event processed successfully', {
      eventId: event.id,
      eventType: event.type,
    });
  } catch (error: any) {
    logger.error('[Webhook] Failed to handle Stripe event', {
      eventId: event.id,
      eventType: event.type,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

// =============================================================================
// SUBSCRIPTION EVENT HANDLERS
// =============================================================================

async function handleSubscriptionCreated(subscription: Stripe.Subscription): Promise<void> {
  logger.info('[Webhook] Subscription created', {
    subscriptionId: subscription.id,
    customerId: subscription.customer,
    status: subscription.status,
  });
  // Subscription is stored when created via API
  // This webhook confirms the creation
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  logger.info('[Webhook] Subscription updated', {
    subscriptionId: subscription.id,
    status: subscription.status,
  });

  // Get tenant ID from customer metadata
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  const customer = await stripeService.getCustomer(customerId);
  if (!customer || !customer.metadata?.tenantId) {
    logger.warn('[Webhook] No tenant ID found in customer metadata', {
      customerId,
    });
    return;
  }

  const tenantId = customer.metadata.tenantId;

  // Update subscription in database
  // This is handled by the SubscriptionService when status changes occur
  logger.info('[Webhook] Subscription status updated', {
    tenantId,
    subscriptionId: subscription.id,
    newStatus: subscription.status,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  logger.warn('[Webhook] Subscription deleted', {
    subscriptionId: subscription.id,
  });

  // Handle subscription cancellation
  // Update database to mark as canceled
}

async function handleTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  logger.info('[Webhook] Trial will end soon', {
    subscriptionId: subscription.id,
    trialEnd: subscription.trial_end,
  });

  // Send notification to customer
  // TODO: Integrate with notification service
}

// =============================================================================
// INVOICE EVENT HANDLERS
// =============================================================================

async function handleInvoiceCreated(invoice: Stripe.Invoice): Promise<void> {
  logger.info('[Webhook] Invoice created', {
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
  });

  // Get tenant ID from customer metadata
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) {
    logger.warn('[Webhook] No customer ID in invoice');
    return;
  }

  const customer = await stripeService.getCustomer(customerId);
  if (!customer || !customer.metadata?.tenantId) {
    logger.warn('[Webhook] No tenant ID found in customer metadata');
    return;
  }

  const tenantId = customer.metadata.tenantId;

  // Store invoice in database
  await invoiceService.updateInvoiceFromStripe(tenantId, invoice);
}

async function handleInvoiceFinalized(invoice: Stripe.Invoice): Promise<void> {
  logger.info('[Webhook] Invoice finalized', {
    invoiceId: invoice.id,
    invoiceNumber: invoice.number,
  });

  // Get tenant ID
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const customer = await stripeService.getCustomer(customerId);
  if (!customer || !customer.metadata?.tenantId) return;

  const tenantId = customer.metadata.tenantId;

  // Update invoice in database
  await invoiceService.updateInvoiceFromStripe(tenantId, invoice);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
  logger.info('[Webhook] Invoice payment succeeded', {
    invoiceId: invoice.id,
    amountPaid: invoice.amount_paid,
  });

  // Get tenant ID
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const customer = await stripeService.getCustomer(customerId);
  if (!customer || !customer.metadata?.tenantId) return;

  const tenantId = customer.metadata.tenantId;

  // Update invoice in database
  await invoiceService.updateInvoiceFromStripe(tenantId, invoice);

  // Send payment confirmation email
  // TODO: Integrate with notification service
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  logger.warn('[Webhook] Invoice payment failed', {
    invoiceId: invoice.id,
    amountDue: invoice.amount_due,
    attemptCount: invoice.attempt_count,
  });

  // Get tenant ID
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const customer = await stripeService.getCustomer(customerId);
  if (!customer || !customer.metadata?.tenantId) return;

  const tenantId = customer.metadata.tenantId;

  // Update invoice in database
  await invoiceService.updateInvoiceFromStripe(tenantId, invoice);

  // Get invoice ID from database
  const result = await invoiceService.listInvoices(tenantId, { limit: 1 });
  if (result.invoices.length === 0) return;

  const localInvoice = result.invoices[0];

  // Trigger dunning process
  await dunningService.handleFailedPayment(
    tenantId,
    localInvoice.id,
    invoice.id,
    invoice.last_finalization_error?.message || 'Payment failed'
  );
}

async function handleInvoiceUpcoming(invoice: Stripe.Invoice): Promise<void> {
  logger.info('[Webhook] Upcoming invoice', {
    invoiceId: invoice.id,
    periodEnd: invoice.period_end,
    amountDue: invoice.amount_due,
  });

  // Send upcoming invoice notification
  // TODO: Integrate with notification service
}

// =============================================================================
// PAYMENT METHOD EVENT HANDLERS
// =============================================================================

async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  logger.info('[Webhook] Payment method attached', {
    paymentMethodId: paymentMethod.id,
    customerId: paymentMethod.customer,
  });
  // Payment method is stored when attached via API
}

async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  logger.info('[Webhook] Payment method detached', {
    paymentMethodId: paymentMethod.id,
  });
  // Payment method is removed when detached via API
}

async function handlePaymentMethodUpdated(paymentMethod: Stripe.PaymentMethod): Promise<void> {
  logger.info('[Webhook] Payment method updated', {
    paymentMethodId: paymentMethod.id,
  });

  // Sync payment method details (e.g., updated expiration date)
  if (typeof paymentMethod.customer === 'string') {
    const customer = await stripeService.getCustomer(paymentMethod.customer);
    if (customer && customer.metadata?.tenantId) {
      // TODO: Sync payment method in database
    }
  }
}

// =============================================================================
// CUSTOMER EVENT HANDLERS
// =============================================================================

async function handleCustomerUpdated(customer: Stripe.Customer): Promise<void> {
  logger.info('[Webhook] Customer updated', {
    customerId: customer.id,
  });
  // Customer updates are handled by StripeService
}

async function handleCustomerDeleted(customer: Stripe.Customer): Promise<void> {
  logger.warn('[Webhook] Customer deleted', {
    customerId: customer.id,
  });
  // Handle customer deletion if needed
}

export default router;
