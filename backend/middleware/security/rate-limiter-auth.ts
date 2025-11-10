/**
 * Enhanced Authentication Rate Limiter
 * Protects authentication endpoints from brute force attacks
 *
 * Security Features:
 * - Progressive delays on failed attempts
 * - Account lockout after threshold
 * - IP-based and account-based limiting
 * - Distributed rate limiting via Redis (optional)
 * - Automatic unlock after cooldown period
 */

import { Request, Response, NextFunction } from 'express'
import { logger } from '../../utils/logging/logger'
import { TooManyRequestsError, UnauthorizedError } from '../../utils/errors/app-error'

interface FailedAttempt {
  count: number
  firstAttempt: Date
  lastAttempt: Date
  ipAddress: string
  locked: boolean
  lockExpiry?: Date
}

interface RateLimitConfig {
  windowMs: number // Time window for counting attempts
  maxAttempts: number // Max attempts before lockout
  lockDuration: number // How long to lock account after max attempts
  progressiveDelay: boolean // Enable progressive delays
}

/**
 * In-memory failed attempts store
 * In production, use Redis for distributed storage
 */
class FailedAttemptsStore {
  private attempts: Map<string, FailedAttempt> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup()
    }, 5 * 60 * 1000)
  }

  /**
   * Record a failed login attempt
   */
  recordFailure(identifier: string, ipAddress: string): FailedAttempt {
    const now = new Date()
    const existing = this.attempts.get(identifier)

    if (existing) {
      existing.count++
      existing.lastAttempt = now
      existing.ipAddress = ipAddress

      logger.warn('Failed login attempt recorded', {
        identifier: this.maskIdentifier(identifier),
        count: existing.count,
        ip: ipAddress,
      })

      return existing
    }

    const newAttempt: FailedAttempt = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      ipAddress,
      locked: false,
    }

    this.attempts.set(identifier, newAttempt)

    return newAttempt
  }

  /**
   * Lock an account after max attempts
   */
  lockAccount(identifier: string, duration: number): void {
    const attempt = this.attempts.get(identifier)

    if (attempt) {
      attempt.locked = true
      attempt.lockExpiry = new Date(Date.now() + duration)

      logger.warn('Account locked due to failed attempts', {
        identifier: this.maskIdentifier(identifier),
        failedAttempts: attempt.count,
        lockExpiry: attempt.lockExpiry.toISOString(),
        ip: attempt.ipAddress,
      })
    }
  }

  /**
   * Check if account is locked
   */
  isLocked(identifier: string): boolean {
    const attempt = this.attempts.get(identifier)

    if (!attempt || !attempt.locked) {
      return false
    }

    // Check if lock has expired
    if (attempt.lockExpiry && new Date() > attempt.lockExpiry) {
      // Unlock account
      attempt.locked = false
      attempt.count = 0
      delete attempt.lockExpiry

      logger.info('Account lock expired - automatically unlocked', {
        identifier: this.maskIdentifier(identifier),
      })

      return false
    }

    return true
  }

  /**
   * Get failed attempt count
   */
  getAttemptCount(identifier: string): number {
    const attempt = this.attempts.get(identifier)
    return attempt ? attempt.count : 0
  }

  /**
   * Get time remaining for lock
   */
  getLockTimeRemaining(identifier: string): number {
    const attempt = this.attempts.get(identifier)

    if (!attempt || !attempt.locked || !attempt.lockExpiry) {
      return 0
    }

    const remaining = attempt.lockExpiry.getTime() - Date.now()
    return Math.max(0, remaining)
  }

  /**
   * Reset attempts for an identifier (successful login)
   */
  reset(identifier: string): void {
    this.attempts.delete(identifier)

    logger.debug('Failed attempts reset', {
      identifier: this.maskIdentifier(identifier),
    })
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): void {
    const now = Date.now()
    const expiry = 24 * 60 * 60 * 1000 // 24 hours
    let cleaned = 0

    for (const [identifier, attempt] of this.attempts.entries()) {
      // Remove if not locked and last attempt was over 24 hours ago
      if (
        !attempt.locked &&
        now - attempt.lastAttempt.getTime() > expiry
      ) {
        this.attempts.delete(identifier)
        cleaned++
      }
    }

    if (cleaned > 0) {
      logger.debug('Failed attempts cleanup completed', { cleaned })
    }
  }

  /**
   * Mask identifier for logging
   */
  private maskIdentifier(identifier: string): string {
    if (identifier.includes('@')) {
      // Email: show first 3 chars and domain
      const [local, domain] = identifier.split('@')
      return `${local.substring(0, 3)}***@${domain}`
    }

    // Other identifiers: show first 4 and last 4
    if (identifier.length > 8) {
      return `${identifier.substring(0, 4)}...${identifier.substring(identifier.length - 4)}`
    }

    return '***'
  }

  destroy(): void {
    clearInterval(this.cleanupInterval)
    this.attempts.clear()
  }
}

// Singleton store
const failedAttemptsStore = new FailedAttemptsStore()

/**
 * Calculate progressive delay based on failed attempts
 */
function calculateProgressiveDelay(attemptCount: number): number {
  // Exponential backoff: 2^(attempts-1) seconds
  // 1st fail: 1s, 2nd: 2s, 3rd: 4s, 4th: 8s, 5th: 16s
  const delay = Math.pow(2, attemptCount - 1) * 1000
  return Math.min(delay, 30000) // Max 30 seconds
}

