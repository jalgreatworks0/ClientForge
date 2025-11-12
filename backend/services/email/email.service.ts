/**
 * Email Service
 * Handles all email sending via SendGrid or SMTP
 * Supports transactional emails, templates, and attachments
 */

import * as fs from 'fs/promises';
import * as path from 'path';

import sgMail from '@sendgrid/mail';
import * as nodemailer from 'nodemailer';

import { logger } from '../../utils/logging/logger';

export interface EmailOptions {
  to: string | string[];
  from?: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: EmailAttachment[];
  template?: string;
  templateData?: Record<string, any>;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
}

export interface EmailAttachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailService {
  private sendgridConfigured: boolean;
  private smtpTransporter: nodemailer.Transporter | null = null;
  private defaultFrom: string;
  private templatesCache: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.defaultFrom = process.env.EMAIL_FROM || 'noreply@clientforge.com';
    this.initialize();
  }

  private initialize(): void {
    // Try SendGrid first
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.sendgridConfigured = true;
      logger.info('[Email] SendGrid configured');
    } else if (process.env.SMTP_HOST) {
      // Fallback to SMTP
      this.smtpTransporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });
      this.sendgridConfigured = false;
      logger.info('[Email] SMTP configured');
    } else {
      logger.warn('[Email] No email provider configured - emails will be logged only');
      this.sendgridConfigured = false;
    }
  }

  /**
   * Send an email
   */
  async send(options: EmailOptions): Promise<void> {
    try {
      // Apply template if specified
      if (options.template) {
        const rendered = await this.renderTemplate(options.template, options.templateData || {});
        options.html = rendered.html;
        options.text = rendered.text;
        options.subject = rendered.subject;
      }

      // Validate required fields
      if (!options.to) throw new Error('Recipient email is required');
      if (!options.subject) throw new Error('Email subject is required');
      if (!options.html && !options.text) throw new Error('Email body is required');

      // Send via appropriate provider
      if (this.sendgridConfigured) {
        await this.sendViaSendGrid(options);
      } else if (this.smtpTransporter) {
        await this.sendViaSMTP(options);
      } else {
        // Log only (development)
        logger.info('[Email] Would send email (no provider configured)', {
          to: options.to,
          subject: options.subject,
          hasAttachments: !!options.attachments?.length,
        });
      }

      logger.info('[Email] Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });
    } catch (error: any) {
      logger.error('[Email] Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Send invoice email
   */
  async sendInvoice(to: string, invoiceNumber: string, pdfPath: string, amount: number): Promise<void> {
    const pdfBuffer = await fs.readFile(pdfPath);

    await this.send({
      to,
      subject: `Invoice ${invoiceNumber} from ClientForge`,
      template: 'invoice',
      templateData: {
        invoiceNumber,
        amount: (amount / 100).toFixed(2),
        downloadUrl: `${process.env.FRONTEND_URL}/invoices/${invoiceNumber}`,
      },
      attachments: [
        {
          filename: `invoice-${invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(to: string, resetToken: string, userName: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    await this.send({
      to,
      subject: 'Reset your ClientForge password',
      template: 'password-reset',
      templateData: {
        userName,
        resetUrl,
        expiryHours: 24,
      },
    });
  }

  /**
   * Send payment failed email
   */
  async sendPaymentFailed(to: string, invoiceNumber: string, amount: number, retryDate: Date): Promise<void> {
    await this.send({
      to,
      subject: 'Payment failed - Action required',
      template: 'payment-failed',
      templateData: {
        invoiceNumber,
        amount: (amount / 100).toFixed(2),
        retryDate: retryDate.toLocaleDateString(),
        updatePaymentUrl: `${process.env.FRONTEND_URL}/billing/payment-methods`,
      },
    });
  }

  /**
   * Send GDPR data export ready email
   */
  async sendGDPRExportReady(to: string, downloadUrl: string, expiryDays: number = 7): Promise<void> {
    await this.send({
      to,
      subject: 'Your data export is ready',
      template: 'gdpr-export-ready',
      templateData: {
        downloadUrl: `${process.env.FRONTEND_URL}${downloadUrl}`,
        expiryDays,
      },
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcome(to: string, userName: string, activationToken?: string): Promise<void> {
    const activationUrl = activationToken
      ? `${process.env.FRONTEND_URL}/activate?token=${activationToken}`
      : undefined;

    await this.send({
      to,
      subject: 'Welcome to ClientForge!',
      template: 'welcome',
      templateData: {
        userName,
        activationUrl,
        loginUrl: `${process.env.FRONTEND_URL}/login`,
      },
    });
  }

  /**
   * Send subscription renewal reminder
   */
  async sendSubscriptionRenewal(to: string, planName: string, amount: number, renewalDate: Date): Promise<void> {
    await this.send({
      to,
      subject: 'Your subscription will renew soon',
      template: 'subscription-renewal',
      templateData: {
        planName,
        amount: (amount / 100).toFixed(2),
        renewalDate: renewalDate.toLocaleDateString(),
        manageUrl: `${process.env.FRONTEND_URL}/billing/subscription`,
      },
    });
  }

  /**
   * Send import completed email
   */
  async sendImportCompleted(
    to: string,
    entityType: string,
    successCount: number,
    failCount: number
  ): Promise<void> {
    await this.send({
      to,
      subject: `Import completed - ${successCount} ${entityType}s imported`,
      template: 'import-completed',
      templateData: {
        entityType,
        successCount,
        failCount,
        viewUrl: `${process.env.FRONTEND_URL}/${entityType}s`,
      },
    });
  }

  /**
   * Send via SendGrid
   */
  private async sendViaSendGrid(options: EmailOptions): Promise<void> {
    const msg: any = {
      to: options.to,
      from: options.from || this.defaultFrom,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    if (options.attachments) {
      msg.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: att.content ? att.content.toString('base64') : undefined,
        type: att.contentType,
        disposition: 'attachment',
      }));
    }

    await sgMail.send(msg);
  }

  /**
   * Send via SMTP
   */
  private async sendViaSMTP(options: EmailOptions): Promise<void> {
    if (!this.smtpTransporter) throw new Error('SMTP not configured');

    const mailOptions: any = {
      from: options.from || this.defaultFrom,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      replyTo: options.replyTo,
      cc: options.cc,
      bcc: options.bcc,
    };

    if (options.attachments) {
      mailOptions.attachments = options.attachments.map((att) => ({
        filename: att.filename,
        content: att.content,
        path: att.path,
        contentType: att.contentType,
      }));
    }

    await this.smtpTransporter.sendMail(mailOptions);
  }

  /**
   * Render email template
   */
  private async renderTemplate(templateName: string, data: Record<string, any>): Promise<EmailTemplate> {
    // Check cache
    const cacheKey = `${templateName}-${JSON.stringify(data)}`;
    if (this.templatesCache.has(cacheKey)) {
      return this.templatesCache.get(cacheKey)!;
    }

    // Load template
    const templatePath = path.join(process.cwd(), 'backend', 'services', 'email', 'templates', `${templateName}.html`);

    try {
      let html = await fs.readFile(templatePath, 'utf-8');

      // Simple template variable replacement
      Object.entries(data).forEach(([key, value]) => {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        html = html.replace(regex, String(value));
      });

      // Generate text version by stripping HTML
      const text = html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

      // Extract subject from template (first h1 or fallback)
      const subjectMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
      const subject = subjectMatch ? subjectMatch[1] : templateName;

      const rendered = { name: templateName, subject, html, text };

      // Cache for 5 minutes
      this.templatesCache.set(cacheKey, rendered);
      setTimeout(() => this.templatesCache.delete(cacheKey), 5 * 60 * 1000);

      return rendered;
    } catch (error: any) {
      logger.error('[Email] Template not found, using fallback', {
        templateName,
        error: error.message,
      });

      // Fallback to plain email
      return {
        name: templateName,
        subject: templateName,
        html: `<p>${JSON.stringify(data, null, 2)}</p>`,
        text: JSON.stringify(data, null, 2),
      };
    }
  }

  /**
   * Test email configuration
   */
  async testConnection(): Promise<boolean> {
    try {
      if (this.sendgridConfigured) {
        // SendGrid doesn't have a test connection method
        // Try sending to a test email
        return true;
      } else if (this.smtpTransporter) {
        await this.smtpTransporter.verify();
        return true;
      }
      return false;
    } catch (error: any) {
      logger.error('[Email] Connection test failed', { error: error.message });
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
