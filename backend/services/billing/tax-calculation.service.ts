/**
 * Tax Calculation Service
 * Integrates with TaxJar for automated sales tax calculation
 * Handles tax rate lookup, nexus validation, and tax reporting
 */

import { Pool } from 'pg';
import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';
import Taxjar from 'taxjar';

export interface TaxCalculationParams {
  fromCountry: string;
  fromZip: string;
  fromState: string;
  fromCity?: string;
  fromStreet?: string;
  toCountry: string;
  toZip: string;
  toState: string;
  toCity?: string;
  toStreet?: string;
  amount: number;
  shipping?: number;
  lineItems?: Array<{
    id?: string;
    quantity: number;
    productTaxCode?: string;
    unitPrice: number;
    discount?: number;
  }>;
}

export interface TaxResult {
  orderTotalAmount: number;
  shipping: number;
  taxableAmount: number;
  amountToCollect: number;
  rate: number;
  hasNexus: boolean;
  freightTaxable: boolean;
  taxSource: string;
  exemptionType?: string;
  jurisdictions?: {
    country?: string;
    state?: string;
    county?: string;
    city?: string;
  };
  breakdown?: any;
}

export interface TaxRate {
  country: string;
  state: string;
  zip?: string;
  city?: string;
  rate: number;
  freightTaxable: boolean;
  hasNexus: boolean;
}

export class TaxCalculationService {
  private pool: Pool;
  private taxjar: Taxjar | null = null;

  constructor() {
    this.pool = getPool();

    if (process.env.TAXJAR_API_KEY) {
      this.taxjar = new Taxjar({
        apiKey: process.env.TAXJAR_API_KEY,
        apiUrl: process.env.TAXJAR_API_URL || Taxjar.DEFAULT_API_URL,
      });
      logger.info('[TaxCalculation] TaxJar client initialized');
    } else {
      logger.warn('[TaxCalculation] TAXJAR_API_KEY not set - tax calculation disabled');
    }
  }

  /**
   * Calculate tax for a transaction
   */
  async calculateTax(params: TaxCalculationParams): Promise<TaxResult> {
    try {
      if (!this.taxjar) {
        logger.warn('[TaxCalculation] TaxJar not configured, returning zero tax');
        return this.getZeroTaxResult(params.amount, params.shipping || 0);
      }

      // Validate required fields
      if (!params.fromCountry || !params.fromZip || !params.fromState) {
        throw new Error('From address (country, zip, state) is required');
      }

      if (!params.toCountry || !params.toZip || !params.toState) {
        throw new Error('To address (country, zip, state) is required');
      }

      if (params.amount === undefined || params.amount === null || params.amount < 0) {
        throw new Error('Valid amount is required');
      }

      // Build TaxJar request
      const taxjarParams: any = {
        from_country: params.fromCountry,
        from_zip: params.fromZip,
        from_state: params.fromState,
        from_city: params.fromCity,
        from_street: params.fromStreet,
        to_country: params.toCountry,
        to_zip: params.toZip,
        to_state: params.toState,
        to_city: params.toCity,
        to_street: params.toStreet,
        amount: params.amount,
        shipping: params.shipping || 0,
      };

      // Add line items if provided
      if (params.lineItems && params.lineItems.length > 0) {
        taxjarParams.line_items = params.lineItems.map((item, index) => ({
          id: item.id || `line_${index}`,
          quantity: item.quantity,
          product_tax_code: item.productTaxCode,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
        }));
      }

      // Call TaxJar API
      const response = await this.taxjar.taxForOrder(taxjarParams);

      const result: TaxResult = {
        orderTotalAmount: response.tax.order_total_amount,
        shipping: response.tax.shipping,
        taxableAmount: response.tax.taxable_amount,
        amountToCollect: response.tax.amount_to_collect,
        rate: response.tax.rate,
        hasNexus: response.tax.has_nexus,
        freightTaxable: response.tax.freight_taxable,
        taxSource: response.tax.tax_source,
        exemptionType: response.tax.exemption_type,
        jurisdictions: response.tax.jurisdictions,
        breakdown: response.tax.breakdown,
      };

      logger.info('[TaxCalculation] Tax calculated successfully', {
        fromState: params.fromState,
        toState: params.toState,
        amount: params.amount,
        tax: result.amountToCollect,
        rate: result.rate,
      });

      return result;
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to calculate tax', {
        error: error.message,
        fromState: params.fromState,
        toState: params.toState,
      });

