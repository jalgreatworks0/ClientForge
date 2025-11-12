/**
 * Payment Methods Service
 * Manages payment methods for customers including cards, bank accounts, and alternative payment methods
 * Provides listing, validation, and management of payment instruments
 */

import Stripe from 'stripe';
import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

import { StripeService } from './stripe.service';

export interface PaymentMethodInfo {
  id: string;
  tenantId: string;
  stripePaymentMethodId: string;
  stripeCustomerId: string;
  type: string;
  isDefault: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AddPaymentMethodParams {
  tenantId: string;
  paymentMethodId: string;
  setAsDefault?: boolean;
}

export class PaymentMethodsService {
  private pool: Pool;
  private stripeService: StripeService;

  constructor() {
    this.pool = getPool();
    this.stripeService = new StripeService();
  }

  /**
   * List all payment methods for a tenant
   */
  async listPaymentMethods(tenantId: string): Promise<PaymentMethodInfo[]> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      const result = await this.pool.query(
        `SELECT
          id, tenantId, stripe_payment_method_id, stripe_customer_id,
          type, is_default, card_brand, card_last4, card_exp_month, card_exp_year,
          created_at, updated_at
         FROM payment_methods
         WHERE tenantId = $1
         ORDER BY is_default DESC, created_at DESC`,
        [tenantId]
      );

      logger.info('[PaymentMethods] Listed payment methods', {
        tenantId,
        count: result.rows.length,
      });

