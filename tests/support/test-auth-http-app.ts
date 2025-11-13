/**
 * Test Auth HTTP Mini-App
 * Provides isolated Express app for testing auth HTTP flows with real database
 */

import express, { Application, Request, Response } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { corsConfig } from '../../config/security/cors-config'
import { errorHandler } from '../../backend/utils/errors/error-handler'
import authRoutes from '../../backend/api/rest/v1/routes/auth-routes'
import { getPostgresPool } from '../../config/database/postgres-config'
import { getRedisClient } from '../../config/database/redis-config'
import { Pool } from 'pg'
import { RedisClientType } from 'redis'

/**
 * Test database state
 */
let pgPool: Pool | null = null
let redisClient: RedisClientType | null = null
let testTenantId: string | null = null
let testRoleId: string | null = null

/**
 * Initialize test database connections and schema
 */
export async function setupAuthTestDb(): Promise<void> {
  // Initialize connections
  pgPool = getPostgresPool()
  redisClient = await getRedisClient()

  // Create auth-related tables if they don't exist
  await createAuthTables()

  // Create test tenant and role
  await setupTestTenantAndRole()
}

/**
 * Reset auth test database (truncate tables but keep schema)
 */
export async function resetAuthTestDb(): Promise<void> {
  if (!pgPool || !redisClient) {
    throw new Error('Test database not initialized. Call setupAuthTestDb() first.')
  }

  // Clear users and sessions (cascade will handle related data)
  await pgPool.query('DELETE FROM sessions')
  await pgPool.query('DELETE FROM users WHERE tenant_id = $1', [testTenantId])

  // Clear Redis sessions
  await redisClient.flushDb()
}

/**
 * Teardown test database connections
 */
export async function teardownAuthTestDb(): Promise<void> {
  if (pgPool) {
    // Clean up test tenant and role
    await pgPool.query('DELETE FROM users WHERE tenant_id = $1', [testTenantId])
    await pgPool.query('DELETE FROM roles WHERE id = $1', [testRoleId])
    await pgPool.query('DELETE FROM tenants WHERE id = $1', [testTenantId])

    await pgPool.end()
    pgPool = null
  }

  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }

  testTenantId = null
  testRoleId = null
}

/**
 * Get test tenant ID
 */
export function getTestTenantId(): string {
  if (!testTenantId) {
    throw new Error('Test tenant not initialized. Call setupAuthTestDb() first.')
  }
  return testTenantId
}

/**
 * Get test role ID
 */
export function getTestRoleId(): string {
  if (!testRoleId) {
    throw new Error('Test role not initialized. Call setupAuthTestDb() first.')
  }
  return testRoleId
}

/**
 * Creates a test Express app configured for auth HTTP flow testing
 *
 * Middleware order (matches production):
 * 1. Helmet (security headers)
 * 2. CORS
 * 3. Body parsing
 * 4. Auth routes
 * 5. 404 handler
 * 6. Error handler
 */
export function makeAuthHttpTestApp(): Application {
  const app = express()

  // Security headers - matches production configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    })
  )

  // CORS - uses actual production config
  app.use(cors(corsConfig))

  // Body parsing middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Auth routes - mount at /api/v1/auth
  app.use('/api/v1/auth', authRoutes)

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        statusCode: 404,
        path: req.path,
      },
    })
  })

  // Global error handler (must be last)
  app.use(errorHandler)

  return app
}

/**
 * Private: Create auth-related database tables
 */
async function createAuthTables(): Promise<void> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized')

  // Create tenants table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS tenants (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      subdomain VARCHAR(100) UNIQUE NOT NULL,
      plan_type VARCHAR(50) NOT NULL,
      max_users INTEGER NOT NULL DEFAULT 5,
      max_storage_gb INTEGER NOT NULL DEFAULT 10,
      is_active BOOLEAN DEFAULT true,
      trial_ends_at TIMESTAMP,
      subscription_ends_at TIMESTAMP,
      settings JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP
    )
  `)

  // Create roles table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      level INTEGER NOT NULL DEFAULT 0,
      is_system_role BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_role_per_tenant UNIQUE (tenant_id, name)
    )
  `)

  // Create users table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      role_id UUID NOT NULL REFERENCES roles(id),
      email VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      first_name VARCHAR(100) NOT NULL,
      last_name VARCHAR(100) NOT NULL,
      phone VARCHAR(50),
      avatar_url TEXT,
      timezone VARCHAR(100) DEFAULT 'UTC',
      language VARCHAR(10) DEFAULT 'en',
      is_active BOOLEAN DEFAULT true,
      is_verified BOOLEAN DEFAULT false,
      is_locked BOOLEAN DEFAULT false,
      email_verified_at TIMESTAMP,
      last_login_at TIMESTAMP,
      last_login_ip VARCHAR(45),
      failed_login_attempts INTEGER DEFAULT 0,
      locked_until TIMESTAMP,
      password_changed_at TIMESTAMP,
      settings JSONB DEFAULT '{}',
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
    )
  `)

  // Create sessions table
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      refresh_token_hash VARCHAR(255) NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      device_type VARCHAR(50),
      expires_at TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      revoked_at TIMESTAMP
    )
  `)

  // Create indexes for performance
  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)
  `)
  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
  `)
  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
  `)
  await pgPool.query(`
    CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token_hash ON sessions(refresh_token_hash)
  `)
}

/**
 * Private: Setup test tenant and default role
 */
async function setupTestTenantAndRole(): Promise<void> {
  if (!pgPool) throw new Error('PostgreSQL pool not initialized')

  // Create or get test tenant
  const tenantResult = await pgPool.query(
    `INSERT INTO tenants (name, subdomain, plan_type, is_active)
     VALUES ('Test Tenant', 'test-fortress', 'enterprise', true)
     ON CONFLICT (subdomain) DO UPDATE SET name = EXCLUDED.name
     RETURNING id`
  )
  testTenantId = tenantResult.rows[0].id

  // Create or get test role
  const roleResult = await pgPool.query(
    `INSERT INTO roles (tenant_id, name, level, is_system_role)
     VALUES ($1, 'User', 10, true)
     ON CONFLICT (tenant_id, name) DO UPDATE SET level = EXCLUDED.level
     RETURNING id`,
    [testTenantId]
  )
  testRoleId = roleResult.rows[0].id
}
