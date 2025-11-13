/**
 * TM-18: CORS & Security Headers HTTP Fortress Suite
 *
 * Tests CORS and security headers behavior via real HTTP calls using supertest.
 * Validates that cross-origin requests are properly allowed/denied and that
 * security headers (Helmet) are consistently applied across all responses.
 *
 * Coverage:
 * - Basic CORS allow behavior (allowed origins, methods, headers)
 * - CORS deny/block behavior (disallowed origins)
 * - Security headers on successful responses (CSP, HSTS, X-Frame-Options, etc.)
 * - Security headers on error & 404 responses
 * - Edge cases (preflight, exposed headers, credentials)
 *
 * @group fortress
 * @group integration
 * @group http
 * @group cors
 * @group security
 */

import request from 'supertest'
import { Application } from 'express'
import { makeCorsSecurityTestApp } from '../../support/test-cors-security-app'

describe('TM-18: CORS & Security Headers HTTP Fortress Suite', () => {
  let app: Application

  beforeAll(() => {
    app = makeCorsSecurityTestApp()
  })

  describe('A) Basic CORS Allow Behavior', () => {
    it('should allow requests from allowed origin (localhost:3000)', async () => {
      const response = await request(app)
        .get('/cors/simple')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      // CORS headers should be present
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
      expect(response.headers['access-control-allow-credentials']).toBe('true')

      expect(response.body).toMatchObject({
        success: true,
        message: 'Simple GET request',
      })
    })

    it('should allow POST requests with JSON body from allowed origin', async () => {
      const response = await request(app)
        .post('/cors/simple')
        .set('Origin', 'http://localhost:3001')
        .set('Content-Type', 'application/json')
        .send({ testField: 'test value' })
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3001')
      expect(response.headers['access-control-allow-credentials']).toBe('true')

      expect(response.body).toMatchObject({
        success: true,
        message: 'Simple POST request',
        receivedBody: {
          testField: 'test value',
        },
      })
    })

    it('should handle OPTIONS preflight request correctly', async () => {
      const response = await request(app)
        .options('/cors/simple')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST')
        .set('Access-Control-Request-Headers', 'Content-Type,Authorization')
        .expect(200)

      // Preflight response headers
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
      expect(response.headers['access-control-allow-methods']).toContain('POST')
      expect(response.headers['access-control-allow-headers']).toMatch(/content-type/i)
      expect(response.headers['access-control-allow-headers']).toMatch(/authorization/i)
      expect(response.headers['access-control-max-age']).toBe('86400')
    })

    it('should allow Authorization header from allowed origin', async () => {
      const response = await request(app)
        .get('/cors/authenticated')
        .set('Origin', 'http://localhost:3002')
        .set('Authorization', 'Bearer test-token-123')
        .expect(200)

      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3002')
      expect(response.body).toMatchObject({
        success: true,
        hasAuth: true,
      })
    })

    it('should allow requests with no origin (mobile apps, Postman)', async () => {
      const response = await request(app)
        .get('/cors/simple')
        // No Origin header
        .expect(200)

      // When no origin is present, CORS middleware typically doesn't set CORS headers
      // but the request should still succeed
      expect(response.body).toMatchObject({
        success: true,
        message: 'Simple GET request',
      })
    })
  })

  describe('B) CORS Deny/Block Behavior', () => {
    it('should block requests from disallowed origin', async () => {
      const response = await request(app)
        .get('/cors/simple')
        .set('Origin', 'http://evil.com')
        .expect(500)

      // CORS middleware should reject this before it reaches the handler
      expect(response.body).toMatchObject({
        success: false,
        error: {
          statusCode: 500,
        },
      })

      // Should not have CORS allow headers for disallowed origin
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
    })

    it('should block preflight from disallowed origin', async () => {
      const response = await request(app)
        .options('/cors/simple')
        .set('Origin', 'http://malicious.com')
        .set('Access-Control-Request-Method', 'POST')
        .expect(500)

      // Should not return CORS headers for disallowed origin
      expect(response.headers['access-control-allow-origin']).toBeUndefined()
      expect(response.headers['access-control-allow-methods']).toBeUndefined()
    })

    it('should reject preflight with disallowed method', async () => {
      const response = await request(app)
        .options('/cors/simple')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'TRACE') // Not in allowed methods
        .expect(200)

      // Should return preflight response, but method should not be in allowed list
      const allowedMethods = response.headers['access-control-allow-methods'] || ''
      expect(allowedMethods).not.toContain('TRACE')
    })
  })

  describe('C) Security Headers on Successful Responses', () => {
    it('should include X-Content-Type-Options header', async () => {
      const response = await request(app)
        .get('/cors/simple')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should include X-Frame-Options header', async () => {
      const response = await request(app)
        .get('/cors/simple')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
    })

    it('should include Referrer-Policy header', async () => {
      const response = await request(app)
        .get('/cors/simple')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(response.headers['referrer-policy']).toBeDefined()
      expect(response.headers['referrer-policy']).toMatch(/no-referrer/)
    })

    it('should include Strict-Transport-Security (HSTS) header', async () => {
      const response = await request(app)
        .get('/cors/secure-data')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(response.headers['strict-transport-security']).toBeDefined()
      expect(response.headers['strict-transport-security']).toContain('max-age=31536000')
      expect(response.headers['strict-transport-security']).toContain('includeSubDomains')
      expect(response.headers['strict-transport-security']).toContain('preload')
    })

    it('should include Content-Security-Policy (CSP) header', async () => {
      const response = await request(app)
        .get('/cors/simple')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(response.headers['content-security-policy']).toBeDefined()
      expect(response.headers['content-security-policy']).toContain("default-src 'self'")
    })
  })

  describe('D) Security Headers on Error & 404 Responses', () => {
    it('should include security headers on 500 error responses', async () => {
      const response = await request(app)
        .get('/cors/error')
        .set('Origin', 'http://localhost:3000')
        .expect(500)

      // Security headers should be present even on errors
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['strict-transport-security']).toBeDefined()
      expect(response.headers['content-security-policy']).toBeDefined()

      // CORS headers should also be present
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    })

    it('should include security headers on 400 validation error responses', async () => {
      const response = await request(app)
        .post('/cors/validation-error')
        .set('Origin', 'http://localhost:3001')
        .send({})
        .expect(400)

      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['strict-transport-security']).toBeDefined()
    })

    it('should include security headers on 404 not found responses', async () => {
      const response = await request(app)
        .get('/cors/nonexistent-route')
        .set('Origin', 'http://localhost:3000')
        .expect(404)

      // Security headers on 404
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['strict-transport-security']).toBeDefined()
      expect(response.headers['content-security-policy']).toBeDefined()

      // CORS headers on 404
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')

      expect(response.body).toMatchObject({
        success: false,
        error: {
          statusCode: 404,
          message: 'Route not found',
        },
      })
    })

    it('should include security headers on 401 unauthorized responses', async () => {
      const response = await request(app)
        .get('/cors/authenticated')
        .set('Origin', 'http://localhost:3000')
        // No Authorization header
        .expect(401)

      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    })
  })

  describe('E) Edge Cases', () => {
    it('should expose configured custom headers (X-Total-Count, X-Page-Count, X-Request-ID)', async () => {
      const response = await request(app)
        .get('/cors/custom-headers')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      // Check that exposed headers are listed in CORS header
      const exposedHeaders = response.headers['access-control-expose-headers']
      expect(exposedHeaders).toBeDefined()
      expect(exposedHeaders).toMatch(/X-Total-Count/i)
      expect(exposedHeaders).toMatch(/X-Page-Count/i)
      expect(exposedHeaders).toMatch(/X-Request-ID/i)

      // Verify the actual headers are present
      expect(response.headers['x-total-count']).toBe('100')
      expect(response.headers['x-page-count']).toBe('10')
      expect(response.headers['x-request-id']).toBe('test-request-123')
    })

    it('should handle multiple rapid CORS requests', async () => {
      const requests = [
        request(app).get('/cors/simple').set('Origin', 'http://localhost:3000'),
        request(app).get('/cors/simple').set('Origin', 'http://localhost:3001'),
        request(app).get('/cors/simple').set('Origin', 'http://localhost:3002'),
      ]

      const responses = await Promise.all(requests)

      responses.forEach((response, index) => {
        expect(response.status).toBe(200)
        expect(response.headers['access-control-allow-origin']).toBe(`http://localhost:300${index}`)
        expect(response.headers['x-content-type-options']).toBe('nosniff')
      })
    })

    it('should maintain security headers and CORS across different HTTP methods', async () => {
      const methods = [
        { method: 'get', path: '/cors/simple' },
        { method: 'post', path: '/cors/simple' },
      ]

      for (const { method, path } of methods) {
        const req = request(app)[method as 'get' | 'post'](path)
          .set('Origin', 'http://localhost:3000')

        if (method === 'post') {
          req.send({ test: 'data' })
        }

        const response = await req.expect(200)

        expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
        expect(response.headers['x-content-type-options']).toBe('nosniff')
        expect(response.headers['strict-transport-security']).toBeDefined()
      }
    })
  })
})
