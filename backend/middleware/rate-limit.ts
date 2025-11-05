/**
 * Rate Limiting Middleware
 * Protects API endpoints from abuse using Redis-backed rate limiting
 */

import { Request, Response, NextFunction } from 'express'
import { getRedisClient } from '../../config/database/redis-config'
import { TooManyRequestsError } from '../utils/errors/app-error'
import { logger } from '../utils/logging/logger'

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   */
  max: number

  /**
   * Time window in seconds
   */
  windowSeconds: number

  /**
   * Custom key generator function
   * Default: IP address
   */
  keyGenerator?: (req: Request) => string

  /**
   * Custom message when rate limit is exceeded
   */
  message?: string

  /**
   * Skip rate limiting for certain requests
   */
  skip?: (req: Request) => boolean
}

/**
 * Default key generator using IP address
 */
function defaultKeyGenerator(req: Request): string {
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
  return req.socket.remoteAddress || 'unknown'
}

/**
 * Rate limiting middleware factory
 *
 * @param options - Rate limit configuration
 * @returns Express middleware function
 *
 * @example
 * // Limit login attempts to 5 per 15 minutes
 * router.post('/auth/login', rateLimit({ max: 5, windowSeconds: 900 }), login)
 *
 * @example
 * // Limit API calls to 100 per minute
 * app.use('/api', rateLimit({ max: 100, windowSeconds: 60 }))
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    max,
    windowSeconds,
    keyGenerator = defaultKeyGenerator,
    message = 'Too many requests, please try again later',
    skip,
  } = options

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip rate limiting if skip function returns true
      if (skip && skip(req)) {
        return next()
      }

      const redis = await getRedisClient()
      const identifier = keyGenerator(req)
      const key = `rate_limit:${identifier}:${req.path}`

      // Get current request count
      const current = await redis.get(key)
      const count = current ? parseInt(current, 10) : 0

      // Check if rate limit exceeded
      if (count >= max) {
        logger.warn('Rate limit exceeded', {
          identifier,
          path: req.path,
          method: req.method,
          count,
          max,
        })

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', max.toString())
        res.setHeader('X-RateLimit-Remaining', '0')
        res.setHeader('X-RateLimit-Reset', windowSeconds.toString())

        throw new TooManyRequestsError(message)
      }

      // Increment counter
      const newCount = count + 1

      if (count === 0) {
        // First request in window - set with expiry
        await redis.setEx(key, windowSeconds, newCount.toString())
      } else {
        // Subsequent request - increment
        await redis.incr(key)
      }

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString())
      res.setHeader('X-RateLimit-Remaining', (max - newCount).toString())

      // Get TTL for reset time
      const ttl = await redis.ttl(key)
      res.setHeader('X-RateLimit-Reset', ttl.toString())

      logger.debug('Rate limit check passed', {
        identifier,
        path: req.path,
        count: newCount,
        max,
      })

      next()
    } catch (error) {
      // If Redis is down, log error but don't block requests
      if (!(error instanceof TooManyRequestsError)) {
        logger.error('Rate limiting failed', { error, path: req.path })
        // Continue without rate limiting rather than blocking all requests
        return next()
      }

      next(error)
    }
  }
}

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimiters = {
  /**
   * Strict rate limit for authentication endpoints
   * 5 requests per 15 minutes
   */
  auth: rateLimit({
    max: 5,
    windowSeconds: 15 * 60, // 15 minutes
    message: 'Too many authentication attempts, please try again in 15 minutes',
  }),

  /**
   * Standard API rate limit
   * 100 requests per minute
   */
  api: rateLimit({
    max: 100,
    windowSeconds: 60, // 1 minute
  }),

  /**
   * Generous rate limit for general endpoints
   * 1000 requests per hour
   */
  general: rateLimit({
    max: 1000,
    windowSeconds: 60 * 60, // 1 hour
  }),

  /**
   * Strict rate limit for password reset
   * 3 requests per hour
   */
  passwordReset: rateLimit({
    max: 3,
    windowSeconds: 60 * 60, // 1 hour
    message: 'Too many password reset requests, please try again in 1 hour',
  }),

  /**
   * Rate limit for email verification
   * 5 requests per hour
   */
  emailVerification: rateLimit({
    max: 5,
    windowSeconds: 60 * 60, // 1 hour
    message: 'Too many verification requests, please try again in 1 hour',
  }),
}
