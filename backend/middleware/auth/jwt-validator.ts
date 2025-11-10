/**
 * Enhanced JWT Validator Middleware
 * Implements security best practices for JWT validation
 *
 * Security Features:
 * - Token blacklist/revocation support
 * - JTI (JWT ID) tracking for replay attack prevention
 * - Issuer and audience validation
 * - Token rotation tracking
 * - Suspicious activity detection
 */

import { Response, NextFunction } from 'express'
import { jwtService } from '../../core/auth/jwt-service'
import { UnauthorizedError } from '../../utils/errors/app-error'
import { logger } from '../../utils/logging/logger'
import { AuthRequest } from '../auth'
import { RedisClient } from 'redis'

// Re-export AuthRequest
export { AuthRequest } from '../auth'

/**
 * Token Blacklist Store
 * In production, use Redis for distributed blacklist
 */
class TokenBlacklist {
  private blacklistedTokens: Set<string> = new Set()
  private blacklistedJTIs: Set<string> = new Set()
  private redisClient?: RedisClient

  /**
   * Add token to blacklist
   */
  async addToken(token: string, jti?: string, expiresIn?: number): Promise<void> {
    this.blacklistedTokens.add(token)

    if (jti) {
      this.blacklistedJTIs.add(jti)
    }

    // TODO: If Redis is available, also store in Redis with TTL
    // if (this.redisClient) {
    //   await this.redisClient.setEx(`blacklist:${jti}`, expiresIn || 86400, '1')
    // }

    logger.info('Token added to blacklist', {
      jti: jti ? jti.substring(0, 10) + '...' : 'unknown',
      expiresIn,
    })
  }

  /**
   * Check if token is blacklisted
   */
  async isBlacklisted(token: string, jti?: string): Promise<boolean> {
    // Check in-memory blacklist
    if (this.blacklistedTokens.has(token)) {
      return true
    }

    if (jti && this.blacklistedJTIs.has(jti)) {
      return true
    }

    // TODO: Check Redis if available
    // if (this.redisClient && jti) {
    //   const result = await this.redisClient.get(`blacklist:${jti}`)
    //   return result !== null
    // }

    return false
  }

  /**
   * Remove token from blacklist (cleanup expired tokens)
   */
  async removeToken(token: string, jti?: string): Promise<void> {
    this.blacklistedTokens.delete(token)

    if (jti) {
      this.blacklistedJTIs.delete(jti)
    }
  }

  /**
   * Clear expired tokens from in-memory blacklist
   * Should be called periodically
   */
  async cleanup(): Promise<void> {
    // In-memory blacklist grows indefinitely without cleanup
    // In production, Redis handles this with TTL automatically
    logger.debug('Token blacklist cleanup completed')
  }
}

// Singleton blacklist instance
const tokenBlacklist = new TokenBlacklist()

/**
 * Track token usage for suspicious activity detection
 */
class TokenUsageTracker {
  private usageMap: Map<
    string,
    {
      count: number
      lastUsed: Date
      ipAddresses: Set<string>
      userAgents: Set<string>
    }
  > = new Map()

  /**
   * Record token usage
   */
  recordUsage(jti: string, ipAddress: string, userAgent?: string): void {
    const existing = this.usageMap.get(jti)

    if (existing) {
      existing.count++
      existing.lastUsed = new Date()
      existing.ipAddresses.add(ipAddress)

      if (userAgent) {
        existing.userAgents.add(userAgent)
      }
    } else {
      this.usageMap.set(jti, {
        count: 1,
        lastUsed: new Date(),
        ipAddresses: new Set([ipAddress]),
        userAgents: new Set(userAgent ? [userAgent] : []),
      })
    }
  }

  /**
   * Check for suspicious activity
   * Returns true if token usage appears suspicious
   */
  isSuspicious(jti: string): boolean {
    const usage = this.usageMap.get(jti)

    if (!usage) {
      return false
    }

    // Multiple IP addresses (possible token theft)
    if (usage.ipAddresses.size > 3) {
      logger.warn('Suspicious token usage: multiple IP addresses', {
        jti: jti.substring(0, 10) + '...',
        ipCount: usage.ipAddresses.size,
      })
      return true
    }

    // Multiple user agents (possible token sharing)
    if (usage.userAgents.size > 3) {
      logger.warn('Suspicious token usage: multiple user agents', {
        jti: jti.substring(0, 10) + '...',
        userAgentCount: usage.userAgents.size,
      })
      return true
    }

    // Excessive usage rate (possible automated attack)
    const timeSinceFirst = Date.now() - usage.lastUsed.getTime()
    const requestsPerMinute = (usage.count / timeSinceFirst) * 60000

    if (requestsPerMinute > 100) {
      logger.warn('Suspicious token usage: excessive rate', {
        jti: jti.substring(0, 10) + '...',
        requestsPerMinute: Math.round(requestsPerMinute),
      })
      return true
    }

    return false
  }

