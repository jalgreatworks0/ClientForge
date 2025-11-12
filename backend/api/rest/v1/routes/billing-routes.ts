/**
 * Billing API Routes
 * Handles customer management, payment methods, and general billing operations
 */

import { Router, Request, Response } from 'express';

import { StripeService } from '../../../../services/billing/stripe.service';
import { PaymentMethodsService } from '../../../../services/billing/payment-methods.service';
import { logger } from '../../../../utils/logging/logger';

const router = Router();
const stripeService = new StripeService();
const paymentMethodsService = new PaymentMethodsService();

// =============================================================================
// CUSTOMER MANAGEMENT
// =============================================================================

/**
 * POST /api/v1/billing/customers
 * Create a Stripe customer for the tenant
 */
router.post('/customers', async (req: Request, res: Response) => {
  try {
    const { email, name, metadata } = req.body;
    const tenantId = req.user?.tenantId; // Assumes auth middleware sets req.user

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const customer = await stripeService.createCustomer({
      tenantId,
      email,
      name,
      metadata,
    });

    logger.info('[BillingAPI] Customer created', {
      tenantId,
      customerId: customer.id,
    });

    res.status(201).json({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        currency: customer.currency,
      },
    });
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to create customer', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to create customer' });
  }
});

/**
 * GET /api/v1/billing/customers/current
 * Get current customer information
 */
router.get('/customers/current', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = await stripeService.getCustomerIdForTenant(tenantId);
    if (!customerId) {
      return res.status(404).json({ error: 'No customer found' });
    }

    const customer = await stripeService.getCustomer(customerId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({
      customer: {
        id: customer.id,
        email: customer.email,
        name: customer.name,
        currency: customer.currency,
      },
    });
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to get customer', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get customer' });
  }
});

// =============================================================================
// PAYMENT METHODS
// =============================================================================

/**
 * GET /api/v1/billing/payment-methods
 * List all payment methods for the tenant
 */
router.get('/payment-methods', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const paymentMethods = await paymentMethodsService.listPaymentMethods(tenantId);

    res.json({
      paymentMethods: paymentMethods.map(pm => ({
        id: pm.stripePaymentMethodId,
        type: pm.type,
        isDefault: pm.isDefault,
        card: pm.type === 'card' ? {
          brand: pm.cardBrand,
          last4: pm.cardLast4,
          expMonth: pm.cardExpMonth,
          expYear: pm.cardExpYear,
        } : undefined,
        createdAt: pm.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to list payment methods', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to list payment methods' });
  }
});

/**
 * POST /api/v1/billing/payment-methods
 * Add a new payment method
 */
router.post('/payment-methods', async (req: Request, res: Response) => {
  try {
    const { paymentMethodId, setAsDefault } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!paymentMethodId) {
      return res.status(400).json({ error: 'Payment method ID is required' });
    }

    const paymentMethod = await paymentMethodsService.addPaymentMethod({
      tenantId,
      paymentMethodId,
      setAsDefault: setAsDefault || false,
    });

    logger.info('[BillingAPI] Payment method added', {
      tenantId,
      paymentMethodId,
    });

    res.status(201).json({
      paymentMethod: {
        id: paymentMethod.stripePaymentMethodId,
        type: paymentMethod.type,
        isDefault: paymentMethod.isDefault,
        card: paymentMethod.type === 'card' ? {
          brand: paymentMethod.cardBrand,
          last4: paymentMethod.cardLast4,
          expMonth: paymentMethod.cardExpMonth,
          expYear: paymentMethod.cardExpYear,
        } : undefined,
      },
    });
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to add payment method', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to add payment method' });
  }
});

/**
 * DELETE /api/v1/billing/payment-methods/:paymentMethodId
 * Remove a payment method
 */
router.delete('/payment-methods/:paymentMethodId', async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await paymentMethodsService.removePaymentMethod(tenantId, paymentMethodId);

    logger.info('[BillingAPI] Payment method removed', {
      tenantId,
      paymentMethodId,
    });

    res.status(204).send();
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to remove payment method', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to remove payment method' });
  }
});

/**
 * PUT /api/v1/billing/payment-methods/:paymentMethodId/default
 * Set a payment method as default
 */
router.put('/payment-methods/:paymentMethodId/default', async (req: Request, res: Response) => {
  try {
    const { paymentMethodId } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await paymentMethodsService.setAsDefault(tenantId, paymentMethodId);

    logger.info('[BillingAPI] Payment method set as default', {
      tenantId,
      paymentMethodId,
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to set default payment method', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

// =============================================================================
// SETUP INTENTS (for adding payment methods with 3D Secure)
// =============================================================================

/**
 * POST /api/v1/billing/setup-intent
 * Create a SetupIntent for adding payment methods
 */
router.post('/setup-intent', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const customerId = await stripeService.getCustomerIdForTenant(tenantId);
    if (!customerId) {
      return res.status(404).json({ error: 'No customer found. Please create a customer first.' });
    }

    const setupIntent = await stripeService.createSetupIntent(customerId);

    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to create setup intent', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

// =============================================================================
// EXPIRING CARDS
// =============================================================================

/**
 * GET /api/v1/billing/payment-methods/expiring
 * Get payment methods expiring soon
 */
router.get('/payment-methods/expiring', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const expiringMethods = await paymentMethodsService.getExpiringPaymentMethods(tenantId);

    res.json({
      expiringMethods: expiringMethods.map(pm => ({
        id: pm.stripePaymentMethodId,
        type: pm.type,
        isDefault: pm.isDefault,
        card: {
          brand: pm.cardBrand,
          last4: pm.cardLast4,
          expMonth: pm.cardExpMonth,
          expYear: pm.cardExpYear,
        },
      })),
    });
  } catch (error: any) {
    logger.error('[BillingAPI] Failed to get expiring payment methods', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get expiring payment methods' });
  }
});

export default router;
