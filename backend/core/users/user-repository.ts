/**
 * User Repository
 * Database access layer for users table
 */

import { Pool } from 'pg'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { logger } from '../../utils/logging/logger'
import { NotFoundError } from '../../utils/errors/app-error'

export interface User {
  id: string
  tenantId: string
  roleId: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string
  avatarUrl?: string
  timezone: string
  language: string
  isActive: boolean
  isVerified: boolean
  isLocked: boolean
  emailVerifiedAt?: Date
  lastLoginAt?: Date
  lastLoginIp?: string
  failedLoginAttempts: number
  lockedUntil?: Date
  passwordChangedAt?: Date
  settings: Record<string, any>
  metadata: Record<string, any>
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  role?: {
    id: string
    name: string
    level: number
  }
}

export interface CreateUserData {
  tenantId: string
  roleId: string
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  phone?: string
  timezone?: string
  language?: string
}

export interface UpdateUserData {
  firstName?: string
  lastName?: string
  phone?: string
  avatarUrl?: string
  timezone?: string
  language?: string
  settings?: Record<string, any>
  metadata?: Record<string, any>
}

export class UserRepository {
  private pool: Pool

  constructor() {
    this.pool = getPostgresPool()
  }

  /**
   * Find user by email and tenant
   */
  async findByEmailAndTenant(email: string, tenantId: string): Promise<User | null> {
    try {
      const result = await this.pool.query<User>(
        `SELECT
          u.*,
          ur.role_id,
          json_build_object(
            'id', r.id,
            'name', r.name,
            'level', 0
          ) as role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.email = $1
          AND u.tenant_id = $2`,
        [email, tenantId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToUser(result.rows[0])
    } catch (error) {
      logger.error('Failed to find user by email and tenant', {
        error,
        email,
        tenantId,
      })
      throw error
    }
  }

  /**
   * Find user by ID
   */
  async findById(id: string, tenantId: string): Promise<User | null> {
    try {
      const result = await this.pool.query<User>(
        `SELECT
          u.*,
          ur.role_id,
          json_build_object(
            'id', r.id,
            'name', r.name,
            'level', 0
          ) as role
        FROM users u
        LEFT JOIN user_roles ur ON u.id = ur.user_id
        LEFT JOIN roles r ON ur.role_id = r.id
        WHERE u.id = $1
          AND u.tenant_id = $2`,
        [id, tenantId]
      )

      if (result.rows.length === 0) {
        return null
      }

      return this.mapRowToUser(result.rows[0])
    } catch (error) {
      logger.error('Failed to find user by ID', { error, id, tenantId })
      throw error
    }
  }

  /**
   * Create new user
   */
  async create(data: CreateUserData): Promise<User> {
    const client = await this.pool.connect()
    try {
      await client.query('BEGIN')

      // Insert user
      const userResult = await client.query<User>(
        `INSERT INTO users (
          tenant_id, email, password_hash,
          first_name, last_name, phone, timezone, locale
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          data.tenantId,
          data.email.toLowerCase(),
          data.passwordHash,
          data.firstName,
          data.lastName,
          data.phone || null,
          data.timezone || 'UTC',
          data.language || 'en',
        ]
      )

      const user = userResult.rows[0]

      // Insert user role
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
        [user.id, data.roleId]
      )

      await client.query('COMMIT')

      logger.info('User created', {
        userId: user.id,
        email: data.email,
        tenantId: data.tenantId,
      })

      // Fetch complete user with role
      return this.findById(user.id, data.tenantId) as Promise<User>
    } catch (error) {
      await client.query('ROLLBACK')
      logger.error('Failed to create user', { error, email: data.email })
      throw error
    } finally {
      client.release()
    }
  }

  /**
   * Update user
   */
  async update(id: string, tenantId: string, data: UpdateUserData): Promise<User> {
    try {
      const updates: string[] = []
      const values: any[] = []
      let paramIndex = 1

      if (data.firstName !== undefined) {
        updates.push(`first_name = $${paramIndex++}`)
        values.push(data.firstName)
      }

      if (data.lastName !== undefined) {
        updates.push(`last_name = $${paramIndex++}`)
        values.push(data.lastName)
      }

      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`)
        values.push(data.phone)
      }

      if (data.avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`)
        values.push(data.avatarUrl)
      }

      if (data.timezone !== undefined) {
        updates.push(`timezone = $${paramIndex++}`)
        values.push(data.timezone)
      }

      if (data.language !== undefined) {
        updates.push(`language = $${paramIndex++}`)
        values.push(data.language)
      }

      if (data.settings !== undefined) {
        updates.push(`settings = $${paramIndex++}`)
        values.push(JSON.stringify(data.settings))
      }

      if (data.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`)
        values.push(JSON.stringify(data.metadata))
      }

      if (updates.length === 0) {
        throw new Error('No fields to update')
      }

      // Add updated_at
      updates.push(`updated_at = CURRENT_TIMESTAMP`)

      // Add WHERE conditions
      values.push(id, tenantId)

      const result = await this.pool.query<User>(
        `UPDATE users
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++}
          AND tenant_id = $${paramIndex++}
          AND deleted_at IS NULL
        RETURNING *`,
        values
      )

      if (result.rows.length === 0) {
        throw new NotFoundError('User')
      }

      logger.info('User updated', { userId: id, tenantId, updates: Object.keys(data) })

      return this.mapRowToUser(result.rows[0])
    } catch (error) {
      logger.error('Failed to update user', { error, userId: id, tenantId })
      throw error
    }
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(id: string, ipAddress?: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
        SET last_login_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [id]
      )

      logger.debug('User last login updated', { userId: id })
    } catch (error) {
      logger.error('Failed to update last login', { error, userId: id })
      throw error
    }
  }

  /**
   * Increment failed login attempts
   */
  async incrementFailedLoginAttempts(id: string): Promise<number> {
    try {
      const result = await this.pool.query<{ failedLoginAttempts: number }>(
        `UPDATE users
        SET failed_login_attempts = failed_login_attempts + 1,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING failed_login_attempts`,
        [id]
      )

      const attempts = result.rows[0]?.failedLoginAttempts || 0

      logger.debug('Failed login attempts incremented', { userId: id, attempts })

      return attempts
    } catch (error) {
      logger.error('Failed to increment login attempts', { error, userId: id })
      throw error
    }
  }

  /**
   * Reset failed login attempts
   */
  async resetFailedLoginAttempts(id: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [id]
      )

      logger.debug('Failed login attempts reset', { userId: id })
    } catch (error) {
      logger.error('Failed to reset login attempts', { error, userId: id })
      throw error
    }
  }

  /**
   * Lock user account
   */
  async lockAccount(id: string, lockUntil: Date): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
        SET locked_until = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [id, lockUntil]
      )

      logger.warn('User account locked', { userId: id, lockUntil })
    } catch (error) {
      logger.error('Failed to lock account', { error, userId: id })
      throw error
    }
  }

  /**
   * Update password
   */
  async updatePassword(id: string, passwordHash: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
        SET password_hash = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1`,
        [id, passwordHash]
      )

      logger.info('User password updated', { userId: id })
    } catch (error) {
      logger.error('Failed to update password', { error, userId: id })
      throw error
    }
  }

  /**
   * Soft delete user
   */
  async delete(id: string, tenantId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
        SET deleted_at = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND tenant_id = $2`,
        [id, tenantId]
      )

      logger.info('User deleted (soft)', { userId: id, tenantId })
    } catch (error) {
      logger.error('Failed to delete user', { error, userId: id, tenantId })
      throw error
    }
  }

  /**
   * Map database row to User object
   */
  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      roleId: row.role_id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      avatarUrl: row.avatar_url,
      timezone: row.timezone || 'UTC',
      language: row.locale || 'en',
      isActive: row.is_active !== false,
      isVerified: row.email_verified || false,
      isLocked: row.locked_until ? new Date(row.locked_until) > new Date() : false,
      emailVerifiedAt: row.email_verified_at,
      lastLoginAt: row.last_login_at,
      lastLoginIp: row.last_login_ip,
      failedLoginAttempts: row.failed_login_attempts || 0,
      lockedUntil: row.locked_until,
      passwordChangedAt: row.password_changed_at,
      settings: {},
      metadata: {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      role: row.role,
    }
  }
}

// Export singleton instance
export const userRepository = new UserRepository()
