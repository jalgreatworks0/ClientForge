/**
 * Permission Repository
 * Database access layer for permissions and role-permission mappings
 */

import { Pool } from 'pg'
import { getPostgresPool } from '../../../config/database/postgres-config'
import { logger } from '../../utils/logging/logger'

export interface Permission {
  id: string
  resource: string
  action: string
  description?: string
  createdAt: Date
}

export interface Role {
  id: string
  tenantId: string
  name: string
  description?: string
  level: number
  isSystemRole: boolean
  createdAt: Date
  updatedAt: Date
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export class PermissionRepository {
  private pool: Pool

  constructor() {
    this.pool = getPostgresPool()
  }

  /**
   * Check if a role has a specific permission
   */
  async hasPermission(roleId: string, resource: string, action: string): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `SELECT 1
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = $1
           AND p.resource = $2
           AND p.action = $3
         LIMIT 1`,
        [roleId, resource, action]
      )

      return result.rows.length > 0
    } catch (error) {
      logger.error('Failed to check permission', {
        error,
        roleId,
        resource,
        action,
      })
      return false
    }
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    try {
      const result = await this.pool.query<Permission>(
        `SELECT p.id, p.resource, p.action, p.description, p.created_at as "createdAt"
         FROM permissions p
         JOIN role_permissions rp ON p.id = rp.permission_id
         WHERE rp.role_id = $1
         ORDER BY p.resource, p.action`,
        [roleId]
      )

      return result.rows
    } catch (error) {
      logger.error('Failed to get role permissions', { error, roleId })
      throw error
    }
  }

  /**
   * Get role by ID with its permissions
   */
  async getRoleWithPermissions(roleId: string, tenantId: string): Promise<RoleWithPermissions | null> {
    try {
      // Get role
      const roleResult = await this.pool.query<Role>(
        `SELECT id, tenant_id as "tenantId", name, description, level,
                is_system_role as "isSystemRole", created_at as "createdAt",
                updated_at as "updatedAt"
         FROM roles
         WHERE id = $1 AND tenant_id = $2`,
        [roleId, tenantId]
      )

      if (roleResult.rows.length === 0) {
        return null
      }

      const role = roleResult.rows[0]

      // Get permissions
      const permissions = await this.getRolePermissions(roleId)

      return {
        ...role,
        permissions,
      }
    } catch (error) {
      logger.error('Failed to get role with permissions', {
        error,
        roleId,
        tenantId,
      })
      throw error
    }
  }

  /**
   * Get all roles for a tenant
   */
  async getTenantRoles(tenantId: string): Promise<Role[]> {
    try {
      const result = await this.pool.query<Role>(
        `SELECT id, tenant_id as "tenantId", name, description, level,
                is_system_role as "isSystemRole", created_at as "createdAt",
                updated_at as "updatedAt"
         FROM roles
         WHERE tenant_id = $1
         ORDER BY level DESC, name`,
        [tenantId]
      )

      return result.rows
    } catch (error) {
      logger.error('Failed to get tenant roles', { error, tenantId })
      throw error
    }
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    try {
      const result = await this.pool.query<Permission>(
        `SELECT id, resource, action, description, created_at as "createdAt"
         FROM permissions
         ORDER BY resource, action`
      )

      return result.rows
    } catch (error) {
      logger.error('Failed to get all permissions', { error })
      throw error
    }
  }

  /**
   * Grant permission to role
   */
  async grantPermission(roleId: string, permissionId: string): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO role_permissions (role_id, permission_id)
         VALUES ($1, $2)
         ON CONFLICT (role_id, permission_id) DO NOTHING`,
        [roleId, permissionId]
      )

      logger.info('Permission granted to role', { roleId, permissionId })
    } catch (error) {
      logger.error('Failed to grant permission', { error, roleId, permissionId })
      throw error
    }
  }

  /**
   * Revoke permission from role
   */
  async revokePermission(roleId: string, permissionId: string): Promise<void> {
    try {
      await this.pool.query(
        `DELETE FROM role_permissions
         WHERE role_id = $1 AND permission_id = $2`,
        [roleId, permissionId]
      )

      logger.info('Permission revoked from role', { roleId, permissionId })
    } catch (error) {
      logger.error('Failed to revoke permission', { error, roleId, permissionId })
      throw error
    }
  }

  /**
   * Get role level (for hierarchy checks)
   */
  async getRoleLevel(roleId: string): Promise<number> {
    try {
      const result = await this.pool.query<{ level: number }>(
        `SELECT level FROM roles WHERE id = $1`,
        [roleId]
      )

      return result.rows[0]?.level || 0
    } catch (error) {
      logger.error('Failed to get role level', { error, roleId })
      return 0
    }
  }

  /**
   * Create a new permission (admin only)
   */
  async createPermission(
    resource: string,
    action: string,
    description?: string
  ): Promise<Permission> {
    try {
      const result = await this.pool.query<Permission>(
        `INSERT INTO permissions (resource, action, description)
         VALUES ($1, $2, $3)
         RETURNING id, resource, action, description, created_at as "createdAt"`,
        [resource, action, description]
      )

      logger.info('Permission created', { resource, action })

      return result.rows[0]
    } catch (error) {
      logger.error('Failed to create permission', { error, resource, action })
      throw error
    }
  }

  /**
   * Create a new role (admin only)
   */
  async createRole(
    tenantId: string,
    name: string,
    level: number,
    description?: string
  ): Promise<Role> {
    try {
      const result = await this.pool.query<Role>(
        `INSERT INTO roles (tenant_id, name, level, description, is_system_role)
         VALUES ($1, $2, $3, $4, false)
         RETURNING id, tenant_id as "tenantId", name, description, level,
                   is_system_role as "isSystemRole", created_at as "createdAt",
                   updated_at as "updatedAt"`,
        [tenantId, name, level, description]
      )

      logger.info('Role created', { tenantId, name, level })

      return result.rows[0]
    } catch (error) {
      logger.error('Failed to create role', { error, tenantId, name })
      throw error
    }
  }
}

// Export singleton instance
export const permissionRepository = new PermissionRepository()
