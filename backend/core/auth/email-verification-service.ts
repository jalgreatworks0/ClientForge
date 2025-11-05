/**
 * Email Verification Service
 * Handles email verification token generation and verification
 */

import crypto from 'crypto'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { emailService } from '../email/email-service'
import { logger } from '../../utils/logging/logger'
import { NotFoundError, ValidationError } from '../../utils/errors/app-error'
import { appConfig } from '../../../config/app/app-config'

export interface VerificationTokenData {
  token: string
  expiresAt: Date
}

export class EmailVerificationService {
  private readonly tokenExpiryHours: number = 24

  /**
   * Generate a secure verification token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Create verification token and send email
   */
  async sendVerificationEmail(userId: string, email: string, firstName: string): Promise<void> {
    try {
      const pool = getPostgresPool()

      // Generate secure token
      const token = this.generateToken()
      const expiresAt = new Date(Date.now() + this.tokenExpiryHours * 60 * 60 * 1000)

      // Hash token before storing (security best practice)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Store token in database
      await pool.query(
        `INSERT INTO email_verification_tokens (
          user_id, token_hash, expires_at
        ) VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          token_hash = $2,
          expires_at = $3,
          created_at = CURRENT_TIMESTAMP`,
        [userId, tokenHash, expiresAt]
      )

      // Create verification URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
      const verificationUrl = `${frontendUrl}/verify-email?token=${token}`

      // Send verification email
      await emailService.sendVerificationEmail({
        email,
        firstName,
        verificationToken: token,
        verificationUrl,
      })

      logger.info('Email verification token created and sent', {
        userId,
        email,
        expiresAt,
      })
    } catch (error) {
      logger.error('Failed to send verification email', { error, userId, email })
      throw error
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ userId: string; email: string; firstName: string }> {
    try {
      const pool = getPostgresPool()

      // Hash the provided token to match against database
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Find token in database
      const result = await pool.query(
        `SELECT vt.user_id, vt.expires_at, u.email, u.first_name, u.is_verified
         FROM email_verification_tokens vt
         JOIN users u ON vt.user_id = u.id
         WHERE vt.token_hash = $1
           AND vt.used_at IS NULL
           AND vt.expires_at > CURRENT_TIMESTAMP
           AND u.deleted_at IS NULL`,
        [tokenHash]
      )

      if (result.rows.length === 0) {
        logger.warn('Invalid or expired verification token', { tokenHash })
        throw new ValidationError('Invalid or expired verification token')
      }

      const { user_id, email, first_name, is_verified } = result.rows[0]

      // Check if already verified
      if (is_verified) {
        logger.info('Email already verified', { userId: user_id, email })
        return {
          userId: user_id,
          email,
          firstName: first_name,
        }
      }

      // Mark user as verified
      await pool.query(
        `UPDATE users
         SET is_verified = true,
             email_verified_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [user_id]
      )

      // Mark token as used
      await pool.query(
        `UPDATE email_verification_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE token_hash = $1`,
        [tokenHash]
      )

      logger.info('Email verified successfully', { userId: user_id, email })

      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(email, first_name)
      } catch (emailError) {
        // Don't fail verification if welcome email fails
        logger.error('Failed to send welcome email', { error: emailError, email })
      }

      return {
        userId: user_id,
        email,
        firstName: first_name,
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }

      logger.error('Failed to verify email', { error })
      throw new Error('Failed to verify email')
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string, tenantId: string): Promise<void> {
    try {
      const pool = getPostgresPool()

      // Find user by email and tenant
      const result = await pool.query(
        `SELECT id, email, first_name, is_verified
         FROM users
         WHERE email = $1
           AND tenant_id = $2
           AND deleted_at IS NULL`,
        [email, tenantId]
      )

      if (result.rows.length === 0) {
        throw new NotFoundError('User')
      }

      const user = result.rows[0]

      // Check if already verified
      if (user.is_verified) {
        throw new ValidationError('Email is already verified')
      }

      // Send new verification email
      await this.sendVerificationEmail(user.id, user.email, user.first_name)

      logger.info('Verification email resent', { email, userId: user.id })
    } catch (error) {
      logger.error('Failed to resend verification email', { error, email })
      throw error
    }
  }

  /**
   * Clean up expired tokens (run periodically via cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const pool = getPostgresPool()

      const result = await pool.query(
        `DELETE FROM email_verification_tokens
         WHERE expires_at < CURRENT_TIMESTAMP
         RETURNING id`
      )

      const count = result.rows.length

      if (count > 0) {
        logger.info('Expired verification tokens cleaned up', { count })
      }

      return count
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error })
      return 0
    }
  }
}

// Export singleton instance
export const emailVerificationService = new EmailVerificationService()