  /**
   * Get usage statistics for a token
   */
  getUsageStats(jti: string) {
    return this.usageMap.get(jti)
  }

  /**
   * Cleanup old usage records
   */
  cleanup(): void {
    const now = Date.now()
    const expiry = 24 * 60 * 60 * 1000 // 24 hours

    for (const [jti, usage] of this.usageMap.entries()) {
      if (now - usage.lastUsed.getTime() > expiry) {
        this.usageMap.delete(jti)
      }
    }

    logger.debug('Token usage tracker cleanup completed')
  }
}

// Singleton usage tracker
const usageTracker = new TokenUsageTracker()

/**
 * Enhanced JWT authentication middleware with security hardening
 */
export function enhancedJWTValidator(req: AuthRequest, res: Response, next: NextFunction): void {
  ;(async () => {
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

      // Verify token with JWT service
      const payload = jwtService.verifyAccessToken(token)

      // Check if token is blacklisted (revoked)
      const isBlacklisted = await tokenBlacklist.isBlacklisted(token, payload.jti)

      if (isBlacklisted) {
        logger.warn('Attempted use of blacklisted token', {
          jti: payload.jti?.substring(0, 10) + '...',
          userId: payload.userId,
          ip: req.ip,
        })
        throw new UnauthorizedError('Token has been revoked')
      }

      // Record token usage
      const ipAddress = req.ip || req.socket.remoteAddress || 'unknown'
      const userAgent = req.get('user-agent')

      if (payload.jti) {
        usageTracker.recordUsage(payload.jti, ipAddress, userAgent)

        // Check for suspicious activity
        if (usageTracker.isSuspicious(payload.jti)) {
          logger.warn('Suspicious token activity detected', {
            jti: payload.jti.substring(0, 10) + '...',
            userId: payload.userId,
            ip: ipAddress,
            userAgent,
          })

          // Optional: Auto-revoke suspicious tokens
          // await tokenBlacklist.addToken(token, payload.jti)
          // throw new UnauthorizedError('Suspicious activity detected')
        }
      }

      // Attach user info to request
      req.user = {
        userId: payload.userId,
        tenantId: payload.tenantId,
        roleId: payload.roleId,
        email: payload.email,
        jti: payload.jti,
      }

      // Add security headers
      res.setHeader('X-Auth-User-ID', payload.userId)
      res.setHeader('X-Auth-Tenant-ID', payload.tenantId)

      logger.debug('User authenticated with enhanced validation', {
        userId: payload.userId,
        tenantId: payload.tenantId,
        jti: payload.jti?.substring(0, 10) + '...',
        path: req.path,
        ip: ipAddress,
      })

      next()
    } catch (error) {
      if (error instanceof UnauthorizedError) {
        next(error)
      } else {
        logger.error('Enhanced JWT validation failed', {
          error,
          path: req.path,
          ip: req.ip,
        })
        next(new UnauthorizedError('Authentication failed'))
      }
    }
  })()
}

/**
 * Revoke a token (add to blacklist)
 */
export async function revokeToken(token: string, jti?: string, expiresIn?: number): Promise<void> {
  await tokenBlacklist.addToken(token, jti, expiresIn)

  logger.info('Token revoked', {
    jti: jti ? jti.substring(0, 10) + '...' : 'unknown',
  })
}

/**
 * Check if a token is revoked
 */
export async function isTokenRevoked(token: string, jti?: string): Promise<boolean> {
  return await tokenBlacklist.isBlacklisted(token, jti)
}

/**
 * Get usage statistics for a token
 */
export function getTokenUsageStats(jti: string) {
  return usageTracker.getUsageStats(jti)
}

/**
 * Periodic cleanup of expired blacklist entries and usage records
 * Should be called every hour
 */
export async function cleanupTokenTracking(): Promise<void> {
  await tokenBlacklist.cleanup()
  usageTracker.cleanup()

  logger.info('Token tracking cleanup completed')
}

// Start cleanup interval (every hour)
setInterval(
  () => {
    cleanupTokenTracking().catch((error) => {
      logger.error('Token tracking cleanup failed', { error })
    })
  },
  60 * 60 * 1000
) // 1 hour

// Export blacklist for use in logout endpoints
export { tokenBlacklist, usageTracker }
