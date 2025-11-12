/**
 * Integration Tests: Authentication Flow
 * End-to-end testing of authentication workflows
 */

import request from 'supertest'
import { Server } from '../../../backend/api/server'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { getRedisClient } from '../../../config/database/redis-config'
import { Pool } from 'pg'
import { RedisClientType } from 'redis'

// TODO(phase5): Re-enable after full server/database integration setup is complete.
describe.skip('Authentication Flow Integration Tests', () => {
  let server: Server
  let app: any
  let pgPool: Pool
  let redisClient: RedisClientType

  // Test user data
  const testTenant = {
    id: '',
    name: 'Test Company',
    subdomain: 'testcompany',
  }

  const testUser = {
    email: 'test@example.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  }

  let testUserId: string
  let testRoleId: string
  let accessToken: string
  let refreshToken: string

  beforeAll(async () => {
    // Initialize database connections
    pgPool = getPostgresPool()
    redisClient = await getRedisClient()

    // Start server
    server = new Server()
    app = server.app

    // Setup test tenant and role
    const tenantResult = await pgPool.query(
      `INSERT INTO tenants (name, subdomain, plan_type, is_active)
       VALUES ($1, $2, 'starter', true)
       RETURNING id`,
      [testTenant.name, testTenant.subdomain]
    )
    testTenant.id = tenantResult.rows[0].id

    const roleResult = await pgPool.query(
      `INSERT INTO roles (tenant_id, name, level, is_system_role)
       VALUES ($1, 'User', 10, true)
       RETURNING id`,
      [testTenant.id]
    )
    testRoleId = roleResult.rows[0].id
  })

  afterAll(async () => {
    // Clean up test data
    await pgPool.query('DELETE FROM users WHERE email = $1', [testUser.email])
    await pgPool.query('DELETE FROM roles WHERE id = $1', [testRoleId])
    await pgPool.query('DELETE FROM tenants WHERE id = $1', [testTenant.id])

    // Close connections
    await pgPool.end()
    await redisClient.quit()
  })

  beforeEach(async () => {
    // Clear Redis sessions between tests
    await redisClient.flushDb()
  })

  describe('POST /api/v1/auth/register', () => {
    it('should register new user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          tenantId: testTenant.id,
          roleId: testRoleId,
        })
        .expect(201)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('id')
      expect(response.body.data.email).toBe(testUser.email)
      expect(response.body.data.firstName).toBe(testUser.firstName)

      testUserId = response.body.data.id

      // Verify user in database
      const userResult = await pgPool.query(
        'SELECT * FROM users WHERE id = $1',
        [testUserId]
      )
      expect(userResult.rows.length).toBe(1)
      expect(userResult.rows[0].email).toBe(testUser.email)
    })

    it('should return error if email already exists', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testUser.email,
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          tenantId: testTenant.id,
          roleId: testRoleId,
        })
        .expect(409)
    })

    it('should return error for weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newuser@example.com',
          password: 'weak',
          firstName: 'New',
          lastName: 'User',
          tenantId: testTenant.id,
          roleId: testRoleId,
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('Password')
    })

    it('should return error for invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: testUser.password,
          firstName: testUser.firstName,
          lastName: testUser.lastName,
          tenantId: testTenant.id,
          roleId: testRoleId,
        })
        .expect(400)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('email')
    })
  })

  describe('POST /api/v1/auth/login', () => {
    beforeAll(async () => {
      // Verify email for login tests
      await pgPool.query(
        'UPDATE users SET is_verified = true WHERE id = $1',
        [testUserId]
      )
    })

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          tenantId: testTenant.id,
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('accessToken')
      expect(response.body.data).toHaveProperty('refreshToken')
      expect(response.body.data.user.email).toBe(testUser.email)

      accessToken = response.body.data.accessToken
      refreshToken = response.body.data.refreshToken

      // Verify session in Redis
      const sessionKey = `session:*:${testUserId}`
      const keys = await redisClient.keys(sessionKey)
      expect(keys.length).toBeGreaterThan(0)
    })

    it('should return error for invalid password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword123!',
          tenantId: testTenant.id,
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('credentials')
    })

    it('should return error for non-existent user', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: testUser.password,
          tenantId: testTenant.id,
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('credentials')
    })

    it('should lock account after 5 failed login attempts', async () => {
      const testEmail = 'locktest@example.com'

      // Create user for lock test
      await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: testEmail,
          password: testUser.password,
          firstName: 'Lock',
          lastName: 'Test',
          tenantId: testTenant.id,
          roleId: testRoleId,
        })

      await pgPool.query(
        'UPDATE users SET is_verified = true WHERE email = $1',
        [testEmail]
      )

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/auth/login')
          .send({
            email: testEmail,
            password: 'WrongPassword123!',
            tenantId: testTenant.id,
          })
          .expect(401)
      }

      // 6th attempt should return locked error
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testEmail,
          password: testUser.password,
          tenantId: testTenant.id,
        })
        .expect(403)

      expect(response.body.error.message).toContain('locked')

      // Cleanup
      await pgPool.query('DELETE FROM users WHERE email = $1', [testEmail])
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.data).toHaveProperty('accessToken')
      expect(response.body.data.accessToken).not.toBe(accessToken)
    })

    it('should return error for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken: 'invalid.refresh.token',
        })
        .expect(401)

      expect(response.body.success).toBe(false)
      expect(response.body.error.message).toContain('token')
    })

    it('should return error if session is invalidated', async () => {
      // Delete session from Redis
      const sessionKey = `session:*:${testUserId}`
      const keys = await redisClient.keys(sessionKey)
      for (const key of keys) {
        await redisClient.del(key)
      }

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({
          refreshToken,
        })
        .expect(401)

      expect(response.body.error.message).toContain('Session')
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    beforeAll(async () => {
      // Login to get fresh tokens
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          tenantId: testTenant.id,
        })

      accessToken = response.body.data.accessToken
      refreshToken = response.body.data.refreshToken
    })

    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.success).toBe(true)
      expect(response.body.message).toContain('Logged out')

      // Verify session removed from Redis
      const sessionKey = `session:*:${testUserId}`
      const keys = await redisClient.keys(sessionKey)
      expect(keys.length).toBe(0)
    })

    it('should return error without authentication', async () => {
      await request(app).post('/api/v1/auth/logout').expect(401)
    })
  })

  describe('Protected Route Access', () => {
    beforeAll(async () => {
      // Login to get fresh token
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
          tenantId: testTenant.id,
        })

      accessToken = response.body.data.accessToken
    })

    it('should access protected route with valid token', async () => {
      const response = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200)

      expect(response.body.data.email).toBe(testUser.email)
    })

    it('should deny access without token', async () => {
      await request(app).get('/api/v1/users/me').expect(401)
    })

    it('should deny access with invalid token', async () => {
      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid.token.here')
        .expect(401)
    })

    it('should deny access with expired token', async () => {
      // Mock expired token (implementation would require token manipulation)
      // This is a placeholder for proper token expiry testing
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDk0NTkyMDB9.mock'

      await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401)
    })
  })
})