      // Return zero tax on error to not block transactions
      return this.getZeroTaxResult(params.amount, params.shipping || 0);
    }
  }

  /**
   * Get tax rate for a location
   */
  async getTaxRate(
    country: string,
    zip: string,
    state: string,
    city?: string
  ): Promise<TaxRate | null> {
    try {
      if (!this.taxjar) {
        logger.warn('[TaxCalculation] TaxJar not configured');
        return null;
      }

      if (!country || !zip || !state) {
        throw new Error('Country, zip, and state are required');
      }

      const params: any = {
        country,
        zip,
        state,
      };

      if (city) {
        params.city = city;
      }

      const response = await this.taxjar.ratesForLocation(zip, params);

      const rate: TaxRate = {
        country: response.rate.country,
        state: response.rate.state,
        zip: response.rate.zip,
        city: response.rate.city,
        rate: response.rate.combined_rate,
        freightTaxable: response.rate.freight_taxable,
        hasNexus: true, // TaxJar only returns rates for nexus locations
      };

      logger.info('[TaxCalculation] Tax rate retrieved', {
        country,
        state,
        zip,
        rate: rate.rate,
      });

      return rate;
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to get tax rate', {
        error: error.message,
        country,
        state,
        zip,
      });
      return null;
    }
  }

  /**
   * Validate a VAT number (for EU transactions)
   */
  async validateVAT(vatNumber: string, country: string): Promise<boolean> {
    try {
      if (!this.taxjar) {
        logger.warn('[TaxCalculation] TaxJar not configured');
        return false;
      }

      if (!vatNumber || !country) {
        throw new Error('VAT number and country are required');
      }

      const response = await this.taxjar.validate({
        vat: vatNumber,
      });

      const isValid = response.validation.valid;

      logger.info('[TaxCalculation] VAT validated', {
        vatNumber,
        country,
        isValid,
      });

      return isValid;
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to validate VAT', {
        error: error.message,
        vatNumber,
        country,
      });
      return false;
    }
  }

  /**
   * Check if nexus exists for a location
   */
  async hasNexus(country: string, state: string): Promise<boolean> {
    try {
      if (!this.taxjar) {
        return false;
      }

      const response = await this.taxjar.nexusRegions();

      const hasNexus = response.regions.some(
        (region: any) =>
          region.country_code === country &&
          region.region_code === state &&
          region.region === 'state'
      );

      logger.info('[TaxCalculation] Nexus check completed', {
        country,
        state,
        hasNexus,
      });

      return hasNexus;
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to check nexus', {
        error: error.message,
        country,
        state,
      });
      return false;
    }
  }

  /**
   * Create a tax transaction record (for reporting)
   */
  async createTaxTransaction(params: {
    transactionId: string;
    transactionDate: Date;
    tenantId: string;
    fromCountry: string;
    fromZip: string;
    fromState: string;
    fromCity?: string;
    fromStreet?: string;
    toCountry: string;
    toZip: string;
    toState: string;
    toCity?: string;
    toStreet?: string;
    amount: number;
    shipping: number;
    salesTax: number;
    lineItems?: Array<{
      id: string;
      quantity: number;
      productIdentifier?: string;
      description?: string;
      productTaxCode?: string;
      unitPrice: number;
      discount?: number;
      salesTax: number;
    }>;
  }): Promise<void> {
    try {
      if (!this.taxjar) {
        logger.warn('[TaxCalculation] TaxJar not configured, skipping transaction record');
        return;
      }

      const taxjarParams: any = {
        transaction_id: params.transactionId,
        transaction_date: params.transactionDate.toISOString().split('T')[0],
        from_country: params.fromCountry,
        from_zip: params.fromZip,
        from_state: params.fromState,
        from_city: params.fromCity,
        from_street: params.fromStreet,
        to_country: params.toCountry,
        to_zip: params.toZip,
        to_state: params.toState,
        to_city: params.toCity,
        to_street: params.toStreet,
        amount: params.amount,
        shipping: params.shipping,
        sales_tax: params.salesTax,
      };

      if (params.lineItems && params.lineItems.length > 0) {
        taxjarParams.line_items = params.lineItems.map(item => ({
          id: item.id,
          quantity: item.quantity,
          product_identifier: item.productIdentifier,
          description: item.description,
          product_tax_code: item.productTaxCode,
          unit_price: item.unitPrice,
          discount: item.discount || 0,
          sales_tax: item.salesTax,
        }));
      }

      await this.taxjar.createOrder(taxjarParams);

      // Store in local database for audit trail
      await this.pool.query(
        `INSERT INTO tax_transactions (
          tenant_id, transaction_id, transaction_date,
          from_country, from_state, from_zip,
          to_country, to_state, to_zip,
          amount, shipping, sales_tax
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (transaction_id) DO UPDATE SET
        sales_tax = EXCLUDED.sales_tax,
        updated_at = NOW()`,
        [
          params.tenantId,
          params.transactionId,
          params.transactionDate,
          params.fromCountry,
          params.fromState,
          params.fromZip,
          params.toCountry,
          params.toState,
          params.toZip,
          params.amount,
          params.shipping,
          params.salesTax,
        ]
      );

      logger.info('[TaxCalculation] Tax transaction created', {
        transactionId: params.transactionId,
        amount: params.amount,
        salesTax: params.salesTax,
      });
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to create tax transaction', {
        error: error.message,
        transactionId: params.transactionId,
      });
      // Don't throw - this is for reporting purposes
    }
  }

  /**
   * Update a tax transaction (for refunds, etc.)
   */
  async updateTaxTransaction(
    transactionId: string,
    updates: {
      amount?: number;
      shipping?: number;
      salesTax?: number;
    }
  ): Promise<void> {
    try {
      if (!this.taxjar) {
        logger.warn('[TaxCalculation] TaxJar not configured');
        return;
      }

      await this.taxjar.updateOrder({
        transaction_id: transactionId,
        amount: updates.amount,
        shipping: updates.shipping,
        sales_tax: updates.salesTax,
      });

      logger.info('[TaxCalculation] Tax transaction updated', {
        transactionId,
        updates,
      });
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to update tax transaction', {
        error: error.message,
        transactionId,
      });
    }
  }

  /**
   * Delete a tax transaction (for voided orders)
   */
  async deleteTaxTransaction(transactionId: string): Promise<void> {
    try {
      if (!this.taxjar) {
        logger.warn('[TaxCalculation] TaxJar not configured');
        return;
      }

      await this.taxjar.deleteOrder(transactionId);

      logger.info('[TaxCalculation] Tax transaction deleted', { transactionId });
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to delete tax transaction', {
        error: error.message,
        transactionId,
      });
    }
  }

  /**
   * Get zero tax result (fallback)
   */
  private getZeroTaxResult(amount: number, shipping: number): TaxResult {
    return {
      orderTotalAmount: amount + shipping,
      shipping,
      taxableAmount: amount,
      amountToCollect: 0,
      rate: 0,
      hasNexus: false,
      freightTaxable: false,
      taxSource: 'fallback',
    };
  }

  /**
   * Calculate tax for Stripe invoice (helper method)
   */
  async calculateTaxForInvoice(params: {
    tenantId: string;
    customerCountry: string;
    customerZip: string;
    customerState: string;
    customerCity?: string;
    customerStreet?: string;
    amount: number;
    shipping?: number;
  }): Promise<number> {
    try {
      // Use company address as "from" - should be configured
      const companyCountry = process.env.COMPANY_COUNTRY || 'US';
      const companyZip = process.env.COMPANY_ZIP || '10001';
      const companyState = process.env.COMPANY_STATE || 'NY';
      const companyCity = process.env.COMPANY_CITY;
      const companyStreet = process.env.COMPANY_STREET;

      const taxResult = await this.calculateTax({
        fromCountry: companyCountry,
        fromZip: companyZip,
        fromState: companyState,
        fromCity: companyCity,
        fromStreet: companyStreet,
        toCountry: params.customerCountry,
        toZip: params.customerZip,
        toState: params.customerState,
        toCity: params.customerCity,
        toStreet: params.customerStreet,
        amount: params.amount,
        shipping: params.shipping,
      });

      return taxResult.amountToCollect;
    } catch (error: any) {
      logger.error('[TaxCalculation] Failed to calculate tax for invoice', {
        tenantId: params.tenantId,
        error: error.message,
      });
      return 0;
    }
  }
}