      return result.rows.map(row => ({
        id: row.id,
        tenantId: row.tenantId,
        stripePaymentMethodId: row.stripe_payment_method_id,
        stripeCustomerId: row.stripe_customer_id,
        type: row.type,
        isDefault: row.is_default,
        cardBrand: row.card_brand,
        cardLast4: row.card_last4,
        cardExpMonth: row.card_exp_month,
        cardExpYear: row.card_exp_year,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error: any) {
      logger.error('[PaymentMethods] Failed to list payment methods', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to list payment methods');
    }
  }

  /**
   * Get a specific payment method
   */
  async getPaymentMethod(
    tenantId: string,
    paymentMethodId: string
  ): Promise<PaymentMethodInfo | null> {
    try {
      if (!tenantId || !paymentMethodId) {
        throw new Error('tenantId and paymentMethodId are required');
      }

      const result = await this.pool.query(
        `SELECT
          id, tenantId, stripe_payment_method_id, stripe_customer_id,
          type, is_default, card_brand, card_last4, card_exp_month, card_exp_year,
          created_at, updated_at
         FROM payment_methods
         WHERE tenantId = $1 AND stripe_payment_method_id = $2`,
        [tenantId, paymentMethodId]
      );

      if (result.rows.length === 0) {
        logger.warn('[PaymentMethods] Payment method not found', {
          tenantId,
          paymentMethodId,
        });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenantId,
        stripePaymentMethodId: row.stripe_payment_method_id,
        stripeCustomerId: row.stripe_customer_id,
        type: row.type,
        isDefault: row.is_default,
        cardBrand: row.card_brand,
        cardLast4: row.card_last4,
        cardExpMonth: row.card_exp_month,
        cardExpYear: row.card_exp_year,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error: any) {
      logger.error('[PaymentMethods] Failed to get payment method', {
        tenantId,
        paymentMethodId,
        error: error.message,
      });
      throw new Error('Failed to get payment method');
    }
  }

  /**
   * Get the default payment method for a tenant
   */
  async getDefaultPaymentMethod(tenantId: string): Promise<PaymentMethodInfo | null> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      const result = await this.pool.query(
        `SELECT
          id, tenantId, stripe_payment_method_id, stripe_customer_id,
          type, is_default, card_brand, card_last4, card_exp_month, card_exp_year,
          created_at, updated_at
         FROM payment_methods
         WHERE tenantId = $1 AND is_default = true
         LIMIT 1`,
        [tenantId]
      );

      if (result.rows.length === 0) {
        logger.info('[PaymentMethods] No default payment method found', { tenantId });
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenantId,
        stripePaymentMethodId: row.stripe_payment_method_id,
        stripeCustomerId: row.stripe_customer_id,
        type: row.type,
        isDefault: row.is_default,
        cardBrand: row.card_brand,
        cardLast4: row.card_last4,
        cardExpMonth: row.card_exp_month,
        cardExpYear: row.card_exp_year,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    } catch (error: any) {
      logger.error('[PaymentMethods] Failed to get default payment method', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to get default payment method');
    }
  }

  /**
   * Add a new payment method
   */
  async addPaymentMethod(params: AddPaymentMethodParams): Promise<PaymentMethodInfo> {
    const { tenantId, paymentMethodId, setAsDefault = false } = params;

    try {
      if (!tenantId || !paymentMethodId) {
        throw new Error('tenantId and paymentMethodId are required');
      }

      // Get customer ID for this tenant
      const customerId = await this.stripeService.getCustomerIdForTenant(tenantId);
      if (!customerId) {
        throw new Error('No Stripe customer found for this tenant');
      }

      // Attach payment method to customer
      const { paymentMethod } = await this.stripeService.attachPaymentMethod(
        customerId,
        paymentMethodId
      );

      // Set as default if requested
      if (setAsDefault) {
        await this.stripeService.setDefaultPaymentMethod(customerId, paymentMethodId);
      }

      // Retrieve the stored payment method
      const storedMethod = await this.getPaymentMethod(tenantId, paymentMethodId);
      if (!storedMethod) {
        throw new Error('Payment method was attached but not found in database');
      }

      logger.info('[PaymentMethods] Payment method added successfully', {
        tenantId,
        paymentMethodId,
        type: paymentMethod.type,
        isDefault: setAsDefault,
      });

      return storedMethod;
    } catch (error: any) {
      logger.error('[PaymentMethods] Failed to add payment method', {
        tenantId,
        paymentMethodId,
        error: error.message,
      });
      throw new Error('Failed to add payment method');
    }
  }

  /**
   * Remove a payment method
   */
  async removePaymentMethod(tenantId: string, paymentMethodId: string): Promise<void> {
    try {
      if (!tenantId || !paymentMethodId) {
        throw new Error('tenantId and paymentMethodId are required');
      }

      // Verify ownership
      const paymentMethod = await this.getPaymentMethod(tenantId, paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Payment method not found or does not belong to this tenant');
      }

      // Check if this is the default payment method
      if (paymentMethod.isDefault) {
        // Check if there are active subscriptions
        const activeSubsResult = await this.pool.query(
          `SELECT COUNT(*) as count FROM subscriptions
           WHERE tenantId = $1 AND status IN ('active', 'trialing', 'past_due')`,
          [tenantId]
        );

        if (parseInt(activeSubsResult.rows[0].count) > 0) {
          throw new Error(
            'Cannot remove default payment method while active subscriptions exist. Please set another payment method as default first.'
          );
        }
      }

      // Detach from Stripe
      await this.stripeService.detachPaymentMethod(paymentMethodId);

      logger.info('[PaymentMethods] Payment method removed successfully', {
        tenantId,
        paymentMethodId,
      });
    } catch (error: any) {
      logger.error('[PaymentMethods] Failed to remove payment method', {
        tenantId,
        paymentMethodId,
        error: error.message,
      });

      if (error.message.includes('Cannot remove default payment method')) {
        throw error;
      }

      throw new Error('Failed to remove payment method');
    }
  }

  /**
   * Set a payment method as default
   */
  async setAsDefault(tenantId: string, paymentMethodId: string): Promise<void> {
    try {
      if (!tenantId || !paymentMethodId) {
        throw new Error('tenantId and paymentMethodId are required');
      }

      // Verify ownership
      const paymentMethod = await this.getPaymentMethod(tenantId, paymentMethodId);
      if (!paymentMethod) {
        throw new Error('Payment method not found or does not belong to this tenant');
      }

      // Already default?
      if (paymentMethod.isDefault) {
        logger.info('[PaymentMethods] Payment method already set as default', {
          tenantId,
          paymentMethodId,
        });
        return;
      }

      // Update in Stripe and database
      await this.stripeService.setDefaultPaymentMethod(
        paymentMethod.stripeCustomerId,
        paymentMethodId
      );

      logger.info('[PaymentMethods] Payment method set as default', {
        tenantId,
        paymentMethodId,
      });
    } catch (error: any) {
      logger.error('[PaymentMethods] Failed to set payment method as default', {
        tenantId,
        paymentMethodId,
        error: error.message,
      });
      throw new Error('Failed to set payment method as default');
    }
  }

  /**
   * Validate if a payment method is expired
   */
  isPaymentMethodExpired(paymentMethod: PaymentMethodInfo): boolean {
    if (!paymentMethod.cardExpMonth || !paymentMethod.cardExpYear) {
      return false; // Not a card or no expiry info
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // JavaScript months are 0-indexed

    if (paymentMethod.cardExpYear < currentYear) {
      return true;
    }

    if (
      paymentMethod.cardExpYear === currentYear &&
      paymentMethod.cardExpMonth < currentMonth
    ) {
      return true;
    }

    return false;
  }

  /**
   * Get expiring payment methods (expiring within next 30 days)
   */
  async getExpiringPaymentMethods(tenantId: string): Promise<PaymentMethodInfo[]> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      const allMethods = await this.listPaymentMethods(tenantId);

      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      const expiringMethods = allMethods.filter(method => {
        if (!method.cardExpMonth || !method.cardExpYear) {
          return false;
        }

        const expiryDate = new Date(method.cardExpYear, method.cardExpMonth - 1);
        return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
      });

      logger.info('[PaymentMethods] Found expiring payment methods', {
        tenantId,
        count: expiringMethods.length,
      });

      return expiringMethods;
    } catch (error: any) {
      logger.error('[PaymentMethods] Failed to get expiring payment methods', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to get expiring payment methods');
    }
  }

  /**
   * Sync payment methods from Stripe (useful for webhook updates)
   */
  async syncPaymentMethodsFromStripe(tenantId: string): Promise<void> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      // Get customer ID
      const customerId = await this.stripeService.getCustomerIdForTenant(tenantId);
      if (!customerId) {
        throw new Error('No Stripe customer found for this tenant');
      }

      // Get customer from Stripe
      const customer = await this.stripeService.getCustomer(customerId);
      if (!customer) {
        throw new Error('Stripe customer not found');
      }

      // List payment methods from Stripe
      const stripe = this.stripeService.getStripeInstance();
      const paymentMethods = await stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 100,
      });

      // Sync each payment method
      for (const pm of paymentMethods.data) {
        await this.pool.query(
          `INSERT INTO payment_methods (
            tenantId, stripe_payment_method_id, stripe_customer_id,
            type, card_brand, card_last4, card_exp_month, card_exp_year
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (stripe_payment_method_id) DO UPDATE SET
          card_exp_month = EXCLUDED.card_exp_month,
          card_exp_year = EXCLUDED.card_exp_year,
          updated_at = NOW()`,
          [
            tenantId,
            pm.id,
            customerId,
            pm.type,
            pm.card?.brand || null,
            pm.card?.last4 || null,
            pm.card?.exp_month || null,
            pm.card?.exp_year || null,
          ]
        );
      }

      // Update default payment method
      const defaultPmId = customer.invoice_settings?.default_payment_method;
      if (defaultPmId && typeof defaultPmId === 'string') {
        await this.pool.query('BEGIN');

        await this.pool.query(
          'UPDATE payment_methods SET is_default = false WHERE tenantId = $1',
          [tenantId]
        );

        await this.pool.query(
          'UPDATE payment_methods SET is_default = true WHERE stripe_payment_method_id = $1',
          [defaultPmId]
        );

        await this.pool.query('COMMIT');
      }

      logger.info('[PaymentMethods] Synced payment methods from Stripe', {
        tenantId,
        count: paymentMethods.data.length,
      });
    } catch (error: any) {
      await this.pool.query('ROLLBACK');

      logger.error('[PaymentMethods] Failed to sync payment methods from Stripe', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to sync payment methods from Stripe');
    }
  }
}
