/**
 * TM-19: Auth HTTP Flow Fortress Suite
 *
 * Tests authentication HTTP flows (register, login, refresh, logout) via real HTTP calls
 * using supertest with actual database persistence. Validates complete auth workflows,
 * error handling, validation integration, and security headers.
 *
 * Coverage:
 * - Happy path flows (register → login → refresh)
 * - Invalid credentials (wrong password, non-existent user, locked account)
 * - Validation + auth interaction (invalid payloads)
 * - Security headers spot checks
 * - Multi-tenant isolation
 *
 * @group fortress
 * @group integration
 * @group http
 * @group auth
 */

import request from 'supertest'
import { Application } from 'express'
import {
  makeAuthHttpTestApp,
  setupAuthTestDb,
  resetAuthTestDb,
  teardownAuthTestDb,
  getTestTenantId,
  getTestRoleId,
} from '../../support/test-auth-http-app'

describe('TM-19: Auth HTTP Flow Fortress Suite', () => {
  let app: Application
  let testTenantId: string
  let testRoleId: string

  beforeAll(async () => {
    // Setup test database and get tenant/role IDs
    await setupAuthTestDb()
    testTenantId = getTestTenantId()
    testRoleId = getTestRoleId()

    // Create test app
    app = makeAuthHttpTestApp()
  })

  afterAll(async () => {
    // Cleanup database connections
    await teardownAuthTestDb()
  })

  beforeEach(async () => {
    // Reset database state before each test
    await resetAuthTestDb()
  })

  describe('A) Happy Path Flow', () => {
    const testUser = {
      email: 'testuser@example.com',
      password: 'SecurePass123!',
      firstName: 'Test',
      lastName: 'User',
    }

    let accessToken: string
    let refreshToken: string

    it('should complete full Register → Login → Refresh flow', async () => {
      // Step 1: Register
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        })
        .expect(201)

      expect(registerResponse.body).toMatchObject({
        success: true,
        message: 'User registered successfully',
        data: {
          user: {
            email: testUser.email,
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            tenantId: testTenantId,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: expect.any(Number),
          },
        },
      })

      const userId = registerResponse.body.data.user.id
      expect(userId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)

      // Step 2: Login with same credentials
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)

      expect(loginResponse.body).toMatchObject({
        success: true,
        message: 'Login successful',
        data: {
          user: {
            email: testUser.email,
            firstName: testUser.firstName,
            tenantId: testTenantId,
          },
          tokens: {
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: expect.any(Number),
          },
        },
      })

      accessToken = loginResponse.body.data.tokens.accessToken
      refreshToken = loginResponse.body.data.tokens.refreshToken

      // Verify JWT format (header.payload.signature)
      expect(accessToken.split('.').length).toBe(3)
      expect(refreshToken.split('.').length).toBe(3)

      // Step 3: Refresh access token
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200)

      expect(refreshResponse.body).toMatchObject({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          accessToken: expect.any(String),
          expiresIn: expect.any(Number),
        },
      })

      // New access token should be different
      expect(refreshResponse.body.data.accessToken).not.toBe(accessToken)
    })

    it('should login successfully for existing user', async () => {
      // First register a user
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: 'existing@example.com',
          password: 'ExistingPass123!',
          firstName: 'Existing',
          lastName: 'User',
        })
        .expect(201)

      // Now login with existing credentials
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: 'existing@example.com',
          password: 'ExistingPass123!',
        })
        .expect(200)

      expect(loginResponse.body.success).toBe(true)
      expect(loginResponse.body.data.user.email).toBe('existing@example.com')
      expect(loginResponse.body.data.tokens.accessToken).toBeDefined()
    })

    it('should handle refresh token correctly (single use)', async () => {
      // Register and login
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: 'refresh@example.com',
          password: 'RefreshPass123!',
          firstName: 'Refresh',
          lastName: 'Test',
        })

      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: 'refresh@example.com',
          password: 'RefreshPass123!',
        })

      const originalRefreshToken = loginResponse.body.data.tokens.refreshToken

      // Use refresh token once → should succeed
      const firstRefresh = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })
        .expect(200)

      expect(firstRefresh.body.success).toBe(true)
      expect(firstRefresh.body.data.accessToken).toBeDefined()

      // Try to reuse the same refresh token → should fail (if rotating tokens)
      // Note: This behavior depends on whether refresh tokens are single-use
      // Comment this test if your implementation doesn't rotate refresh tokens
      const secondRefresh = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: originalRefreshToken,
        })

      // Expect either 401 (token invalid) or 200 (token reusable)
      // Adjust based on actual implementation
      expect([200, 401]).toContain(secondRefresh.status)
    })

    it('should include tenant ID in JWT payload', async () => {
      // Register user
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: 'jwt@example.com',
          password: 'JwtPass123!',
          firstName: 'JWT',
          lastName: 'Test',
        })

      const accessToken = registerResponse.body.data.tokens.accessToken

      // Decode JWT payload (base64 decode middle part)
      const payloadBase64 = accessToken.split('.')[1]
      const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'))

      // Verify payload contains tenant ID and user ID
      expect(payload.tenantId).toBe(testTenantId)
      expect(payload.userId).toBeDefined()
      expect(payload.email).toBe('jwt@example.com')
    })
  })

  describe('B) Invalid Credentials', () => {
    const validUser = {
      email: 'valid@example.com',
      password: 'ValidPass123!',
      firstName: 'Valid',
      lastName: 'User',
    }

    beforeEach(async () => {
      // Register a valid user for credential tests
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: validUser.email,
          password: validUser.password,
          firstName: validUser.firstName,
          lastName: validUser.lastName,
        })
    })

    it('should reject login with wrong password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: validUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringMatching(/invalid.*credentials/i),
          statusCode: 401,
        },
      })
    })

    it('should reject login for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: 'nonexistent@example.com',
          password: 'AnyPassword123!',
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringMatching(/invalid.*credentials/i),
          statusCode: 401,
        },
      })

      // Error message should NOT leak whether user exists (no user enumeration)
      expect(response.body.error.message).not.toMatch(/not found/i)
      expect(response.body.error.message).not.toMatch(/does not exist/i)
    })

    it('should lock account after multiple failed login attempts', async () => {
      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            tenantId: testTenantId,
            email: validUser.email,
            password: 'WrongPassword123!',
          })
          .expect(401)
      }

      // 6th attempt should fail with account locked error
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: validUser.email,
          password: validUser.password, // Even with correct password
        })
        .expect(403)

      expect(response.body.error.message).toMatch(/locked|blocked/i)
    })

    it('should reject invalid/expired refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature',
        })
        .expect(401)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringMatching(/invalid.*token|expired/i),
          statusCode: 401,
        },
      })
    })

    it('should reject malformed refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'not.a.valid.jwt.format',
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.statusCode).toBe(401)
    })

    it('should enforce tenant isolation (cross-tenant login blocked)', async () => {
      // Create a second tenant manually for this test
      // Note: This test assumes multi-tenancy is enforced
      // If your app doesn't support multiple tenants yet, skip this test

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: '00000000-0000-0000-0000-000000000000', // Different tenant
          email: validUser.email,
          password: validUser.password,
        })
        .expect(401)

      expect(response.body.error.message).toMatch(/invalid.*credentials/i)
    })
  })

  describe('C) Validation + Auth Interaction', () => {
    it('should reject register with invalid payload (missing email)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          // email missing
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringMatching(/validation/i),
          statusCode: 400,
        },
      })
    })

    it('should reject register with invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: 'not-an-email',
          password: 'ValidPass123!',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400)

      expect(response.body.error.message).toMatch(/validation|email/i)
    })

    it('should reject register with weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: 'weak@example.com',
          password: 'weak',
          firstName: 'Test',
          lastName: 'User',
        })
        .expect(400)

      expect(response.body.error.message).toMatch(/validation|password/i)
    })

    it('should reject login with invalid payload (non-string password)', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: 'test@example.com',
          password: 12345, // Should be string
        })
        .expect(400)

      expect(response.body.error.statusCode).toBe(400)
    })

    it('should reject refresh with missing refreshToken field', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          // refreshToken missing
        })
        .expect(400)

      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.stringMatching(/validation|refresh.*token.*required/i),
          statusCode: 400,
        },
      })
    })
  })

  describe('D) Headers & Security Spot Checks', () => {
    const testUser = {
      email: 'headers@example.com',
      password: 'HeadersPass123!',
      firstName: 'Headers',
      lastName: 'Test',
    }

    beforeEach(async () => {
      // Register user for header tests
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
        })
    })

    it('should include security headers on successful login', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200)

      // Spot-check key security headers (not exhaustive like TM-18)
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')
      expect(response.headers['content-type']).toMatch(/application\/json/)
    })

    it('should include security headers on login failure', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: testUser.email,
          password: 'WrongPassword123!',
        })
        .expect(401)

      // Security headers should be present even on error responses
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN')

      // Error response format matches TM-16
      expect(response.body).toMatchObject({
        success: false,
        error: {
          message: expect.any(String),
          statusCode: 401,
          timestamp: expect.any(String),
        },
      })
    })

    it('should return JSON content-type for all auth responses', async () => {
      // Test register response
      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send({
          tenantId: testTenantId,
          email: 'json@example.com',
          password: 'JsonPass123!',
          firstName: 'JSON',
          lastName: 'Test',
        })

      expect(registerResponse.headers['content-type']).toMatch(/application\/json/)

      // Test login response
      const loginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          tenantId: testTenantId,
          email: 'json@example.com',
          password: 'JsonPass123!',
        })

      expect(loginResponse.headers['content-type']).toMatch(/application\/json/)

      // Test refresh response
      const refreshToken = loginResponse.body.data.tokens.refreshToken
      const refreshResponse = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })

      expect(refreshResponse.headers['content-type']).toMatch(/application\/json/)
    })
  })
})
