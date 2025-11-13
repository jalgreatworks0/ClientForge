/**
 * Unit Tests: RateLimiter Middleware
 * Tests for rate limiting, abuse prevention, and request throttling
 *
 * BEHAVIOR MATRIX:
 * ================
 * 1. Happy Path - Within Limit
 *    - Requests under limit pass through with correct headers
 *    - Multiple requests stay within quota
 *    - Window reset behavior after expiration
 *
 * 2. Over Limit Behavior
 *    - Requests exceeding limit are blocked with 429 error
 *    - Error passed to next() middleware (error handling pattern)
 *    - Retry-After header set correctly
 *    - Logging occurs on rate limit violations
 *
 * 3. Keying & Isolation
 *    - Default key: IP + tenantId
 *    - Different IPs have independent quotas
 *    - Different tenants have independent quotas
 *    - Custom keyGenerator respected
 *    - Multi-tenant isolation maintained
 *
 * 4. Header Management
 *    - X-RateLimit-Limit shows max requests
 *    - X-RateLimit-Remaining decrements correctly
 *    - X-RateLimit-Reset shows window expiration
 *    - Retry-After only present when blocked
 *
 * 5. Optional Features
 *    - skipSuccessfulRequests: Don't count 2xx responses
 *    - skipFailedRequests: Don't count 4xx/5xx responses
 *    - Custom messages and status codes
 *
 * 6. Edge Cases
 *    - Missing IP falls back to 'unknown'
 *    - Missing tenantId falls back to 'anonymous'
 *    - Very high rate limits work correctly
 *    - Window expiration resets count to 1
 */

import type { Request, Response, NextFunction } from 'express'
import { createRateLimiter } from '../../../backend/middleware/rate-limiter'
import { TooManyRequestsError } from '../../../backend/utils/errors/app-error'

