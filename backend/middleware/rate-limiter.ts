/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse and brute force attacks
 */

import { Request, Response, NextFunction } from 'express'

import { logger } from '../utils/logging/logger'
import { TooManyRequestsError } from '../utils/errors/app-error'

interface RateLimitStore {
  [key: string]: {
    count: number
    resetTime: number
  }
}

interface RateLimitOptions {
  windowMs: number // Time window in milliseconds
  max: number // Max requests per window
  message?: string
  statusCode?: number
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
  keyGenerator?: (req: Request) => string
}

/**
 * In-memory rate limit store
 * In production, use Redis for distributed rate limiting
 */
class RateLimitMemoryStore {
  private store: RateLimitStore = {}
  private resetInterval: NodeJS.Timeout

  constructor(private windowMs: number) {
    // Clean up expired entries every minute
    this.resetInterval = setInterval(() => {
      this.cleanup()
    }, 60000)
  }

  increment(key: string): number {
    const now = Date.now()
    const record = this.store[key]

    if (!record || now > record.resetTime) {
      this.store[key] = {
        count: 1,
        resetTime: now + this.windowMs,
      }
      return 1
    }

    record.count++
    return record.count
  }

  decrement(key: string): void {
    const record = this.store[key]
    if (record && record.count > 0) {
      record.count--
    }
  }

  resetKey(key: string): void {
    delete this.store[key]
  }

  getResetTime(key: string): number {
    const record = this.store[key]
    return record ? record.resetTime : Date.now() + this.windowMs
  }

  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const key in this.store) {
      if (this.store[key].resetTime < now) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach((key) => delete this.store[key])

    if (keysToDelete.length > 0) {
      logger.debug('Rate limit store cleanup', {
        expiredKeys: keysToDelete.length,
      })
    }
  }

  destroy(): void {
    clearInterval(this.resetInterval)
    this.store = {}
  }
}

/**
 * Create a rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    max,
    message = 'Too many requests, please try again later',
    statusCode = 429,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    keyGenerator = (req: Request) => {
      // Default: IP address + tenantId (if available)
      const ip = req.ip || req.socket?.remoteAddress || 'unknown'
      const tenantId = (req as any).user?.tenantId || 'anonymous'
      return `${ip}:${tenantId}`
    },
  } = options

  const store = new RateLimitMemoryStore(windowMs)

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req)
    const current = store.increment(key)
    const resetTime = store.getResetTime(key)

    // Add rate limit headers
    res.setHeader('X-RateLimit-Limit', max.toString())
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current).toString())
    res.setHeader('X-RateLimit-Reset', new Date(resetTime).toISOString())

    if (current > max) {
      logger.warn('Rate limit exceeded', {
        key,
        current,
        max,
        endpoint: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })

      // Add Retry-After header
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)
      res.setHeader('Retry-After', retryAfter.toString())

      return next(
        new TooManyRequestsError(message, {
          retryAfter,
          limit: max,
          windowMs,
        })
      )
    }

    // If configured, decrement count for successful/failed requests
    if (skipSuccessfulRequests || skipFailedRequests) {
      const originalSend = res.send

      res.send = function (body?: any): Response {
        const statusCode = res.statusCode

        if (
          (skipSuccessfulRequests && statusCode < 400) ||
          (skipFailedRequests && statusCode >= 400)
        ) {
          store.decrement(key)
        }

        return originalSend.call(this, body)
      }
    }

    next()
  }
}

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 minutes
  message: 'Too many login attempts, please try again after 15 minutes',
  skipSuccessfulRequests: true, // Don't count successful logins
})

/**
 * Standard rate limiter for general API endpoints
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: 'Too many requests, please slow down',
})

/**
 * Strict rate limiter for sensitive operations
 */
export const sensitiveRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: 'Too many requests for this operation, please try again later',
})

/**
 * Per-user rate limiter (requires authentication)
 */
export const perUserRateLimiter = createRateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per user per minute
  keyGenerator: (req: Request) => {
    const userId = (req as any).user?.userId || 'anonymous'
    return `user:${userId}`
  },
})

/**
 * Email sending rate limiter
 */
export const emailRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 emails per hour
  message: 'Too many emails sent, please try again later',
  keyGenerator: (req: Request) => {
    const email = req.body?.email || 'unknown'
    return `email:${email}`
  },
})

/**
 * Password reset rate limiter
 */
export const passwordResetRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 password reset requests per hour
  message: 'Too many password reset attempts, please try again after 1 hour',
  keyGenerator: (req: Request) => {
    const email = req.body?.email || 'unknown'
    return `password-reset:${email}`
  },
})
