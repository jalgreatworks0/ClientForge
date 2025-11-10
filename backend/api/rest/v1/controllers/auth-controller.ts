/**
 * Authentication Controller
 * Handles HTTP requests for authentication endpoints
 */

import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'

import { authService } from '../../../../core/auth/auth-service'
import { emailVerificationService } from '../../../../core/auth/email-verification-service'
import { passwordResetService } from '../../../../core/auth/password-reset-service'
import { logger } from '../../../../utils/logging/logger'
import { ValidationError } from '../../../../utils/errors/app-error'
import { commonSchemas } from '../../../../middleware/validate-request'
import { AuthRequest as BaseAuthRequest } from '../../../../middleware/auth'

/**
 * Validation schemas
 */
export const authSchemas = {
  register: z.object({
    tenantId: commonSchemas.tenantId,
    email: commonSchemas.email,
    password: commonSchemas.password,
    firstName: z.string().min(1, 'First name is required').max(100),
    lastName: z.string().min(1, 'Last name is required').max(100),
    phone: z.string().optional(),
    timezone: z.string().optional(),
    language: z.string().optional(),
  }),

  login: z.object({
    tenantId: commonSchemas.tenantId,
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
  }),

  refresh: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),

  logout: z.object({
    refreshToken: z.string().min(1, 'Refresh token is required'),
  }),

  verifyEmail: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),

  resendVerification: z.object({
    email: commonSchemas.email,
    tenantId: commonSchemas.tenantId,
  }),

  requestPasswordReset: z.object({
    email: commonSchemas.email,
    tenantId: commonSchemas.tenantId,
  }),

  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: commonSchemas.password,
  }),

  validateResetToken: z.object({
    token: z.string().min(1, 'Reset token is required'),
  }),
}

/**
 * Extended request with IP address extraction
 */
interface AuthRequest extends BaseAuthRequest {
  // Inherits user, body, query, params, headers from BaseAuthRequest
}

/**
 * Extract IP address from request (handles proxy headers)
 */
function getIpAddress(req: Request): string | undefined {
  // Try X-Forwarded-For header first (for proxied requests)
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim()
  }

  // Fall back to X-Real-IP
  const realIp = req.headers['x-real-ip']
  if (typeof realIp === 'string') {
    return realIp
  }

  // Fall back to socket remote address
  return req.socket.remoteAddress
}

/**
 * Extract device type from User-Agent
 */
function getDeviceType(userAgent: string | undefined): string {
  if (!userAgent) return 'unknown'

  const ua = userAgent.toLowerCase()

  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    return 'mobile'
  }

  if (ua.includes('tablet') || ua.includes('ipad')) {
    return 'tablet'
  }

  return 'desktop'
}

/**
 * Register new user
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = authSchemas.register.parse(req.body)

    const result = await authService.register({
      tenantId: data.tenantId,
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      timezone: data.timezone,
      language: data.language,
    })

    logger.info('User registered successfully', {
      userId: result.user.id,
      email: result.user.email,
      tenantId: result.user.tenantId,
    })

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          tenantId: result.user.tenantId,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Login user
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = authSchemas.login.parse(req.body)

    const ipAddress = getIpAddress(req)
    const userAgent = req.headers['user-agent']
    const deviceType = getDeviceType(userAgent)

    const result = await authService.login({
      email: data.email,
      password: data.password,
      tenantId: data.tenantId,
      ipAddress,
      userAgent,
      deviceType,
    })

    logger.info('User logged in successfully', {
      userId: result.user.id,
      email: result.user.email,
      ipAddress,
      deviceType,
    })

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          tenantId: result.user.tenantId,
          role: result.user.role,
        },
        tokens: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
        },
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export async function logout(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = authSchemas.logout.parse(req.body)

    if (!req.user) {
      throw new ValidationError('User not authenticated')
    }

    await authService.logout(req.user.userId, data.refreshToken)

    logger.info('User logged out successfully', {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
    })

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export async function refreshToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = authSchemas.refresh.parse(req.body)

    const result = await authService.refreshAccessToken(data.refreshToken)

    logger.info('Access token refreshed successfully', {
      userId: result.userId,
      tenantId: result.tenantId,
    })

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Verify email with token
 * POST /api/v1/auth/verify-email
 */
export async function verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = authSchemas.verifyEmail.parse(req.body)

    const result = await emailVerificationService.verifyEmail(data.token)

    logger.info('Email verified successfully', {
      userId: result.userId,
      email: result.email,
    })

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        email: result.email,
        firstName: result.firstName,
      },
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Resend verification email
 * POST /api/v1/auth/resend-verification
 */
export async function resendVerification(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = authSchemas.resendVerification.parse(req.body)

    await emailVerificationService.resendVerificationEmail(data.email, data.tenantId)

    logger.info('Verification email resent', { email: data.email })

    res.status(200).json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Request password reset
 * POST /api/v1/auth/request-password-reset
 */
export async function requestPasswordReset(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = authSchemas.requestPasswordReset.parse(req.body)

    await passwordResetService.requestPasswordReset({
      email: data.email,
      tenantId: data.tenantId,
    })

    logger.info('Password reset requested', { email: data.email })

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account exists with this email, you will receive a password reset link.',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = authSchemas.resetPassword.parse(req.body)

    const result = await passwordResetService.resetPassword({
      token: data.token,
      newPassword: data.newPassword,
    })

    logger.info('Password reset successfully', { email: result.email })

    res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in with your new password.',
    })
  } catch (error) {
    next(error)
  }
}

/**
 * Validate password reset token
 * POST /api/v1/auth/validate-reset-token
 */
export async function validateResetToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const data = authSchemas.validateResetToken.parse(req.body)

    const isValid = await passwordResetService.validateResetToken(data.token)

    res.status(200).json({
      success: true,
      data: {
        valid: isValid,
      },
    })
  } catch (error) {
    next(error)
  }
}
