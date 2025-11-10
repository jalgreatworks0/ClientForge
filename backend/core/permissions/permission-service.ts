/**
 * Permission Service
 * Business logic for permission checking and role management
 */

import { logger } from '../../utils/logging/logger'
import { ForbiddenError, NotFoundError } from '../../utils/errors/app-error'

import { permissionRepository, Permission, Role, RoleWithPermissions } from './permission-repository'

export class PermissionService {
  /**
   * Check if a user has permission to perform an action on a resource
   */
  async checkPermission(roleId: string, resource: string, action: string): Promise<boolean> {
    try {
      const hasPermission = await permissionRepository.hasPermission(roleId, resource, action)

      logger.debug('Permission check', {
        roleId,
        resource,
        action,
        result: hasPermission,
      })

      return hasPermission
    } catch (error) {
      logger.error('Permission check failed', { error, roleId, resource, action })
      return false
    }
  }

  /**
   * Require permission (throws if not authorized)
   */
  async requirePermission(roleId: string, resource: string, action: string): Promise<void> {
    const hasPermission = await this.checkPermission(roleId, resource, action)

    if (!hasPermission) {
      throw new ForbiddenError(
        `Missing required permission: ${action} on ${resource}`
      )
    }
  }

  /**
   * Check if user's role level meets minimum requirement
   */
  async checkRoleLevel(roleId: string, minLevel: number): Promise<boolean> {
    try {
      const roleLevel = await permissionRepository.getRoleLevel(roleId)

      logger.debug('Role level check', {
        roleId,
        roleLevel,
        minLevel,
        result: roleLevel >= minLevel,
      })

      return roleLevel >= minLevel
    } catch (error) {
      logger.error('Role level check failed', { error, roleId, minLevel })
      return false
    }
  }

  /**
   * Require minimum role level (throws if not authorized)
   */
  async requireRoleLevel(roleId: string, minLevel: number): Promise<void> {
    const meetsRequirement = await this.checkRoleLevel(roleId, minLevel)

    if (!meetsRequirement) {
      throw new ForbiddenError('Insufficient role level for this operation')
    }
  }

  /**
   * Get all permissions for a role
   */
  async getRolePermissions(roleId: string): Promise<Permission[]> {
    return await permissionRepository.getRolePermissions(roleId)
  }

  /**
   * Get role with all its permissions
   */
  async getRoleWithPermissions(
    roleId: string,
    tenantId: string
  ): Promise<RoleWithPermissions> {
    const role = await permissionRepository.getRoleWithPermissions(roleId, tenantId)

    if (!role) {
      throw new NotFoundError('Role')
    }

    return role
  }

  /**
   * Get all roles for a tenant
   */
  async getTenantRoles(tenantId: string): Promise<Role[]> {
    return await permissionRepository.getTenantRoles(tenantId)
  }

  /**
   * Get all available permissions
   */
  async getAllPermissions(): Promise<Permission[]> {
    return await permissionRepository.getAllPermissions()
  }

  /**
   * Grant permission to a role
   */
  async grantPermission(
    roleId: string,
    permissionId: string,
    grantedBy: string
  ): Promise<void> {
    // TODO: Add audit logging
    await permissionRepository.grantPermission(roleId, permissionId)

    logger.info('Permission granted', {
      roleId,
      permissionId,
      grantedBy,
    })
  }

  /**
   * Revoke permission from a role
   */
  async revokePermission(
    roleId: string,
    permissionId: string,
    revokedBy: string
  ): Promise<void> {
    // TODO: Add audit logging
    await permissionRepository.revokePermission(roleId, permissionId)

    logger.info('Permission revoked', {
      roleId,
      permissionId,
      revokedBy,
    })
  }

  /**
   * Create a new custom role
   */
  async createRole(
    tenantId: string,
    name: string,
    level: number,
    description?: string,
    createdBy?: string
  ): Promise<Role> {
    // Validate role level (0-100, with system roles at 90+)
    if (level < 0 || level > 89) {
      throw new Error('Custom role level must be between 0 and 89')
    }

    const role = await permissionRepository.createRole(
      tenantId,
      name,
      level,
      description
    )

    logger.info('Role created', {
      roleId: role.id,
      tenantId,
      name,
      level,
      createdBy,
    })

    return role
  }

  /**
   * Create a new permission (system admin only)
   */
  async createPermission(
    resource: string,
    action: string,
    description?: string,
    createdBy?: string
  ): Promise<Permission> {
    const permission = await permissionRepository.createPermission(
      resource,
      action,
      description
    )

    logger.info('Permission created', {
      permissionId: permission.id,
      resource,
      action,
      createdBy,
    })

    return permission
  }

  /**
   * Bulk grant permissions to a role
   */
  async bulkGrantPermissions(
    roleId: string,
    permissionIds: string[],
    grantedBy: string
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      await this.grantPermission(roleId, permissionId, grantedBy)
    }

    logger.info('Bulk permissions granted', {
      roleId,
      count: permissionIds.length,
      grantedBy,
    })
  }

  /**
   * Bulk revoke permissions from a role
   */
  async bulkRevokePermissions(
    roleId: string,
    permissionIds: string[],
    revokedBy: string
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      await this.revokePermission(roleId, permissionId, revokedBy)
    }

    logger.info('Bulk permissions revoked', {
      roleId,
      count: permissionIds.length,
      revokedBy,
    })
  }
}

// Export singleton instance
export const permissionService = new PermissionService()
