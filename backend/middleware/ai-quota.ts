/**
 * AI Quota Middleware
 * Enforce subscription-based AI quotas and feature access
 */

import { Response, NextFunction } from 'express'

import { aiUsageRepository } from '../services/ai/ai-usage-repository'
import { isFeatureAvailable } from '../services/ai/ai-config'
import type { AIFeatureType, SubscriptionPlan } from '../services/ai/ai-types'

import { AuthRequest } from './auth'

// =====================================================
// QUOTA CHECK MIDDLEWARE
// =====================================================

/**
 * Middleware to check if tenant has available AI quota
 */
export async function checkAIQuota(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId

    // Get subscription quota
    const quota = await aiUsageRepository.getSubscriptionQuota(tenantId)

    // Check if subscription is active
    if (quota.status !== 'active') {
      res.status(403).json({
        success: false,
        error: {
          code: 'SUBSCRIPTION_INACTIVE',
          message: `Your subscription is ${quota.status}. Please contact support.`,
          upgradeUrl: '/billing/reactivate',
        },
      })
      return
    }

    // Starter plan has no AI access
    if (quota.plan === 'starter') {
      res.status(403).json({
        success: false,
        error: {
          code: 'AI_NOT_AVAILABLE',
          message: 'AI features are not available on the Starter plan',
          upgradeUrl: '/billing/upgrade',
          availablePlans: ['professional', 'business', 'enterprise'],
        },
      })
      return
    }

    // Check quota (Enterprise has unlimited = -1)
    if (quota.aiQuotaMonthly !== -1 && quota.aiQuotaUsed >= quota.aiQuotaMonthly) {
      res.status(429).json({
        success: false,
        error: {
          code: 'QUOTA_EXCEEDED',
          message: 'Monthly AI quota exceeded',
          quota: {
            monthly: quota.aiQuotaMonthly,
            used: quota.aiQuotaUsed,
            remaining: 0,
          },
          upgradeUrl: '/billing/upgrade',
          resetDate: quota.billingPeriodEnd,
        },
      })
      return
    }

    // Attach quota info to request for controllers to use
    req.aiQuota = quota

    next()
  } catch (error) {
    console.error('AI Quota Check Error:', error)
    res.status(500).json({
      success: false,
      error: {
        code: 'QUOTA_CHECK_FAILED',
        message: 'Failed to check AI quota',
      },
    })
  }
}

// =====================================================
// FEATURE ACCESS MIDDLEWARE
// =====================================================

/**
 * Middleware factory to check if a specific AI feature is available
 */
export function checkAIFeature(feature: AIFeatureType) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = req.user!.tenantId

      // Get subscription quota
      const quota = await aiUsageRepository.getSubscriptionQuota(tenantId)

      // Check if feature is available for this plan
      if (!isFeatureAvailable(feature, quota.plan as SubscriptionPlan)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FEATURE_NOT_AVAILABLE',
            message: `The ${feature} feature is not available on the ${quota.plan} plan`,
            feature,
            currentPlan: quota.plan,
            upgradeUrl: '/billing/upgrade',
            requiredPlans: getRequiredPlans(feature),
          },
        })
        return
      }

      next()
    } catch (error) {
      console.error('AI Feature Check Error:', error)
      res.status(500).json({
        success: false,
        error: {
          code: 'FEATURE_CHECK_FAILED',
          message: 'Failed to check feature availability',
        },
      })
    }
  }
}

// =====================================================
// RATE LIMITING
// =====================================================

/**
 * Simple in-memory rate limiter for AI requests
 * (In production, use Redis for distributed rate limiting)
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private readonly windowMs: number

  constructor(windowMs: number = 60000) {
    this.windowMs = windowMs
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string, maxRequests: number): boolean {
    const now = Date.now()
    const windowStart = now - this.windowMs

    // Get existing requests
    let requests = this.requests.get(key) || []

    // Filter out old requests
    requests = requests.filter((timestamp) => timestamp > windowStart)

    // Check if under limit
    if (requests.length >= maxRequests) {
      return false
    }

    // Add current request
    requests.push(now)
    this.requests.set(key, requests)

    return true
  }

  /**
   * Get remaining requests in window
   */
  getRemaining(key: string, maxRequests: number): number {
    const now = Date.now()
    const windowStart = now - this.windowMs

    const requests = this.requests.get(key) || []
    const validRequests = requests.filter((timestamp) => timestamp > windowStart)

    return Math.max(0, maxRequests - validRequests.length)
  }

  /**
   * Clear old entries (call periodically)
   */
  cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.windowMs

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter((timestamp) => timestamp > windowStart)
      if (validRequests.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validRequests)
      }
    }
  }
}

// Create rate limiter instances
const perMinuteLimiter = new RateLimiter(60000) // 1 minute
const perHourLimiter = new RateLimiter(3600000) // 1 hour

// Cleanup old entries every 5 minutes
setInterval(() => {
  perMinuteLimiter.cleanup()
  perHourLimiter.cleanup()
}, 300000)

/**
 * AI rate limiting middleware
 */
export async function checkAIRateLimit(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const tenantId = req.user!.tenantId

    // Get subscription quota for rate limits
    const quota = await aiUsageRepository.getSubscriptionQuota(tenantId)

    // Define rate limits by plan
    const rateLimits: Record<
      SubscriptionPlan,
      { perMinute: number; perHour: number }
    > = {
      starter: { perMinute: 0, perHour: 0 },
      professional: { perMinute: 10, perHour: 100 },
      business: { perMinute: 30, perHour: 500 },
      enterprise: { perMinute: 100, perHour: 2000 },
    }

    const limits = rateLimits[quota.plan as SubscriptionPlan]

    // Check per-minute limit
    if (!perMinuteLimiter.isAllowed(`${tenantId}:minute`, limits.perMinute)) {
      const remaining = perMinuteLimiter.getRemaining(`${tenantId}:minute`, limits.perMinute)

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many AI requests per minute',
          limits: {
            perMinute: limits.perMinute,
            perHour: limits.perHour,
          },
          remaining,
          retryAfter: 60,
        },
      })
      return
    }

    // Check per-hour limit
    if (!perHourLimiter.isAllowed(`${tenantId}:hour`, limits.perHour)) {
      const remaining = perHourLimiter.getRemaining(`${tenantId}:hour`, limits.perHour)

      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many AI requests per hour',
          limits: {
            perMinute: limits.perMinute,
            perHour: limits.perHour,
          },
          remaining,
          retryAfter: 3600,
        },
      })
      return
    }

    next()
  } catch (error) {
    console.error('AI Rate Limit Check Error:', error)
    next() // Don't block request on rate limit check failure
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Get required plans for a feature
 */
function getRequiredPlans(feature: AIFeatureType): SubscriptionPlan[] {
  const plans: SubscriptionPlan[] = []

  if (isFeatureAvailable(feature, 'professional' as SubscriptionPlan)) {
    plans.push('professional' as SubscriptionPlan)
  }
  if (isFeatureAvailable(feature, 'business' as SubscriptionPlan)) {
    plans.push('business' as SubscriptionPlan)
  }
  if (isFeatureAvailable(feature, 'enterprise' as SubscriptionPlan)) {
    plans.push('enterprise' as SubscriptionPlan)
  }

  return plans
}

// =====================================================
// TYPE AUGMENTATION
// =====================================================

declare module './auth' {
  interface AuthRequest {
    aiQuota?: import('../services/ai/ai-types').SubscriptionQuota
  }
}
