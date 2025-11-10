/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */

import crypto from 'crypto'

import { Request, Response, NextFunction } from 'express'

import { ForbiddenError } from '../utils/errors/app-error'
import { logger } from '../utils/logging/logger'

interface CSRFOptions {
  cookieName?: string
  headerName?: string
  cookieOptions?: {
    httpOnly?: boolean
    secure?: boolean
    sameSite?: 'strict' | 'lax' | 'none'
    maxAge?: number
  }
  ignoreMethods?: string[]
  tokenLength?: number
}

/**
 * In-memory token store
 * In production, use Redis for distributed token storage
 */
class CSRFTokenStore {
  private tokens: Map<string, { token: string; expiresAt: number }> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired tokens every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  set(sessionId: string, token: string, expiresInMs: number = 24 * 60 * 60 * 1000): void {
    this.tokens.set(sessionId, {
      token,
      expiresAt: Date.now() + expiresInMs,
    })
  }

  get(sessionId: string): string | null {
    const record = this.tokens.get(sessionId)
    if (!record) {
      return null
    }

    // Check if token expired
    if (Date.now() > record.expiresAt) {
      this.tokens.delete(sessionId)
      return null
    }

    return record.token
  }

  delete(sessionId: string): void {
    this.tokens.delete(sessionId)
  }

  private cleanup(): void {
    const now = Date.now()
    let expiredCount = 0

    for (const [sessionId, record] of this.tokens.entries()) {
      if (now > record.expiresAt) {
        this.tokens.delete(sessionId)
        expiredCount++
      }
    }

    if (expiredCount > 0) {
      logger.debug('CSRF token store cleanup', { expiredCount })
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.tokens.clear()
  }
}

const tokenStore = new CSRFTokenStore()

/**
 * Generate a cryptographically secure random token
 */
function generateToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('base64url')
}

/**
 * Get session ID from request (from user context or generate temporary one)
 */
function getSessionId(req: Request): string {
  // If user is authenticated, use their user ID + tenant ID
  const user = (req as any).user
  if (user?.userId && user?.tenantId) {
    return `${user.userId}:${user.tenantId}`
  }

  // For unauthenticated requests, use IP + user agent
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const userAgent = req.get('user-agent') || 'unknown'
  return crypto.createHash('sha256').update(`${ip}:${userAgent}`).digest('hex')
}

/**
 * CSRF Protection Middleware
 */
export function csrfProtection(options: CSRFOptions = {}) {
  const {
    cookieName = 'XSRF-TOKEN',
    headerName = 'X-XSRF-TOKEN',
    cookieOptions = {
      httpOnly: false, // Must be false so JavaScript can read it
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    tokenLength = 32,
  } = options

  return (req: Request, res: Response, next: NextFunction) => {
    const method = req.method.toUpperCase()

    // Skip CSRF check for safe methods
    if (ignoreMethods.includes(method)) {
      // Generate and set token for all requests
      const sessionId = getSessionId(req)
      let token = tokenStore.get(sessionId)

      if (!token) {
        token = generateToken(tokenLength)
        tokenStore.set(sessionId, token)
      }

      // Set token in cookie so frontend can read it
      res.cookie(cookieName, token, cookieOptions)

      // Also expose token in response header for SPA initialization
      res.setHeader('X-CSRF-Token', token)

      return next()
    }

    // For state-changing methods (POST, PUT, PATCH, DELETE), verify token
    const sessionId = getSessionId(req)
    const expectedToken = tokenStore.get(sessionId)

    if (!expectedToken) {
      logger.warn('CSRF protection: No token found in store', {
        sessionId,
        method,
        path: req.path,
        ip: req.ip,
      })

      return next(
        new ForbiddenError('CSRF token missing. Please refresh the page and try again.')
      )
    }

    // Get token from header or body
    const providedToken = req.get(headerName) || req.body?._csrf

    if (!providedToken) {
      logger.warn('CSRF protection: No token provided in request', {
        sessionId,
        method,
        path: req.path,
        ip: req.ip,
        hasHeaderToken: !!req.get(headerName),
        hasBodyToken: !!req.body?._csrf,
      })

      return next(
        new ForbiddenError('CSRF token missing from request. Please include the token.')
      )
    }

    // Constant-time comparison to prevent timing attacks
    if (!crypto.timingSafeEqual(Buffer.from(expectedToken), Buffer.from(providedToken))) {
      logger.warn('CSRF protection: Token mismatch', {
        sessionId,
        method,
        path: req.path,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })

      return next(new ForbiddenError('CSRF token invalid. Please refresh the page and try again.'))
    }

    // Token is valid, refresh it for next request
    const newToken = generateToken(tokenLength)
    tokenStore.set(sessionId, newToken)
    res.cookie(cookieName, newToken, cookieOptions)
    res.setHeader('X-CSRF-Token', newToken)

    logger.debug('CSRF token validated successfully', {
      sessionId,
      method,
      path: req.path,
    })

    next()
  }
}

/**
 * Generate CSRF token endpoint handler
 * For SPAs that need to fetch token before making state-changing requests
 */
export function getCsrfToken(req: Request, res: Response): void {
  const sessionId = getSessionId(req)
  let token = tokenStore.get(sessionId)

  if (!token) {
    token = generateToken(32)
    tokenStore.set(sessionId, token)
  }

  res.json({
    csrfToken: token,
    expiresIn: 24 * 60 * 60, // 24 hours in seconds
  })
}

/**
 * Invalidate CSRF token (on logout)
 */
export function invalidateCsrfToken(req: Request): void {
  const sessionId = getSessionId(req)
  tokenStore.delete(sessionId)
  logger.debug('CSRF token invalidated', { sessionId })
}

/**
 * Cleanup function to destroy token store
 * Should be called on application shutdown
 */
export function destroyCsrfTokenStore(): void {
  tokenStore.destroy()
}
