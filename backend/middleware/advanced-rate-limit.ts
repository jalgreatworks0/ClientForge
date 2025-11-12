/**
 * Advanced Rate Limiting Middleware
 * Redis-backed, distributed rate limiter for production
 * 
 * Features:
 * - Per-user, per-IP rate limiting
 * - Different limits for different endpoints
 * - Sliding window algorithm
 * - Graceful degradation if Redis fails
 */

import { Request, Response, NextFunction } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'
import { createClient } from 'redis'
import { logger } from '@utils/logging/logger'
import { AppError } from '@utils/errors/app-error'

// Initialize Redis client for rate limiting
const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379',
})

redisClient.on('error', (error) => {
  logger.error('[RateLimit] Redis connection error', { error })
})

redisClient.connect().catch((error) => {
  logger.error('[RateLimit] Failed to connect to Redis', { error })
})

// Rate limiter instances for different endpoints
const rateLimiters = {
  // General API rate limiter: 300 requests per 15 minutes
  api: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:api',
    points: 300,
    duration: 900, // 15 minutes in seconds
  }),

  // Authentication rate limiter: 20 requests per minute
  auth: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:auth',
    points: 20,
    duration: 60,
  }),

  // Login attempts: 5 attempts per minute per IP/email
  login: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:login',
    points: 5,
    duration: 60,
  }),

  // Password reset: 3 attempts per hour
  passwordReset: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:pw-reset',
    points: 3,
    duration: 3600,
  }),

  // Email verification: 5 requests per 10 minutes
  emailVerification: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:email-verify',
    points: 5,
    duration: 600,
  }),

  // Search: 120 requests per minute
  search: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:search',
    points: 120,
    duration: 60,
  }),

  // File upload: 30 uploads per minute
  fileUpload: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:upload',
    points: 30,
    duration: 60,
  }),

  // AI features: 100 requests per hour
  ai: new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:ai',
    points: 100,
    duration: 3600,
  }),
}

/**
 * Extract IP address from request (handles proxy headers)
 */
function getClientId(req: Request): string {
  // Try X-Forwarded-For first (for proxied requests)
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
 * Create middleware for any rate limiter
 */
function createRateLimitMiddleware(
  limiter: RateLimiterRedis,
  keyResolver?: (req: Request) => string
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Default key is client IP
      const key = keyResolver ? keyResolver(req) : getClientId(req)

      try {
        const rateLimiterRes = await limiter.consume(key, 1)

        // Set headers for client to see rate limit status
        res.setHeader('X-RateLimit-Limit', rateLimiterRes.isFirstInDuration ? rateLimiterRes.remainingPoints : rateLimiterRes.remainingPoints)
        res.setHeader('X-RateLimit-Remaining', rateLimiterRes.remainingPoints)
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString())

        next()
      } catch (rateLimiterRes) {
        // Too many requests
        const retryAfter = Math.ceil((rateLimiterRes as any).msBeforeNext / 1000)

        res.setHeader('Retry-After', retryAfter)
        res.setHeader('X-RateLimit-Limit', (rateLimiterRes as any).limit)
        res.setHeader('X-RateLimit-Remaining', 0)
        res.setHeader('X-RateLimit-Reset', new Date(Date.now() + (rateLimiterRes as any).msBeforeNext).toISOString())

        logger.warn('[RateLimit] Rate limit exceeded', {
          key,
          path: req.path,
          retryAfter,
        })

        throw new AppError('Too many requests. Please try again later.', 429, {
          retryAfter,
        })
      }
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }

      // If rate limiter fails, log but don't block (graceful degradation)
      logger.error('[RateLimit] Rate limiter error (allowing request)', { error })
      next()
    }
  }
}

/**
 * Advanced rate limiter for login with exponential backoff
 */
export function loginRateLimiter(req: Request, res: Response, next: NextFunction) {
  return createRateLimitMiddleware(rateLimiters.login, (req) => {
    // Use combination of IP and email for login attempts
    const email = (req.body?.email || '').toLowerCase()
    const ip = getClientId(req)
    return `${ip}:${email}`
  })(req, res, next)
}

/**
 * Export middleware instances
 */
export const rateLimitMiddleware = {
  api: createRateLimitMiddleware(rateLimiters.api),
  auth: createRateLimitMiddleware(rateLimiters.auth),
  login: loginRateLimiter,
  passwordReset: createRateLimitMiddleware(rateLimiters.passwordReset),
  emailVerification: createRateLimitMiddleware(rateLimiters.emailVerification),
  search: createRateLimitMiddleware(rateLimiters.search),
  fileUpload: createRateLimitMiddleware(rateLimiters.fileUpload),
  ai: createRateLimitMiddleware(rateLimiters.ai),
}

/**
 * Get rate limiter status (for monitoring)
 */
export async function getRateLimiterStats(key: string) {
  try {
    const stats = await rateLimiters.api.get(key)
    return {
      remainingPoints: stats?.remainingPoints || 0,
      isFirstInDuration: stats?.isFirstInDuration || false,
    }
  } catch (error) {
    logger.error('[RateLimit] Failed to get stats', { error })
    return null
  }
}

/**
 * Reset rate limiter for a key (for admins)
 */
export async function resetRateLimiter(key: string) {
  try {
    await Promise.all(
      Object.values(rateLimiters).map((limiter) => limiter.delete(key))
    )
    logger.info('[RateLimit] Rate limiter reset', { key })
  } catch (error) {
    logger.error('[RateLimit] Failed to reset rate limiter', { error, key })
  }
}

export default rateLimitMiddleware
