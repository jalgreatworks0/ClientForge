/**
 * TM-16: Error Handler HTTP Integration Fortress Suite
 *
 * Tests global error handler middleware behavior via real HTTP calls using supertest.
 * Validates error response structure, status codes, and headers for different error types.
 *
 * Coverage:
 * - Validation errors → 400
 * - Auth errors → 401
 * - Forbidden errors → 403
 * - Not Found errors → 404
 * - Rate limit errors → 429 (with headers)
 * - Server errors → 500
 * - Generic/unexpected errors → 500
 * - 404 for unknown routes
 *
 * @group fortress
 * @group integration
 * @group http
 * @group error-handling
 */

import request from 'supertest'
import { Application } from 'express'
import { makeErrorHandlerTestApp } from '../../helpers/test-error-handler-app'

describe('TM-16: Error Handler HTTP Integration Fortress Suite', () => {
  let app: Application

  beforeAll(() => {
    app = makeErrorHandlerTestApp()
  })

  describe('Validation Errors → 400', () => {
    it('should return 400 with error structure for validation errors', async () => {
      const response = await request(app).get('/test/validation-error').expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 400,
          timestamp: expect.any(String),
        },
      })

      // Validate timestamp is ISO 8601
      expect(() => new Date(response.body.error.timestamp)).not.toThrow()
    })

    it('should include validation context in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = await request(app).get('/test/validation-error').expect(400)

      expect(response.body.error).toHaveProperty('context')
      expect(response.body.error.context).toHaveProperty('fields')

      process.env.NODE_ENV = originalEnv
    })

    it('should handle synchronous validation errors', async () => {
      const response = await request(app).get('/test/sync-error').expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('validation'),
          statusCode: 400,
        },
      })
    })
  })

  describe('Authentication Errors → 401', () => {
    it('should return 401 with error structure for auth errors', async () => {
      const response = await request(app).get('/test/auth-error').expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 401,
          timestamp: expect.any(String),
        },
      })
    })

    it('should include authentication-related message', async () => {
      const response = await request(app).get('/test/auth-error').expect(401)

      expect(response.body.error.message.toLowerCase()).toMatch(/auth|unauthorized/i)
    })
  })

  describe('Authorization Errors → 403', () => {
    it('should return 403 with error structure for forbidden errors', async () => {
      const response = await request(app).get('/test/forbidden-error').expect(403)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 403,
          timestamp: expect.any(String),
        },
      })
    })

    it('should include authorization-related message', async () => {
      const response = await request(app).get('/test/forbidden-error').expect(403)

      expect(response.body.error.message.toLowerCase()).toMatch(/forbidden|permission/i)
    })

    it('should include context in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = await request(app).get('/test/forbidden-error').expect(403)

      expect(response.body.error).toHaveProperty('context')
      expect(response.body.error.context).toHaveProperty('requiredRole')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Not Found Errors → 404', () => {
    it('should return 404 with error structure for not found errors', async () => {
      const response = await request(app).get('/test/not-found-error').expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 404,
          timestamp: expect.any(String),
        },
      })
    })

    it('should return 404 for unknown routes', async () => {
      const response = await request(app).get('/does-not-exist').expect(404)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('not found'),
          statusCode: 404,
        },
      })
    })

    it('should include path in 404 response for unknown routes', async () => {
      const response = await request(app).get('/unknown/route/path').expect(404)

      expect(response.body.error).toHaveProperty('path')
      expect(response.body.error.path).toBe('/unknown/route/path')
    })
  })

  describe('Rate Limit Errors → 429', () => {
    it('should return 429 with error structure for rate limit errors', async () => {
      const response = await request(app).get('/test/rate-limit-error').expect(429)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 429,
          timestamp: expect.any(String),
        },
      })
    })

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test/rate-limit-error').expect(429)

      expect(response.headers).toHaveProperty('x-ratelimit-limit')
      expect(response.headers).toHaveProperty('x-ratelimit-remaining')
      expect(response.headers).toHaveProperty('x-ratelimit-reset')
      expect(response.headers).toHaveProperty('retry-after')
    })

    it('should include rate limit details in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = await request(app).get('/test/rate-limit-error').expect(429)

      expect(response.body.error).toHaveProperty('context')
      expect(response.body.error.context).toHaveProperty('limit')
      expect(response.body.error.context).toHaveProperty('windowMs')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Server Errors → 500', () => {
    it('should return 500 with error structure for internal server errors', async () => {
      const response = await request(app).get('/test/server-error').expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 500,
          timestamp: expect.any(String),
        },
      })
    })

    it('should return 500 for generic unexpected errors', async () => {
      const response = await request(app).get('/test/generic-error').expect(500)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 500,
          timestamp: expect.any(String),
        },
      })
    })

    it('should include stack trace in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = await request(app).get('/test/generic-error').expect(500)

      expect(response.body.error).toHaveProperty('stack')
      expect(response.body.error.stack).toContain('Error:')

      process.env.NODE_ENV = originalEnv
    })

    it('should NOT include stack trace in production mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const response = await request(app).get('/test/generic-error').expect(500)

      expect(response.body.error).not.toHaveProperty('stack')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('Error Response Structure', () => {
    it('should always return JSON content-type', async () => {
      const response = await request(app).get('/test/validation-error').expect(400)

      expect(response.headers['content-type']).toMatch(/application\/json/)
    })

    it('should have consistent error shape across all error types', async () => {
      const errorRoutes = [
        '/test/validation-error',
        '/test/auth-error',
        '/test/forbidden-error',
        '/test/not-found-error',
        '/test/rate-limit-error',
        '/test/server-error',
        '/test/generic-error',
      ]

      for (const route of errorRoutes) {
        const response = await request(app).get(route)

        expect(response.body).toHaveProperty('success', false)
        expect(response.body).toHaveProperty('error')
        expect(response.body.error).toHaveProperty('message')
        expect(response.body.error).toHaveProperty('statusCode')
        expect(response.body.error).toHaveProperty('timestamp')

        // Validate timestamp format
        expect(() => new Date(response.body.error.timestamp)).not.toThrow()
      }
    })

    it('should have statusCode matching HTTP response status', async () => {
      const testCases = [
        { route: '/test/validation-error', expectedStatus: 400 },
        { route: '/test/auth-error', expectedStatus: 401 },
        { route: '/test/forbidden-error', expectedStatus: 403 },
        { route: '/test/not-found-error', expectedStatus: 404 },
        { route: '/test/rate-limit-error', expectedStatus: 429 },
        { route: '/test/server-error', expectedStatus: 500 },
        { route: '/test/generic-error', expectedStatus: 500 },
      ]

      for (const { route, expectedStatus } of testCases) {
        const response = await request(app).get(route).expect(expectedStatus)

        expect(response.body.error.statusCode).toBe(expectedStatus)
      }
    })
  })

  describe('Edge Cases', () => {
    it('should handle multiple rapid errors without issue', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/test/validation-error').expect(400)
      )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.body).toMatchObject({
          success: false,
          error: {
            statusCode: 400,
          },
        })
      })
    })
  })
})
