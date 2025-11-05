/**
 * Test Database Setup
 * Helper functions for setting up and tearing down test database
 */

import { Pool } from 'pg'
import { getPostgresPool } from '../../config/database/postgres-config'
import { getRedisClient } from '../../config/database/redis-config'
import { getMongoClient } from '../../config/database/mongodb-config'

export class TestDatabaseSetup {
  private pgPool: Pool
  private redisClient: any
  private mongoClient: any

  async initialize(): Promise<void> {
    console.log('🔧 Initializing test database connections...')

    // Initialize PostgreSQL
    this.pgPool = getPostgresPool()

    // Initialize Redis
    this.redisClient = await getRedisClient()

    // Initialize MongoDB
    this.mongoClient = await getMongoClient()

    console.log('✅ Test database connections initialized')
  }

  async setupSchema(): Promise<void> {
    console.log('📝 Setting up test database schema...')

    // Run migrations or create tables
    await this.createTenantsTables()
    await this.createUsersTables()
    await this.createRolesTables()
    await this.createPermissionsTables()
    await this.createSessionsTables()

    console.log('✅ Test database schema created')
  }

  async seedTestData(): Promise<void> {
    console.log('🌱 Seeding test data...')

    // Create test tenant
    const tenantResult = await this.pgPool.query(
      `INSERT INTO tenants (name, subdomain, plan_type, is_active)
       VALUES ('Test Tenant', 'test', 'enterprise', true)
       RETURNING id`
    )
    const tenantId = tenantResult.rows[0].id

    // Create test roles
    await this.pgPool.query(
      `INSERT INTO roles (tenant_id, name, level, is_system_role)
       VALUES
         ($1, 'Admin', 30, true),
         ($1, 'Manager', 20, true),
         ($1, 'User', 10, true)`,
      [tenantId]
    )

    // Create test permissions
    await this.pgPool.query(
      `INSERT INTO permissions (resource, action, description)
       VALUES
         ('users', 'create', 'Create users'),
         ('users', 'read', 'Read users'),
         ('users', 'update', 'Update users'),
         ('users', 'delete', 'Delete users'),
         ('contacts', 'create', 'Create contacts'),
         ('contacts', 'read', 'Read contacts'),
         ('contacts', 'update', 'Update contacts'),
         ('contacts', 'delete', 'Delete contacts')`
    )

    console.log('✅ Test data seeded')
  }

  async cleanupTestData(): Promise<void> {
    console.log('🧹 Cleaning up test data...')

    // Delete in reverse order of dependencies
    await this.pgPool.query('DELETE FROM role_permissions')
    await this.pgPool.query('DELETE FROM permissions')
    await this.pgPool.query('DELETE FROM users')
    await this.pgPool.query('DELETE FROM roles')
    await this.pgPool.query('DELETE FROM tenants')

    // Clear Redis
    await this.redisClient.flushDb()

    // Clear MongoDB test collections
    const db = this.mongoClient.db('clientforge_test')
    await db.collection('audit_logs').deleteMany({})

    console.log('✅ Test data cleaned up')
  }

  async teardown(): Promise<void> {
    console.log('🔌 Closing test database connections...')

    await this.pgPool.end()
    await this.redisClient.quit()
    await this.mongoClient.close()

    console.log('✅ Test database connections closed')
  }

  // Private helper methods

  private async createTenantsTables(): Promise<void> {
    await this.pgPool.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP
      )
    `)

    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_tenants_subdomain ON tenants(subdomain)
    `)
  }

  private async createUsersTables(): Promise<void> {
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        email VARCHAR(255) NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL,
        role_id UUID NOT NULL,
        is_active BOOLEAN DEFAULT true,
        is_verified BOOLEAN DEFAULT false,
        last_login_at TIMESTAMP,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP,
        CONSTRAINT unique_email_per_tenant UNIQUE (tenant_id, email)
      )
    `)

    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)
    `)
    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)
    `)
  }

  private async createRolesTables(): Promise<void> {
    await this.pgPool.query(`
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

    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_roles_tenant_id ON roles(tenant_id)
    `)
  }

  private async createPermissionsTables(): Promise<void> {
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        resource VARCHAR(100) NOT NULL,
        action VARCHAR(50) NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_permission UNIQUE (resource, action)
      )
    `)

    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
        permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
        granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (role_id, permission_id)
      )
    `)
  }

  private async createSessionsTables(): Promise<void> {
    await this.pgPool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        refresh_token_hash VARCHAR(255) NOT NULL,
        ip_address VARCHAR(45),
        user_agent TEXT,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    await this.pgPool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `)
  }
}

// Export singleton instance
export const testDb = new TestDatabaseSetup()
