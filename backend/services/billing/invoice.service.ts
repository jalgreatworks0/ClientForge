/**
 * Invoice Service
 * Manages invoice generation, PDF creation, payment tracking, and invoice history
 * Handles tax calculation integration and invoice delivery
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import Stripe from 'stripe';
import { Pool } from 'pg';
import puppeteer from 'puppeteer';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

import { StripeService } from './stripe.service';

export interface InvoiceInfo {
  id: string;
  tenantId: string;
  stripeInvoiceId: string;
  stripeCustomerId: string;
  subscriptionId?: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  amountPaid: number;
  amountRemaining: number;
  currency: string;
  tax: number;
  total: number;
  subtotal: number;
  dueDate?: Date;
  paidAt?: Date;
  attemptedAt?: Date;
  nextPaymentAttempt?: Date;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
  period?: {
    start: Date;
    end: Date;
  };
}

export interface CreateInvoiceParams {
  tenantId: string;
  description?: string;
  lineItems?: InvoiceLineItem[];
  daysUntilDue?: number;
  autoAdvance?: boolean;
}

export class InvoiceService {
  private pool: Pool;
  private stripeService: StripeService;

  constructor() {
    this.pool = getPool();
    this.stripeService = new StripeService();
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(tenantId: string, invoiceId: string): Promise<InvoiceInfo | null> {
    try {
      if (!tenantId || !invoiceId) {
        throw new Error('tenantId and invoiceId are required');
      }

      const result = await this.pool.query(
        `SELECT
          id, tenantId, stripe_invoice_id, stripe_customer_id, subscription_id,
          invoice_number, status, amount_due, amount_paid, amount_remaining,
          currency, tax, total, subtotal, due_date, paid_at, attempted_at,
          next_payment_attempt, pdf_url, created_at, updated_at
         FROM invoices
         WHERE tenantId = $1 AND id = $2`,
        [tenantId, invoiceId]
      );

      if (result.rows.length === 0) {
        logger.warn('[Invoice] Invoice not found', { tenantId, invoiceId });
        return null;
      }

      return this.mapRowToInvoice(result.rows[0]);
    } catch (error: any) {
      logger.error('[Invoice] Failed to get invoice', {
        tenantId,
        invoiceId,
        error: error.message,
      });
      throw new Error('Failed to get invoice');
    }
  }

  /**
   * List invoices for a tenant
   */
  async listInvoices(
    tenantId: string,
    options: {
      limit?: number;
      offset?: number;
      status?: string;
    } = {}
  ): Promise<{ invoices: InvoiceInfo[]; total: number }> {
    const { limit = 20, offset = 0, status } = options;

    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      let query = `
        SELECT
          id, tenantId, stripe_invoice_id, stripe_customer_id, subscription_id,
          invoice_number, status, amount_due, amount_paid, amount_remaining,
          currency, tax, total, subtotal, due_date, paid_at, attempted_at,
          next_payment_attempt, pdf_url, created_at, updated_at
        FROM invoices
        WHERE tenantId = $1
      `;

      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        query += ` AND status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      // Get total count
      let countQuery = 'SELECT COUNT(*) FROM invoices WHERE tenantId = $1';
      const countParams: any[] = [tenantId];

      if (status) {
        countQuery += ' AND status = $2';
        countParams.push(status);
      }

      const countResult = await this.pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].count);

      const invoices = result.rows.map(row => this.mapRowToInvoice(row));

      logger.info('[Invoice] Listed invoices', {
        tenantId,
        count: invoices.length,
        total,
        status,
      });

      return { invoices, total };
    } catch (error: any) {
      logger.error('[Invoice] Failed to list invoices', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to list invoices');
    }
  }

  /**
   * Get upcoming invoice (draft/preview)
   */
  async getUpcomingInvoice(tenantId: string): Promise<Stripe.Invoice | null> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      const customerId = await this.stripeService.getCustomerIdForTenant(tenantId);
      if (!customerId) {
        logger.warn('[Invoice] No customer found for tenant', { tenantId });
        return null;
      }

      const stripe = this.stripeService.getStripeInstance();
      const upcomingInvoice = await stripe.invoices.retrieveUpcoming({
        customer: customerId,
      });

      logger.info('[Invoice] Retrieved upcoming invoice', {
        tenantId,
        amount: upcomingInvoice.amount_due,
        periodEnd: new Date(upcomingInvoice.period_end * 1000),
      });

      // @ts-expect-error Stripe UpcomingInvoice doesn't have 'id' but type compatibility requires it
      return upcomingInvoice;
    } catch (error: any) {
      if (error.code === 'invoice_upcoming_none') {
        logger.info('[Invoice] No upcoming invoice', { tenantId });
        return null;
      }

      logger.error('[Invoice] Failed to get upcoming invoice', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to get upcoming invoice');
    }
  }

  /**
   * Create a one-time invoice
   */
  async createInvoice(params: CreateInvoiceParams): Promise<InvoiceInfo> {
    const {
      tenantId,
      description,
      lineItems = [],
      daysUntilDue = 30,
      autoAdvance = true,
    } = params;

    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      if (lineItems.length === 0) {
        throw new Error('At least one line item is required');
      }

      const customerId = await this.stripeService.getCustomerIdForTenant(tenantId);
      if (!customerId) {
        throw new Error('No customer found for this tenant');
      }

      const stripe = this.stripeService.getStripeInstance();

      // Create invoice items
      for (const item of lineItems) {
        await stripe.invoiceItems.create({
          customer: customerId,
          amount: item.amount,
          currency: item.currency,
          description: item.description,
        });
      }

      // Create invoice
      const invoice = await stripe.invoices.create({
        customer: customerId,
        description,
        days_until_due: daysUntilDue,
        auto_advance: autoAdvance,
        metadata: {
          tenantId,
        },
      });

      // Finalize if auto_advance is true
      if (autoAdvance) {
        await stripe.invoices.finalizeInvoice(invoice.id);
      }

      // Store in database
      await this.storeInvoice(tenantId, invoice);

      logger.info('[Invoice] Invoice created', {
        tenantId,
        invoiceId: invoice.id,
        total: invoice.total,
      });

      const stored = await this.getInvoiceByStripeId(tenantId, invoice.id);
      if (!stored) {
        throw new Error('Invoice created but not found in database');
      }

      return stored;
    } catch (error: any) {
      logger.error('[Invoice] Failed to create invoice', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to create invoice');
    }
  }

  /**
   * Pay an invoice manually
   */
  async payInvoice(tenantId: string, invoiceId: string): Promise<InvoiceInfo> {
    try {
      if (!tenantId || !invoiceId) {
        throw new Error('tenantId and invoiceId are required');
      }

      const invoice = await this.getInvoice(tenantId, invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'paid') {
        logger.info('[Invoice] Invoice already paid', { tenantId, invoiceId });
        return invoice;
      }

      const stripe = this.stripeService.getStripeInstance();
      const paidInvoice = await stripe.invoices.pay(invoice.stripeInvoiceId);

      // Update in database
      await this.updateInvoiceFromStripe(tenantId, paidInvoice);

      logger.info('[Invoice] Invoice paid successfully', {
        tenantId,
        invoiceId: invoice.stripeInvoiceId,
        amountPaid: paidInvoice.amount_paid,
      });

      const updated = await this.getInvoice(tenantId, invoiceId);
      if (!updated) {
        throw new Error('Invoice paid but not found in database');
      }

      return updated;
    } catch (error: any) {
      logger.error('[Invoice] Failed to pay invoice', {
        tenantId,
        invoiceId,
        error: error.message,
      });
      throw new Error('Failed to pay invoice');
    }
  }

  /**
   * Void an invoice (mark as uncollectible)
   */
  async voidInvoice(tenantId: string, invoiceId: string): Promise<InvoiceInfo> {
    try {
      if (!tenantId || !invoiceId) {
        throw new Error('tenantId and invoiceId are required');
      }

      const invoice = await this.getInvoice(tenantId, invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      if (invoice.status === 'void') {
        logger.info('[Invoice] Invoice already voided', { tenantId, invoiceId });
        return invoice;
      }

      const stripe = this.stripeService.getStripeInstance();
      const voidedInvoice = await stripe.invoices.voidInvoice(invoice.stripeInvoiceId);

      // Update in database
      await this.updateInvoiceFromStripe(tenantId, voidedInvoice);

      logger.info('[Invoice] Invoice voided', {
        tenantId,
        invoiceId: invoice.stripeInvoiceId,
      });

      const updated = await this.getInvoice(tenantId, invoiceId);
      if (!updated) {
        throw new Error('Invoice voided but not found in database');
      }

      return updated;
    } catch (error: any) {
      logger.error('[Invoice] Failed to void invoice', {
        tenantId,
        invoiceId,
        error: error.message,
      });
      throw new Error('Failed to void invoice');
    }
  }

  /**
   * Generate PDF for invoice
   */
  async generateInvoicePDF(tenantId: string, invoiceId: string): Promise<string> {
    try {
      if (!tenantId || !invoiceId) {
        throw new Error('tenantId and invoiceId are required');
      }

      const invoice = await this.getInvoice(tenantId, invoiceId);
      if (!invoice) {
        throw new Error('Invoice not found');
      }

      // Get full invoice details from Stripe
      const stripe = this.stripeService.getStripeInstance();
      const stripeInvoice = await stripe.invoices.retrieve(invoice.stripeInvoiceId);

      // Generate PDF using puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Create HTML content for invoice
      const html = this.generateInvoiceHTML(stripeInvoice);
      await page.setContent(html);

      // Generate PDF
      const pdfDir = path.join(process.cwd(), 'storage', 'invoices', tenantId);
      await fs.mkdir(pdfDir, { recursive: true });

      const pdfFilename = `invoice_${invoice.invoiceNumber}_${Date.now()}.pdf`;
      const pdfPath = path.join(pdfDir, pdfFilename);

      await page.pdf({
        path: pdfPath,
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
      });

      await browser.close();

      // Update PDF URL in database
      const pdfUrl = `/invoices/${tenantId}/${pdfFilename}`;
      await this.pool.query(
        'UPDATE invoices SET pdf_url = $1, updated_at = NOW() WHERE id = $2',
        [pdfUrl, invoice.id]
      );

      logger.info('[Invoice] PDF generated successfully', {
        tenantId,
        invoiceId,
        pdfUrl,
      });

      return pdfUrl;
    } catch (error: any) {
      logger.error('[Invoice] Failed to generate PDF', {
        tenantId,
        invoiceId,
        error: error.message,
      });
      throw new Error('Failed to generate invoice PDF');
    }
  }

  /**
   * Store invoice in database from Stripe
   */
  private async storeInvoice(tenantId: string, invoice: Stripe.Invoice): Promise<void> {
    await this.pool.query(
      `INSERT INTO invoices (
        tenantId, stripe_invoice_id, stripe_customer_id, subscription_id,
        invoice_number, status, amount_due, amount_paid, amount_remaining,
        currency, tax, total, subtotal, due_date, paid_at, attempted_at,
        next_payment_attempt
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      ON CONFLICT (stripe_invoice_id) DO UPDATE SET
      status = EXCLUDED.status,
      amount_paid = EXCLUDED.amount_paid,
      amount_remaining = EXCLUDED.amount_remaining,
      paid_at = EXCLUDED.paid_at,
      attempted_at = EXCLUDED.attempted_at,
      next_payment_attempt = EXCLUDED.next_payment_attempt,
      updated_at = NOW()`,
      [
        tenantId,
        invoice.id,
        typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id,
        typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id || null,
        invoice.number,
        invoice.status,
        invoice.amount_due,
        invoice.amount_paid,
        invoice.amount_remaining,
        invoice.currency,
        invoice.tax || 0,
        invoice.total,
        invoice.subtotal,
        invoice.due_date ? new Date(invoice.due_date * 1000) : null,
        invoice.status_transitions?.paid_at
          ? new Date(invoice.status_transitions.paid_at * 1000)
          : null,
        invoice.attempted ? new Date() : null,
        invoice.next_payment_attempt
          ? new Date(invoice.next_payment_attempt * 1000)
          : null,
      ]
    );
  }

  /**
   * Update invoice from Stripe webhook
   */
  async updateInvoiceFromStripe(tenantId: string, invoice: Stripe.Invoice): Promise<void> {
    await this.storeInvoice(tenantId, invoice);
  }

  /**
   * Get invoice by Stripe ID
   */
  private async getInvoiceByStripeId(
    tenantId: string,
    stripeInvoiceId: string
  ): Promise<InvoiceInfo | null> {
    const result = await this.pool.query(
      `SELECT
        id, tenantId, stripe_invoice_id, stripe_customer_id, subscription_id,
        invoice_number, status, amount_due, amount_paid, amount_remaining,
        currency, tax, total, subtotal, due_date, paid_at, attempted_at,
        next_payment_attempt, pdf_url, created_at, updated_at
       FROM invoices
       WHERE tenantId = $1 AND stripe_invoice_id = $2`,
      [tenantId, stripeInvoiceId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapRowToInvoice(result.rows[0]);
  }

  /**
   * Map database row to InvoiceInfo
   */
  private mapRowToInvoice(row: any): InvoiceInfo {
    return {
      id: row.id,
      tenantId: row.tenantId,
      stripeInvoiceId: row.stripe_invoice_id,
      stripeCustomerId: row.stripe_customer_id,
      subscriptionId: row.subscription_id,
      invoiceNumber: row.invoice_number,
      status: row.status,
      amountDue: row.amount_due,
      amountPaid: row.amount_paid,
      amountRemaining: row.amount_remaining,
      currency: row.currency,
      tax: row.tax,
      total: row.total,
      subtotal: row.subtotal,
      dueDate: row.due_date,
      paidAt: row.paid_at,
      attemptedAt: row.attempted_at,
      nextPaymentAttempt: row.next_payment_attempt,
      pdfUrl: row.pdf_url,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Generate HTML for invoice PDF
   */
  private generateInvoiceHTML(invoice: Stripe.Invoice): string {
    const formatCurrency = (amount: number, currency: string) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency.toUpperCase(),
      }).format(amount / 100);
    };

    const formatDate = (timestamp: number | null) => {
      if (!timestamp) return 'N/A';
      return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Invoice ${invoice.number}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company-info h1 { margin: 0; color: #2563eb; }
          .invoice-details { text-align: right; }
          .invoice-details h2 { margin: 0 0 10px 0; }
          .invoice-details p { margin: 5px 0; }
          .customer-info { margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin: 30px 0; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f9fa; font-weight: 600; }
          .total-row { font-weight: bold; font-size: 1.1em; }
          .status { display: inline-block; padding: 5px 10px; border-radius: 4px; font-size: 0.9em; }
          .status-paid { background-color: #d1fae5; color: #065f46; }
          .status-open { background-color: #fef3c7; color: #92400e; }
          .footer { margin-top: 50px; text-align: center; color: #666; font-size: 0.9em; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company-info">
            <h1>ClientForge CRM</h1>
            <p>Invoice</p>
          </div>
          <div class="invoice-details">
            <h2>Invoice ${invoice.number || 'DRAFT'}</h2>
            <p>Date: ${formatDate(invoice.created)}</p>
            <p>Due: ${formatDate(invoice.due_date)}</p>
            <p>Status: <span class="status status-${invoice.status}">${invoice.status?.toUpperCase()}</span></p>
          </div>
        </div>

        <div class="customer-info">
          <h3>Bill To:</h3>
          <p><strong>${invoice.customer_email}</strong></p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Unit Price</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.lines.data
              .map(
                line => `
              <tr>
                <td>${line.description || 'Subscription'}</td>
                <td>${line.quantity || 1}</td>
                <td>${formatCurrency(line.price?.unit_amount || 0, invoice.currency)}</td>
                <td>${formatCurrency(line.amount, invoice.currency)}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3" style="text-align: right;">Subtotal:</td>
              <td>${formatCurrency(invoice.subtotal, invoice.currency)}</td>
            </tr>
            ${
              invoice.tax
                ? `
            <tr>
              <td colspan="3" style="text-align: right;">Tax:</td>
              <td>${formatCurrency(invoice.tax, invoice.currency)}</td>
            </tr>
            `
                : ''
            }
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Total:</td>
              <td>${formatCurrency(invoice.total, invoice.currency)}</td>
            </tr>
            ${
              invoice.amount_paid > 0
                ? `
            <tr>
              <td colspan="3" style="text-align: right;">Amount Paid:</td>
              <td>${formatCurrency(invoice.amount_paid, invoice.currency)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align: right;">Amount Due:</td>
              <td>${formatCurrency(invoice.amount_remaining, invoice.currency)}</td>
            </tr>
            `
                : ''
            }
          </tfoot>
        </table>

        <div class="footer">
          <p>Thank you for your business!</p>
          <p>For questions about this invoice, please contact support@clientforge.com</p>
        </div>
      </body>
      </html>
    `;
  }
}