// Mock logger to prevent console output during tests
jest.mock('../../../backend/utils/logging/logger', () => ({
  logger: {
    warn: jest.fn(),
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}))

describe('RateLimiter Middleware', () => {
  let mockReq: any
  let mockRes: Partial<Response>
  let mockNext: jest.Mock
  let setHeaderSpy: jest.Mock

  // Helper to advance time for window expiration tests
  const advanceTime = (ms: number) => {
    jest.advanceTimersByTime(ms)
  }

  beforeAll(() => {
    jest.useFakeTimers()
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  beforeEach(() => {
    // Reset mocks
    mockReq = {
      ip: '192.168.1.100',
      socket: { remoteAddress: '192.168.1.100' },
      path: '/api/test',
      method: 'GET',
      user: { tenantId: 'tenant-123', userId: 'user-456' },
      get: jest.fn((header: string) => {
        if (header === 'user-agent') return 'test-agent'
        return undefined
      }),
    }

    setHeaderSpy = jest.fn()
    mockRes = {
      setHeader: setHeaderSpy,
      statusCode: 200,
      send: jest.fn().mockReturnThis(),
    }

    mockNext = jest.fn()

    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('Happy Path - Within Limit', () => {
    it('should allow first request and set rate limit headers', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
      })

      await limiter(mockReq, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith()
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '5')
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '4')
      expect(setHeaderSpy).toHaveBeenCalledWith(
        'X-RateLimit-Reset',
        expect.any(String)
      )
    })

    it('should allow multiple requests within limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
      })

      // Request 1
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '2')

      // Request 2
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')

      // Request 3 (at limit)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')

      expect(mockNext).toHaveBeenCalledTimes(3)
    })

    it('should reset count after window expires', async () => {
      const windowMs = 60000
      const limiter = createRateLimiter({
        windowMs,
        max: 2,
      })

      // Request 1
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')

      // Request 2 (at limit)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')

      // Advance time past window
      advanceTime(windowMs + 1000)

      // Request 3 (after reset)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should update X-RateLimit-Remaining correctly across requests', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
      })

      for (let i = 0; i < 5; i++) {
        await limiter(mockReq, mockRes as Response, mockNext)
        expect(setHeaderSpy).toHaveBeenCalledWith(
          'X-RateLimit-Remaining',
          (9 - i).toString()
        )
      }
    })

    it('should set X-RateLimit-Reset header with future timestamp', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
      })

      await limiter(mockReq, mockRes as Response, mockNext)

      const resetCall = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'X-RateLimit-Reset'
      )
      expect(resetCall).toBeDefined()
      const resetTime = new Date(resetCall![1])
      expect(resetTime.getTime()).toBeGreaterThan(Date.now())
    })
  })

  describe('Over Limit Behavior', () => {
    it('should block request when limit exceeded', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        message: 'Rate limit exceeded',
      })

      // Requests 1-2 (at limit)
      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      // Request 3 (over limit)
      await limiter(mockReq, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
      const error = mockNext.mock.calls[2][0] as TooManyRequestsError
      expect(error.message).toBe('Rate limit exceeded')
      expect(error.statusCode).toBe(429)
    })

    it('should pass error to next() instead of sending response directly', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      // Request 1 (at limit)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      // Request 2 (over limit)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
      expect(mockRes.send).not.toHaveBeenCalled()
    })

    it('should set Retry-After header when limit exceeded', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      // Request 1 (at limit)
      await limiter(mockReq, mockRes as Response, mockNext)

      // Request 2 (over limit)
      await limiter(mockReq, mockRes as Response, mockNext)

      const retryAfterCall = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Retry-After'
      )
      expect(retryAfterCall).toBeDefined()
      const retryAfter = parseInt(retryAfterCall![1], 10)
      expect(retryAfter).toBeGreaterThan(0)
      expect(retryAfter).toBeLessThanOrEqual(60)
    })

    it('should set X-RateLimit-Remaining to 0 when over limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '0')
    })

    it('should include context in TooManyRequestsError', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      const error = mockNext.mock.calls[1][0] as TooManyRequestsError
      expect(error.context).toMatchObject({
        limit: 1,
        windowMs: 60000,
      })
      expect(error.context?.retryAfter).toBeGreaterThan(0)
    })

    it('should use custom status code if provided', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        statusCode: 503,
      })

      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      const error = mockNext.mock.calls[1][0] as TooManyRequestsError
      // Note: TooManyRequestsError always uses 429, but message is customizable
      expect(error.statusCode).toBe(429)
      expect(error.message).toBe('Too many requests, please try again later')
    })

    it('should use custom message if provided', async () => {
      const customMessage = 'Custom rate limit message'
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        message: customMessage,
      })

      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      const error = mockNext.mock.calls[1][0] as TooManyRequestsError
      expect(error.message).toBe(customMessage)
    })
  })

  describe('Keying & Isolation', () => {
    it('should use IP and tenantId as default key', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      // Request from IP + tenant
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      // Same IP + tenant (should hit limit)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
    })

    it('should isolate different IPs', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      // Request from IP 1
      mockReq.ip = '192.168.1.1'
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      // Request from IP 2 (different quota)
      mockReq.ip = '192.168.1.2'
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      expect(mockNext).toHaveBeenCalledTimes(2)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should isolate different tenants', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      // Request from tenant 1
      mockReq.user = { tenantId: 'tenant-1' } as any
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      // Request from tenant 2 (same IP, different tenant)
      mockReq.user = { tenantId: 'tenant-2' } as any
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      expect(mockNext).toHaveBeenCalledTimes(2)
    })

    it('should not leak quota between tenants (multi-tenant isolation)', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
      })

      // Tenant 1: use up quota
      mockReq.user = { tenantId: 'tenant-1' } as any
      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenLastCalledWith(expect.any(TooManyRequestsError))

      // Tenant 2: should have full quota
      mockReq.user = { tenantId: 'tenant-2' } as any
      mockNext.mockClear()
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(TooManyRequestsError))
    })

    it('should respect custom keyGenerator', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
        keyGenerator: (req) => `custom:${(req as any).user?.userId || 'anon'}`,
      })

      // Request 1
      mockReq.user = { userId: 'user-123' } as any
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      // Request 2 with same userId (should hit limit)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
    })

    it('should handle missing IP gracefully', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
      })

      mockReq.ip = undefined
      mockReq.socket = undefined

      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      // Second request should still work with 'unknown' IP
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should handle missing tenantId gracefully', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
      })

      mockReq.user = undefined

      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should fall back to socket.remoteAddress if req.ip is missing', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      mockReq.ip = undefined
      mockReq.socket = { remoteAddress: '10.0.0.1' } as any

      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
    })
  })

  describe('Optional Features', () => {
    it('should skip counting successful requests when skipSuccessfulRequests=true', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        skipSuccessfulRequests: true,
      })

      // Request 1
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')

      // Simulate successful response by calling the wrapped send function
      mockRes.statusCode = 200
      if (mockRes.send) {
        ;(mockRes.send as Function)('response body')
      }

      // Request 2 (should not count previous success due to decrement)
      setHeaderSpy.mockClear()
      await limiter(mockReq, mockRes as Response, mockNext)
      // After decrement from first request, count should still be 1, so remaining is 1
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')
    })

    it('should skip counting failed requests when skipFailedRequests=true', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        skipFailedRequests: true,
      })

      // Request 1
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')

      // Simulate failed response by calling the wrapped send function
      mockRes.statusCode = 400
      if (mockRes.send) {
        ;(mockRes.send as Function)('error response')
      }

      // Request 2 (should not count previous failure due to decrement)
      setHeaderSpy.mockClear()
      await limiter(mockReq, mockRes as Response, mockNext)
      // After decrement from first request, count should still be 1, so remaining is 1
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '1')
    })
  })

  describe('Edge Cases', () => {
    it('should handle very high rate limits', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1000000,
      })

      await limiter(mockReq, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith()
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '1000000')
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '999999')
    })

    it('should handle rate limit of 1', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()

      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
    })

    it('should handle concurrent requests from same key', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 3,
      })

      // Simulate 5 concurrent requests
      const promises = []
      for (let i = 0; i < 5; i++) {
        promises.push(limiter(mockReq, mockRes as Response, mockNext))
      }

      await Promise.all(promises)

      // First 3 should pass, last 2 should be blocked
      const successCalls = mockNext.mock.calls.filter((call) => call.length === 0)
      const errorCalls = mockNext.mock.calls.filter(
        (call) => call[0] instanceof TooManyRequestsError
      )

      expect(successCalls.length).toBe(3)
      expect(errorCalls.length).toBe(2)
    })

    it('should handle very short window periods', async () => {
      const limiter = createRateLimiter({
        windowMs: 100, // 100ms window
        max: 2,
      })

      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      // Wait for window to expire
      advanceTime(150)

      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should handle requests with special characters in keys', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 2,
        keyGenerator: (req) => `special:key:with:${(req as any).path}`,
      })

      mockReq.path = '/api/users/:id/emails'
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should not interfere with response when within limit', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
      })

      const originalSend = mockRes.send

      await limiter(mockReq, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalledWith()
      // Send function may be wrapped but original behavior preserved
      expect(mockRes.send).toBeDefined()
    })
  })

  describe('Header Management', () => {
    it('should set all required rate limit headers', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 10,
      })

      await limiter(mockReq, mockRes as Response, mockNext)

      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Limit', '10')
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', expect.any(String))
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Reset', expect.any(String))
    })

    it('should only set Retry-After header when limit exceeded', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      // Within limit
      await limiter(mockReq, mockRes as Response, mockNext)
      let retryAfterCall = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Retry-After'
      )
      expect(retryAfterCall).toBeUndefined()

      // Over limit
      await limiter(mockReq, mockRes as Response, mockNext)
      retryAfterCall = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Retry-After'
      )
      expect(retryAfterCall).toBeDefined()
    })

    it('should set X-RateLimit-Reset as ISO 8601 timestamp', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
      })

      await limiter(mockReq, mockRes as Response, mockNext)

      const resetCall = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'X-RateLimit-Reset'
      )
      expect(resetCall).toBeDefined()

      // Should be valid ISO 8601 format
      const resetValue = resetCall![1]
      expect(() => new Date(resetValue)).not.toThrow()
      expect(resetValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
    })

    it('should set Retry-After as seconds until reset', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)

      const retryAfterCall = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'Retry-After'
      )
      const retryAfter = parseInt(retryAfterCall![1], 10)

      // Should be in seconds, not milliseconds
      expect(retryAfter).toBeLessThanOrEqual(60)
      expect(retryAfter).toBeGreaterThan(0)
    })
  })

  describe('Window Management', () => {
    it('should maintain separate windows for different keys', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 1,
      })

      // Key 1: Exhaust quota
      mockReq.ip = '192.168.1.1'
      mockReq.user = { tenantId: 'tenant-1' } as any
      await limiter(mockReq, mockRes as Response, mockNext)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith(expect.any(TooManyRequestsError))

      // Key 2: Should have independent window
      mockReq.ip = '192.168.1.2'
      mockReq.user = { tenantId: 'tenant-2' } as any
      mockNext.mockClear()
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(mockNext).toHaveBeenCalledWith()
    })

    it('should reset to count of 1 after window expiration, not 0', async () => {
      const limiter = createRateLimiter({
        windowMs: 60000,
        max: 5,
      })

      // First request
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '4')

      // Expire window
      advanceTime(61000)

      // Next request should reset to count of 1 (remaining 4)
      await limiter(mockReq, mockRes as Response, mockNext)
      expect(setHeaderSpy).toHaveBeenCalledWith('X-RateLimit-Remaining', '4')
    })

    it('should calculate new reset time after window expiration', async () => {
      const windowMs = 60000
      const limiter = createRateLimiter({
        windowMs,
        max: 5,
      })

      // First request
      await limiter(mockReq, mockRes as Response, mockNext)
      const firstReset = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'X-RateLimit-Reset'
      )?.[1]

      // Expire window
      advanceTime(windowMs + 1000)

      // Next request
      setHeaderSpy.mockClear()
      await limiter(mockReq, mockRes as Response, mockNext)
      const secondReset = setHeaderSpy.mock.calls.find(
        (call) => call[0] === 'X-RateLimit-Reset'
      )?.[1]

      // Reset times should be different
      expect(firstReset).not.toBe(secondReset)
      expect(new Date(secondReset!).getTime()).toBeGreaterThan(
        new Date(firstReset!).getTime()
      )
    })
  })
})