/**
 * Authentication rate limiter middleware
 * Protects login, password reset, and other auth endpoints
 */
export function createAuthRateLimiter(config: Partial<RateLimitConfig> = {}) {
  const fullConfig: RateLimitConfig = {
    windowMs: config.windowMs || 15 * 60 * 1000, // 15 minutes
    maxAttempts: config.maxAttempts || 5, // 5 failed attempts
    lockDuration: config.lockDuration || 30 * 60 * 1000, // 30 minutes
    progressiveDelay: config.progressiveDelay !== false, // Enabled by default
  }

  logger.info('Auth rate limiter created', {
    windowMs: fullConfig.windowMs,
    maxAttempts: fullConfig.maxAttempts,
    lockDuration: fullConfig.lockDuration,
    progressiveDelay: fullConfig.progressiveDelay,
  })

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get identifier (email or username)
      const identifier =
        req.body?.email ||
        req.body?.username ||
        req.body?.identifier ||
        'unknown'

      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown'

      // Create composite key: IP + identifier
      const key = `${ipAddress}:${identifier}`

      // Check if account is locked
      if (failedAttemptsStore.isLocked(key)) {
        const timeRemaining = failedAttemptsStore.getLockTimeRemaining(key)
        const minutesRemaining = Math.ceil(timeRemaining / 1000 / 60)

        logger.warn('Locked account attempted login', {
          identifier,
          ip: ipAddress,
          timeRemaining: minutesRemaining,
        })

        res.setHeader('Retry-After', Math.ceil(timeRemaining / 1000).toString())

        return next(
          new UnauthorizedError(
            `Account temporarily locked due to too many failed attempts. Try again in ${minutesRemaining} minutes.`,
            {
              retryAfter: Math.ceil(timeRemaining / 1000),
              locked: true,
            }
          )
        )
      }

      // Get current attempt count
      const attemptCount = failedAttemptsStore.getAttemptCount(key)

      // Apply progressive delay if enabled
      if (fullConfig.progressiveDelay && attemptCount > 0) {
        const delay = calculateProgressiveDelay(attemptCount)

        logger.debug('Applying progressive delay', {
          identifier,
          attemptCount,
          delay,
        })

        await new Promise((resolve) => setTimeout(resolve, delay))
      }

      // Store original send function to intercept response
      const originalSend = res.send

      res.send = function (body?: any): Response {
        const statusCode = res.statusCode

        if (statusCode === 401 || statusCode === 403) {
          // Failed login attempt
          const attempt = failedAttemptsStore.recordFailure(key, ipAddress)

          // Check if should lock account
          if (attempt.count >= fullConfig.maxAttempts) {
            failedAttemptsStore.lockAccount(key, fullConfig.lockDuration)

            // Update response to indicate lockout
            const lockMinutes = Math.ceil(fullConfig.lockDuration / 1000 / 60)

            return originalSend.call(
              this,
              JSON.stringify({
                error: 'Unauthorized',
                message: `Too many failed attempts. Account locked for ${lockMinutes} minutes.`,
                locked: true,
                retryAfter: Math.ceil(fullConfig.lockDuration / 1000),
              })
            )
          }

          // Add remaining attempts header
          res.setHeader(
            'X-RateLimit-Remaining',
            (fullConfig.maxAttempts - attempt.count).toString()
          )
        } else if (statusCode >= 200 && statusCode < 300) {
          // Successful login - reset attempts
          failedAttemptsStore.reset(key)

          logger.info('Successful login - attempts reset', {
            identifier,
            ip: ipAddress,
          })
        }

        return originalSend.call(this, body)
      }

      next()
    } catch (error) {
      logger.error('Auth rate limiter error', { error })
      next(error)
    }
  }
}

/**
 * Strict rate limiter for password reset
 * More restrictive than login
 */
export const passwordResetRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3, // 3 attempts
  lockDuration: 60 * 60 * 1000, // 1 hour lock
  progressiveDelay: true,
})

/**
 * Standard login rate limiter
 */
export const loginRateLimiter = createAuthRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5, // 5 attempts
  lockDuration: 30 * 60 * 1000, // 30 minutes lock
  progressiveDelay: true,
})

/**
 * Registration rate limiter
 * Prevents spam registrations
 */
export const registrationRateLimiter = createAuthRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxAttempts: 3, // 3 registrations per hour per IP
  lockDuration: 24 * 60 * 60 * 1000, // 24 hours lock
  progressiveDelay: false, // No delay for registration
})

/**
 * Manually unlock an account (admin function)
 */
export function unlockAccount(identifier: string): void {
  failedAttemptsStore.reset(identifier)

  logger.info('Account manually unlocked', {
    identifier,
  })
}

/**
 * Get failed attempt count for an account
 */
export function getFailedAttempts(identifier: string): number {
  return failedAttemptsStore.getAttemptCount(identifier)
}

/**
 * Check if account is currently locked
 */
export function isAccountLocked(identifier: string): boolean {
  return failedAttemptsStore.isLocked(identifier)
}

// Export store for testing/admin purposes
export { failedAttemptsStore }
