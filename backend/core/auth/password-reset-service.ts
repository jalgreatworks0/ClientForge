/**
 * Password Reset Service
 * Handles password reset token generation and password updates
 */

import crypto from 'crypto'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { emailService } from '../email/email-service'
import { passwordService } from './password-service'
import { logger } from '../../utils/logging/logger'
import { auditLogger } from '../../utils/logging/audit-logger'
import { NotFoundError, ValidationError } from '../../utils/errors/app-error'

export interface RequestPasswordResetData {
  email: string
  tenantId: string
}

export interface ResetPasswordData {
  token: string
  newPassword: string
}

export class PasswordResetService {
  private readonly tokenExpiryHours: number = 1 // 1 hour for security

  /**
   * Generate a secure reset token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex')
  }

  /**
   * Request password reset (sends email with reset link)
   */
  async requestPasswordReset(data: RequestPasswordResetData): Promise<void> {
    const { email, tenantId } = data

    try {
      const pool = getPostgresPool()

      // Find user by email and tenant
      const userResult = await pool.query(
        `SELECT id, email, first_name, is_active, deleted_at
         FROM users
         WHERE email = $1
           AND tenant_id = $2
           AND deleted_at IS NULL`,
        [email, tenantId]
      )

      // For security, always return success even if user not found
      // This prevents email enumeration attacks
      if (userResult.rows.length === 0) {
        logger.warn('Password reset requested for non-existent email', {
          email,
          tenantId,
        })

        // Still return success to prevent email enumeration
        return
      }

      const user = userResult.rows[0]

      // Check if user is active
      if (!user.is_active) {
        logger.warn('Password reset requested for inactive account', {
          email,
          userId: user.id,
        })

        // Still return success to prevent account status enumeration
        return
      }

      // Generate secure token
      const token = this.generateToken()
      const expiresAt = new Date(Date.now() + this.tokenExpiryHours * 60 * 60 * 1000)

      // Hash token before storing
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Store token in database (replace any existing tokens)
      await pool.query(
        `INSERT INTO password_reset_tokens (
          user_id, token_hash, expires_at
        ) VALUES ($1, $2, $3)
        ON CONFLICT (user_id)
        DO UPDATE SET
          token_hash = $2,
          expires_at = $3,
          created_at = CURRENT_TIMESTAMP,
          used_at = NULL`,
        [user.id, tokenHash, expiresAt]
      )

      // Create reset URL
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001'
      const resetUrl = `${frontendUrl}/reset-password?token=${token}`

      // Send password reset email
      await emailService.sendPasswordResetEmail({
        email: user.email,
        firstName: user.first_name,
        resetToken: token,
        resetUrl,
      })

      // Audit log
      await auditLogger.logPasswordResetRequested(user.id, email, tenantId)

      logger.info('Password reset token created and sent', {
        userId: user.id,
        email,
        expiresAt,
      })
    } catch (error) {
      logger.error('Failed to request password reset', { error, email })

      // Don't throw error to prevent information leakage
      // Just log and return success
      return
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordData): Promise<{ email: string }> {
    const { token, newPassword } = data

    try {
      const pool = getPostgresPool()

      // Hash the provided token to match against database
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Find valid token
      const result = await pool.query(
        `SELECT rt.user_id, rt.expires_at, u.email, u.tenant_id
         FROM password_reset_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1
           AND rt.used_at IS NULL
           AND rt.expires_at > CURRENT_TIMESTAMP
           AND u.deleted_at IS NULL
           AND u.is_active = true`,
        [tokenHash]
      )

      if (result.rows.length === 0) {
        logger.warn('Invalid or expired password reset token', { tokenHash })
        throw new ValidationError('Invalid or expired password reset token')
      }

      const { user_id, email, tenant_id } = result.rows[0]

      // Hash new password
      const passwordHash = await passwordService.hash(newPassword)

      // Update password
      await pool.query(
        `UPDATE users
         SET password_hash = $2,
             password_changed_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [user_id, passwordHash]
      )

      // Mark token as used
      await pool.query(
        `UPDATE password_reset_tokens
         SET used_at = CURRENT_TIMESTAMP
         WHERE token_hash = $1`,
        [tokenHash]
      )

      // Invalidate all active sessions (force re-login)
      // This is a security measure to ensure old sessions can't be used
      const { sessionService } = await import('./session-service')
      await sessionService.deleteAllUserSessions(user_id)

      // Audit log
      await auditLogger.logPasswordChanged(user_id, email, tenant_id)

      logger.info('Password reset successfully', { userId: user_id, email })

      return { email }
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error
      }

      logger.error('Failed to reset password', { error })
      throw new Error('Failed to reset password')
    }
  }

  /**
   * Validate reset token without using it
   */
  async validateResetToken(token: string): Promise<boolean> {
    try {
      const pool = getPostgresPool()

      // Hash the provided token
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

      // Check if token exists and is valid
      const result = await pool.query(
        `SELECT rt.id
         FROM password_reset_tokens rt
         JOIN users u ON rt.user_id = u.id
         WHERE rt.token_hash = $1
           AND rt.used_at IS NULL
           AND rt.expires_at > CURRENT_TIMESTAMP
           AND u.deleted_at IS NULL
           AND u.is_active = true`,
        [tokenHash]
      )

      return result.rows.length > 0
    } catch (error) {
      logger.error('Failed to validate reset token', { error })
      return false
    }
  }

  /**
   * Clean up expired tokens (run periodically via cron job)
   */
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const pool = getPostgresPool()

      const result = await pool.query(
        `DELETE FROM password_reset_tokens
         WHERE expires_at < CURRENT_TIMESTAMP
         RETURNING id`
      )

      const count = result.rows.length

      if (count > 0) {
        logger.info('Expired password reset tokens cleaned up', { count })
      }

      return count
    } catch (error) {
      logger.error('Failed to cleanup expired tokens', { error })
      return 0
    }
  }
}

// Export singleton instance
export const passwordResetService = new PasswordResetService()
