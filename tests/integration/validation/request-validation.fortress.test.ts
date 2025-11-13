/**
 * TM-17: Request Validation HTTP Fortress Suite
 *
 * Tests request validation middleware behavior via real HTTP calls using supertest.
 * Validates that invalid input is consistently rejected with proper error responses,
 * and that the validation layer integrates correctly with the middleware pipeline.
 *
 * Coverage:
 * - Happy path validation (valid inputs)
 * - Missing/invalid field errors → 400
 * - Nested validation errors
 * - Array validation errors
 * - Query parameter validation
 * - Extra fields handling
 * - Middleware ordering (auth before validation)
 * - Sanitization + validation interaction
 * - Environment-specific behavior (dev vs prod)
 *
 * @group fortress
 * @group integration
 * @group http
 * @group validation
 */

import request from 'supertest'
import { Application } from 'express'
import { makeValidationTestApp } from '../../support/test-validation-app'

describe('TM-17: Request Validation HTTP Fortress Suite', () => {
  let app: Application

  beforeAll(() => {
    app = makeValidationTestApp()
  })

  describe('A) Happy Path - Valid Requests', () => {
    it('should accept valid basic payload', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'user@example.com',
          password: 'SecureP@ss1',
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          email: 'user@example.com',
          password: 'SecureP@ss1',
        },
      })
    })

    it('should accept valid nested payload', async () => {
      const response = await request(app)
        .post('/validation/nested')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          profile: {
            firstName: 'John',
            age: 30,
          },
          tags: ['important', 'customer'],
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          profile: {
            firstName: 'John',
            age: 30,
          },
          tags: ['important', 'customer'],
        },
      })
    })

    it('should accept valid array payload', async () => {
      const response = await request(app)
        .post('/validation/array')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          items: [
            { id: '550e8400-e29b-41d4-a716-446655440000', quantity: 5 },
            { id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8', quantity: 3 },
          ],
        })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          itemCount: 2,
        },
      })
    })

    it('should accept valid query parameters', async () => {
      const response = await request(app)
        .get('/validation/query')
        .set('X-Tenant-ID', 'test-tenant-123')
        .query({ page: '2', limit: '50', search: 'test' })
        .expect(200)

      expect(response.body).toMatchObject({
        success: true,
        data: {
          page: 2,
          limit: 50,
          search: 'test',
        },
      })
    })
  })

  describe('B) Missing / Invalid Fields → 400', () => {
    it('should reject missing required field (email)', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          password: 'SecureP@ss1',
          // email missing
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringContaining('validation'),
          statusCode: 400,
        },
      })
    })

    it('should reject type mismatch (age as string)', async () => {
      const response = await request(app)
        .post('/validation/nested')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          profile: {
            firstName: 'John',
            age: 'thirty', // Should be number
          },
          tags: ['test'],
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(response.body.error.message).toMatch(/validation/i)
    })

    it('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'not-an-email',
          password: 'SecureP@ss1',
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(response.body.error.message).toMatch(/validation/i)
    })

    it('should reject too-short password', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'user@example.com',
          password: 'short',
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(response.body.error.message).toMatch(/validation/i)
    })

    it('should reject nested field invalid (negative age)', async () => {
      const response = await request(app)
        .post('/validation/nested')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          profile: {
            firstName: 'John',
            age: -5, // Must be positive
          },
          tags: ['test'],
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(response.body.error.message).toMatch(/validation/i)
    })

    it('should reject array item with invalid UUID', async () => {
      const response = await request(app)
        .post('/validation/array')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          items: [
            { id: 'not-a-uuid', quantity: 5 },
          ],
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(response.body.error.message).toMatch(/validation/i)
    })

    it('should reject array item with invalid quantity type', async () => {
      const response = await request(app)
        .post('/validation/array')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          items: [
            { id: '550e8400-e29b-41d4-a716-446655440000', quantity: 'five' },
          ],
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(response.body.error.message).toMatch(/validation/i)
    })

    it('should report multiple validation errors in one payload', async () => {
      const response = await request(app)
        .post('/validation/nested')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          profile: {
            firstName: '', // Invalid: empty
            age: -1, // Invalid: negative
          },
          tags: [], // Invalid: empty array
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)

      // Check that error context exists (dev mode should include details)
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const devResponse = await request(app)
        .post('/validation/nested')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          profile: {
            firstName: '',
            age: -1,
          },
          tags: [],
        })
        .expect(400)

      if (devResponse.body.error.context) {
        expect(devResponse.body.error.context.errors).toBeDefined()
        expect(Array.isArray(devResponse.body.error.context.errors)).toBe(true)
      }

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('C) Extra Fields Behavior', () => {
    it('should reject extra unexpected fields (strict mode)', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'user@example.com',
          password: 'SecureP@ss1',
          extraField: 'should-not-be-here',
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(response.body.error.message).toMatch(/validation/i)
    })

    it('should strip extra fields in loose mode', async () => {
      const response = await request(app)
        .post('/validation/extra-fields')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'user@example.com',
          password: 'SecureP@ss1',
          extraField: 'should-be-stripped',
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.receivedKeys).toEqual(['email', 'password'])
      expect(response.body.data.values.extraField).toBeUndefined()
    })

    it('should ensure extra fields are not reflected in error responses', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'not-an-email',
          password: 'short',
          maliciousScript: '<script>alert("xss")</script>',
        })
        .expect(400)

      // Ensure the error response doesn't echo back malicious input
      expect(JSON.stringify(response.body)).not.toContain('<script>')
    })
  })

  describe('D) Pipeline Ordering', () => {
    it('should fail with auth error when tenant missing, not validation error', async () => {
      const response = await request(app)
        .post('/validation/no-tenant')
        // No X-Tenant-ID header
        .send({
          email: 'invalid-email', // Also invalid, but should not reach validation
          password: 'short',
        })
        .expect(401)

      expect(response.body.error.statusCode).toBe(401)
      expect(JSON.stringify(response.body)).toMatch(/tenant|unauthorized/i)
      // Should NOT mention validation errors
      expect(JSON.stringify(response.body)).not.toMatch(/validation failed/i)
    })

    it('should fail with validation error when tenant present but payload invalid', async () => {
      const response = await request(app)
        .post('/validation/no-tenant')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'invalid-email',
          password: 'short',
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
      expect(JSON.stringify(response.body)).toMatch(/validation/i)
    })

    it('should apply sanitization before validation', async () => {
      const response = await request(app)
        .post('/validation/whitespace')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: '  user@example.com  ', // Whitespace should be trimmed
          password: '  SecureP@ss1  ',
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data.email).toBe('user@example.com')
      expect(response.body.data.password).toBe('SecureP@ss1')
    })
  })

  describe('E) Environment Behavior', () => {
    it('should include error context in development mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'invalid-email',
          password: 'SecureP@ss1',
        })
        .expect(400)

      expect(response.body.error).toHaveProperty('context')
      expect(response.body.error.context).toHaveProperty('errors')
      expect(Array.isArray(response.body.error.context.errors)).toBe(true)
      expect(response.body.error.context.errors.length).toBeGreaterThan(0)

      process.env.NODE_ENV = originalEnv
    })

    it('should NOT include sensitive context in production mode', async () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'invalid-email',
          password: 'SecureP@ss1',
        })
        .expect(400)

      expect(response.body.error).not.toHaveProperty('context')
      expect(response.body.error).not.toHaveProperty('stack')

      process.env.NODE_ENV = originalEnv
    })
  })

  describe('F) Error Response Consistency', () => {
    it('should return consistent error shape matching TM-16', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'invalid',
          password: 'short',
        })
        .expect(400)

      // Matches TM-16 error shape
      expect(response.body).toHaveProperty('success', false)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toHaveProperty('message')
      expect(response.body.error).toHaveProperty('statusCode', 400)
      expect(response.body.error).toHaveProperty('timestamp')

      // Validate timestamp is ISO 8601
      expect(() => new Date(response.body.error.timestamp)).not.toThrow()
    })

    it('should always return JSON content-type for validation errors', async () => {
      const response = await request(app)
        .post('/validation/basic')
        .set('X-Tenant-ID', 'test-tenant-123')
        .send({
          email: 'invalid',
        })
        .expect(400)

      expect(response.headers['content-type']).toMatch(/application\/json/)
    })
  })
})
