/**
 * Authentication Routes
 * Defines authentication endpoints and applies middleware
 */

import { Router } from 'express'
import * as authController from '../controllers/auth-controller'
import { authenticate } from '../../../../middleware/authenticate'
import { validateRequest } from '../../../../middleware/validate-request'
import { rateLimiters } from '../../../../middleware/rate-limit'

const router = Router()

/**
 * POST /api/v1/auth/register
 * Register a new user
 *
 * @body {string} tenantId - Tenant UUID
 * @body {string} email - User email
 * @body {string} password - User password (min 8 chars, complexity requirements)
 * @body {string} firstName - User first name
 * @body {string} lastName - User last name
 * @body {string} [phone] - Optional phone number
 * @body {string} [timezone] - Optional timezone (defaults to UTC)
 * @body {string} [language] - Optional language (defaults to en)
 *
 * @returns {201} User registered successfully with tokens
 * @returns {400} Validation error
 * @returns {409} User already exists
 */
router.post(
  '/register',
  rateLimiters.auth,
  validateRequest({ body: authController.authSchemas.register }),
  authController.register
)

/**
 * POST /api/v1/auth/login
 * Login user
 *
 * @body {string} tenantId - Tenant UUID
 * @body {string} email - User email
 * @body {string} password - User password
 *
 * @returns {200} Login successful with tokens
 * @returns {400} Validation error
 * @returns {401} Invalid credentials
 * @returns {423} Account locked
 */
router.post(
  '/login',
  rateLimiters.auth,
  validateRequest({ body: authController.authSchemas.login }),
  authController.login
)

/**
 * POST /api/v1/auth/logout
 * Logout user (requires authentication)
 *
 * @header {string} Authorization - Bearer token
 * @body {string} refreshToken - Refresh token to invalidate
 *
 * @returns {200} Logout successful
 * @returns {401} Unauthorized
 */
router.post(
  '/logout',
  authenticate,
  validateRequest({ body: authController.authSchemas.logout }),
  authController.logout
)

/**
 * POST /api/v1/auth/refresh
 * Refresh access token
 *
 * @body {string} refreshToken - Valid refresh token
 *
 * @returns {200} New access token generated
 * @returns {401} Invalid or expired refresh token
 */
router.post(
  '/refresh',
  validateRequest({ body: authController.authSchemas.refresh }),
  authController.refreshToken
)

/**
 * POST /api/v1/auth/verify-email
 * Verify email address with token
 *
 * @body {string} token - Email verification token
 *
 * @returns {200} Email verified successfully
 * @returns {400} Invalid or expired token
 */
router.post(
  '/verify-email',
  validateRequest({ body: authController.authSchemas.verifyEmail }),
  authController.verifyEmail
)

/**
 * POST /api/v1/auth/resend-verification
 * Resend email verification
 *
 * @body {string} email - User email
 * @body {string} tenantId - Tenant UUID
 *
 * @returns {200} Verification email sent
 * @returns {404} User not found
 */
router.post(
  '/resend-verification',
  rateLimiters.emailVerification,
  validateRequest({ body: authController.authSchemas.resendVerification }),
  authController.resendVerification
)

/**
 * POST /api/v1/auth/request-password-reset
 * Request password reset email
 *
 * @body {string} email - User email
 * @body {string} tenantId - Tenant UUID
 *
 * @returns {200} Reset email sent (always returns success for security)
 */
router.post(
  '/request-password-reset',
  rateLimiters.passwordReset,
  validateRequest({ body: authController.authSchemas.requestPasswordReset }),
  authController.requestPasswordReset
)

/**
 * POST /api/v1/auth/reset-password
 * Reset password with token
 *
 * @body {string} token - Password reset token
 * @body {string} newPassword - New password (min 8 chars, complexity requirements)
 *
 * @returns {200} Password reset successfully
 * @returns {400} Invalid or expired token
 */
router.post(
  '/reset-password',
  rateLimiters.passwordReset,
  validateRequest({ body: authController.authSchemas.resetPassword }),
  authController.resetPassword
)

/**
 * POST /api/v1/auth/validate-reset-token
 * Validate password reset token
 *
 * @body {string} token - Password reset token to validate
 *
 * @returns {200} Token validity status
 */
router.post(
  '/validate-reset-token',
  validateRequest({ body: authController.authSchemas.validateResetToken }),
  authController.validateResetToken
)

export default router
