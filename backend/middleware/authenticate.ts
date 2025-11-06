/**
 * Authentication Middleware
 * Verifies JWT access token and attaches user to request
 */

import { Response, NextFunction } from 'express'
import { jwtService } from '../core/auth/jwt-service'
import { UnauthorizedError } from '../utils/errors/app-error'
import { logger } from '../utils/logging/logger'
import { AuthRequest } from './auth'

/**
 * Middleware to verify JWT access token
 */
export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw new UnauthorizedError('No authorization header provided')
    }

    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Invalid authorization header format. Expected: Bearer <token>')
    }

    const token = authHeader.substring(7) // Remove 'Bearer ' prefix

    if (!token) {
      throw new UnauthorizedError('No token provided')
    }

    // Verify token
    const payload = jwtService.verifyAccessToken(token)

    // Attach user info to request
    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      email: payload.email,
      jti: payload.jti,
    }

    logger.debug('User authenticated', {
      userId: payload.userId,
      tenantId: payload.tenantId,
      path: req.path,
    })

    next()
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error)
    } else {
      logger.error('Authentication failed', { error, path: req.path })
      next(new UnauthorizedError('Authentication failed'))
    }
  }
}

/**
 * Optional authentication - doesn't fail if no token provided
 */
export function optionalAuthenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided - continue without authentication
      return next()
    }

    const token = authHeader.substring(7)

    if (!token) {
      return next()
    }

    // Try to verify token
    const payload = jwtService.verifyAccessToken(token)

    req.user = {
      userId: payload.userId,
      tenantId: payload.tenantId,
      roleId: payload.roleId,
      email: payload.email,
      jti: payload.jti,
    }

    next()
  } catch (error) {
    // Token invalid - continue without authentication
    logger.debug('Optional authentication failed, continuing without auth', {
      path: req.path,
    })
    next()
  }
}
