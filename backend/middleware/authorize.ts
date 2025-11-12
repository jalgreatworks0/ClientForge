/**
 * Authorization Middleware
 * Role-based access control (RBAC) middleware
 */

import { Response, NextFunction } from 'express'

import { ForbiddenError } from '../utils/errors/app-error'
import { logger } from '../utils/logging/logger'
import { auditLogger } from '../utils/logging/audit-logger'
import { permissionService } from '../core/permissions/permission-service'

import { AuthRequest } from './auth'

/**
 * Role hierarchy levels (higher number = more permissions)
 */
export const RoleLevel = {
  GUEST: 0,
  USER: 10,
  MANAGER: 20,
  ADMIN: 30,
  SUPER_ADMIN: 100,
} as const

/**
 * Role names mapped to levels
 */
export const RoleLevels: Record<string, number> = {
  guest: RoleLevel.GUEST,
  user: RoleLevel.USER,
  manager: RoleLevel.MANAGER,
  admin: RoleLevel.ADMIN,
  super_admin: RoleLevel.SUPER_ADMIN,
}

/**
 * Middleware factory to check if user has required role level
 *
 * @param minLevel - Minimum role level required
 * @returns Express middleware function
 *
 * @example
 * router.get('/admin/users', authenticate, authorize(RoleLevel.ADMIN), getUsers)
 */
export function authorize(minLevel: number) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not authenticated')
      }

      // Check user's role level from database
      const meetsRequirement = await permissionService.checkRoleLevel(req.user.role, minLevel)

      if (!meetsRequirement) {
        logger.warn('Authorization denied - insufficient permissions', {
          userId: req.user.id,
          tenantId: req.user.tenantId,
          requiredLevel: minLevel,
          path: req.path,
          method: req.method,
        })

        // Audit log the permission denial
        await auditLogger.logPermissionDenied(
          req.user.id,
          req.user.tenantId,
          req.path,
          req.method,
          `Required level ${minLevel}`
        )

        throw new ForbiddenError('Insufficient permissions to access this resource')
      }

      // User has sufficient permissions
      logger.debug('Authorization granted', {
        userId: req.user.id,
        requiredLevel: minLevel,
      })

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware to check if user has specific permission
 *
 * @param permission - Permission name (e.g., 'users:read', 'deals:write')
 * @returns Express middleware function
 *
 * @example
 * router.delete('/users/:id', authenticate, requirePermission('users:delete'), deleteUser)
 */
export function requirePermission(permission: string) {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not authenticated')
      }

      // TEMPORARY: Bypass permission check for Administrator/Super Admin roles until RBAC tables are created
      // TODO: Remove this bypass once permissions/role_permissions tables are migrated
      const adminRoles = [
        '00000000-0000-0000-0000-000000000001', // Administrator
        '0248fda3-1768-4a0f-97b8-b2b91bc8d3c3', // Super Admin
      ]

      if (adminRoles.includes(req.user.role)) {
        logger.debug('Admin bypass - permission check skipped', {
          userId: req.user.id,
          permission,
          path: req.path,
          roleId: req.user.role,
        })
        next()
        return
      }

      // Parse permission (format: "resource:action")
      const [resource, action] = permission.split(':')

      if (!resource || !action) {
        throw new Error('Invalid permission format. Expected "resource:action"')
      }

      // Check permission from database
      const hasPermission = await permissionService.checkPermission(
        req.user.role,
        resource,
        action
      )

      if (!hasPermission) {
        logger.warn('Authorization denied - missing permission', {
          userId: req.user.id,
          tenantId: req.user.tenantId,
          permission,
          path: req.path,
          method: req.method,
        })

        await auditLogger.logPermissionDenied(
          req.user.id,
          req.user.tenantId,
          req.path,
          req.method,
          `Missing permission: ${permission}`
        )

        throw new ForbiddenError(`Missing required permission: ${permission}`)
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware to check if user belongs to the requested tenant
 * Prevents cross-tenant data access
 *
 * @param tenantIdParam - Request parameter name containing tenant ID (default: 'tenantId')
 * @returns Express middleware function
 *
 * @example
 * router.get('/tenants/:tenantId/users', authenticate, requireTenantAccess(), getUsers)
 */
export function requireTenantAccess(tenantIdParam: string = 'tenantId') {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not authenticated')
      }

      const requestedTenantId = req.params[tenantIdParam] || req.body[tenantIdParam]

      if (!requestedTenantId) {
        throw new ForbiddenError('Tenant ID not provided')
      }

      // Check if user's tenantId matches the requested tenantId
      if (req.user.tenantId !== requestedTenantId) {
        logger.warn('Authorization denied - cross-tenant access attempt', {
          userId: req.user.id,
          userTenantId: req.user.tenantId,
          requestedTenantId,
          path: req.path,
          method: req.method,
        })

        await auditLogger.logPermissionDenied(
          req.user.id,
          req.user.tenantId,
          req.path,
          req.method,
          `Cross-tenant access attempt: ${requestedTenantId}`
        )

        throw new ForbiddenError('Access denied to requested tenant')
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}

/**
 * Middleware to check if user owns the requested resource
 * Prevents unauthorized access to other users' resources
 *
 * @param userIdParam - Request parameter name containing user ID (default: 'userId')
 * @returns Express middleware function
 *
 * @example
 * router.put('/users/:userId/profile', authenticate, requireResourceOwnership(), updateProfile)
 */
export function requireResourceOwnership(userIdParam: string = 'userId') {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new ForbiddenError('User not authenticated')
      }

      const requestedUserId = req.params[userIdParam] || req.body[userIdParam]

      if (!requestedUserId) {
        throw new ForbiddenError('User ID not provided')
      }

      // Check if authenticated user matches the requested user
      if (req.user.id !== requestedUserId) {
        logger.warn('Authorization denied - resource ownership violation', {
          userId: req.user.id,
          requestedUserId,
          path: req.path,
          method: req.method,
        })

        await auditLogger.logPermissionDenied(
          req.user.id,
          req.user.tenantId,
          req.path,
          req.method,
          `Attempted to access resource owned by ${requestedUserId}`
        )

        throw new ForbiddenError('Access denied to requested resource')
      }

      next()
    } catch (error) {
      next(error)
    }
  }
}
