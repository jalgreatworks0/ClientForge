/**
 * Email Service
 * Handles transactional email sending (verification, password reset, etc.)
 */

import nodemailer from 'nodemailer'
import { logger } from '../../utils/logging/logger'
import { appConfig } from '../../../config/app/app-config'

export interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
}

export interface EmailVerificationData {
  email: string
  firstName: string
  verificationToken: string
  verificationUrl: string
}

export interface PasswordResetData {
  email: string
  firstName: string
  resetToken: string
  resetUrl: string
}

export class EmailService {
  private readonly fromEmail: string
  private readonly fromName: string
  private transporter: nodemailer.Transporter | null = null

  constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@clientforge.com'
    this.fromName = process.env.EMAIL_FROM_NAME || 'ClientForge CRM'
    this.initializeTransporter()
  }

  /**
   * Initialize email transporter based on environment
   */
  private initializeTransporter(): void {
    const emailService = process.env.EMAIL_SERVICE || 'smtp'

    if (appConfig.env === 'development') {
      // In development, log emails to console
      logger.info('[Email Service] Running in development mode - emails will be logged')
      return
    }

    try {
      if (emailService === 'sendgrid' && process.env.SENDGRID_API_KEY) {
        // SendGrid via SMTP
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        })
        logger.info('[Email Service] SendGrid SMTP configured')
      } else if (process.env.SMTP_HOST) {
        // Generic SMTP configuration
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD,
          },
        })
        logger.info('[Email Service] SMTP configured')
      } else {
        logger.warn('[Email Service] No email provider configured - emails will be logged only')
      }
    } catch (error) {
      logger.error('[Email Service] Failed to initialize transporter', { error })
    }
  }

  /**
   * Send email using configured provider
   */
  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const from = `${this.fromName} <${this.fromEmail}>`

      logger.info('[Email] Sending email', {
        to: options.to,
        subject: options.subject,
        from,
      })

      // Development mode - log only
      if (appConfig.env === 'development' || !this.transporter) {
        logger.info('[Email] DEV MODE - Email content logged (not sent)', {
          to: options.to,
          subject: options.subject,
          html: options.html.substring(0, 200) + '...',
        })
        return
      }

      // Production mode - send via transporter
      await this.transporter.sendMail({
        from: options.from || from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''),
      })

      logger.info('[Email] Email sent successfully', {
        to: options.to,
        subject: options.subject,
      })
    } catch (error) {
      logger.error('[Email] Failed to send email', {
        error,
        to: options.to,
        subject: options.subject,
      })
      throw new Error('Failed to send email')
    }
  }

  /**
   * Send email verification email
   */
  async sendVerificationEmail(data: EmailVerificationData): Promise<void> {
    const { email, firstName, verificationUrl } = data

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Verify Your Email</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            h1 {
              color: #1a1a1a;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background: #0066cc;
              color: #ffffff;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
            }
            .security-notice {
              background: #f5f5f5;
              padding: 15px;
              border-radius: 6px;
              margin-top: 20px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h2 style="color: #0066cc; margin: 0;">ClientForge CRM</h2>
            </div>

            <h1>Verify Your Email Address</h1>

            <p>Hi ${firstName},</p>

            <p>Thank you for signing up for ClientForge CRM! Please verify your email address to activate your account.</p>

            <div style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #0066cc;">${verificationUrl}</p>

            <div class="security-notice">
              <strong>Security Notice:</strong> This verification link will expire in 24 hours. If you didn't create this account, please ignore this email.
            </div>

            <div class="footer">
              <p>
                This email was sent to ${email} because you signed up for ClientForge CRM.
                <br>
                If you have any questions, please contact our support team.
              </p>
              <p>&copy; ${new Date().getFullYear()} Abstract Creatives LLC. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
      Hi ${firstName},

      Thank you for signing up for ClientForge CRM! Please verify your email address to activate your account.

      Verification Link: ${verificationUrl}

      This link will expire in 24 hours. If you didn't create this account, please ignore this email.

      © ${new Date().getFullYear()} Abstract Creatives LLC. All rights reserved.
    `

    await this.sendEmail({
      to: email,
      subject: 'Verify Your Email - ClientForge CRM',
      html,
      text,
    })

    logger.info('Verification email sent', { email })
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(data: PasswordResetData): Promise<void> {
    const { email, firstName, resetUrl } = data

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            h1 {
              color: #1a1a1a;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background: #dc3545;
              color: #ffffff;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
            }
            .security-notice {
              background: #fff3cd;
              border-left: 4px solid #ffc107;
              padding: 15px;
              margin-top: 20px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h2 style="color: #0066cc; margin: 0;">ClientForge CRM</h2>
            </div>

            <h1>Reset Your Password</h1>

            <p>Hi ${firstName},</p>

            <p>We received a request to reset your password for your ClientForge CRM account.</p>

            <div style="text-align: center;">
              <a href="${resetUrl}" class="button">Reset Password</a>
            </div>

            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #dc3545;">${resetUrl}</p>

            <div class="security-notice">
              <strong>Security Notice:</strong> This password reset link will expire in 1 hour. If you didn't request a password reset, please ignore this email and ensure your account is secure.
            </div>

            <div class="footer">
              <p>
                This email was sent to ${email} because a password reset was requested for your account.
                <br>
                If you have any questions or concerns, please contact our support team immediately.
              </p>
              <p>&copy; ${new Date().getFullYear()} Abstract Creatives LLC. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
      Hi ${firstName},

      We received a request to reset your password for your ClientForge CRM account.

      Reset Password Link: ${resetUrl}

      This link will expire in 1 hour. If you didn't request a password reset, please ignore this email and ensure your account is secure.

      © ${new Date().getFullYear()} Abstract Creatives LLC. All rights reserved.
    `

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - ClientForge CRM',
      html,
      text,
    })

    logger.info('Password reset email sent', { email })
  }

  /**
   * Send welcome email after successful verification
   */
  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to ClientForge CRM</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              line-height: 1.6;
              color: #333;
              max-width: 600px;
              margin: 0 auto;
              padding: 20px;
            }
            .container {
              background: #ffffff;
              border-radius: 8px;
              padding: 40px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            .logo {
              text-align: center;
              margin-bottom: 30px;
            }
            h1 {
              color: #1a1a1a;
              font-size: 24px;
              margin-bottom: 20px;
            }
            .button {
              display: inline-block;
              background: #28a745;
              color: #ffffff;
              padding: 14px 28px;
              text-decoration: none;
              border-radius: 6px;
              margin: 20px 0;
              font-weight: 600;
            }
            .features {
              background: #f8f9fa;
              padding: 20px;
              border-radius: 6px;
              margin: 20px 0;
            }
            .features ul {
              margin: 10px 0;
              padding-left: 20px;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 1px solid #eee;
              font-size: 12px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">
              <h2 style="color: #0066cc; margin: 0;">ClientForge CRM</h2>
            </div>

            <h1>Welcome to ClientForge CRM!</h1>

            <p>Hi ${firstName},</p>

            <p>Your account has been successfully verified! You're now ready to start managing your customer relationships like never before.</p>

            <div class="features">
              <h3 style="margin-top: 0;">What's next?</h3>
              <ul>
                <li>Import your contacts and start building relationships</li>
                <li>Create deals and track your sales pipeline</li>
                <li>Set up automated workflows to save time</li>
                <li>Explore AI-powered insights with Albedo</li>
              </ul>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard" class="button">Go to Dashboard</a>
            </div>

            <p>Need help getting started? Check out our <a href="${process.env.FRONTEND_URL || 'http://localhost:3001'}/docs">documentation</a> or contact our support team.</p>

            <div class="footer">
              <p>
                Welcome aboard!
                <br>
                The ClientForge Team
              </p>
              <p>&copy; ${new Date().getFullYear()} Abstract Creatives LLC. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `

    const text = `
      Hi ${firstName},

      Welcome to ClientForge CRM! Your account has been successfully verified.

      You're now ready to start managing your customer relationships like never before.

      What's next?
      - Import your contacts and start building relationships
      - Create deals and track your sales pipeline
      - Set up automated workflows to save time
      - Explore AI-powered insights with Albedo

      Go to Dashboard: ${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard

      © ${new Date().getFullYear()} Abstract Creatives LLC. All rights reserved.
    `

    await this.sendEmail({
      to: email,
      subject: 'Welcome to ClientForge CRM!',
      html,
      text,
    })

    logger.info('Welcome email sent', { email })
  }
}

// Export singleton instance
export const emailService = new EmailService()
