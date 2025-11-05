/**
 * Audit Logger
 * Logs all security-relevant events to audit_logs table
 */

import { getMongoDatabase } from '../../../config/database/mongodb-config'
import { logger } from './logger'

export interface AuditLogEntry {
  tenantId: string
  userId?: string
  action: string
  resourceType?: string
  resourceId?: string
  oldValues?: Record<string, any>
  newValues?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  status: 'success' | 'failure' | 'blocked'
  errorMessage?: string
  metadata?: Record<string, any>
}

export class AuditLogger {
  /**
   * Log a successful action
   */
  async logSuccess(entry: Omit<AuditLogEntry, 'status'>): Promise<void> {
    await this.log({ ...entry, status: 'success' })
  }

  /**
   * Log a failed action
   */
  async logFailure(entry: Omit<AuditLogEntry, 'status'>): Promise<void> {
    await this.log({ ...entry, status: 'failure' })
  }

  /**
   * Log a blocked action
   */
  async logBlocked(entry: Omit<AuditLogEntry, 'status'>): Promise<void> {
    await this.log({ ...entry, status: 'blocked' })
  }

  /**
   * Core logging method
   */
  private async log(entry: AuditLogEntry): Promise<void> {
    try {
      const db = await getMongoDatabase()
      const auditLogs = db.collection('audit_logs')

      await auditLogs.insertOne({
        ...entry,
        createdAt: new Date(),
      })

      // Also log to Winston for immediate visibility
      const logLevel = entry.status === 'success' ? 'info' : 'warn'
      logger.log(logLevel, `Audit: ${entry.action}`, {
        tenantId: entry.tenantId,
        userId: entry.userId,
        resourceType: entry.resourceType,
        resourceId: entry.resourceId,
        status: entry.status,
      })
    } catch (error) {
      // Never throw from audit logger - log error and continue
      logger.error('Failed to write audit log', {
        error,
        entry: {
          action: entry.action,
          tenantId: entry.tenantId,
          userId: entry.userId,
        },
      })
    }
  }

  /**
   * Log successful login
   */
  async logSuccessfulLogin(
    userId: string,
    email: string,
    tenantId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logSuccess({
      tenantId,
      userId,
      action: 'user_login',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      userAgent,
      metadata: { email },
    })
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(
    email: string,
    tenantId: string,
    reason: string,
    failedAttempts?: number,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.logFailure({
      tenantId,
      action: 'user_login_failed',
      resourceType: 'user',
      errorMessage: reason,
      ipAddress,
      userAgent,
      metadata: { email, failedAttempts },
    })
  }

  /**
   * Log account locked
   */
  async logAccountLocked(
    userId: string,
    email: string,
    tenantId: string,
    failedAttempts: number,
    ipAddress?: string
  ): Promise<void> {
    await this.logBlocked({
      tenantId,
      userId,
      action: 'account_locked',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      metadata: { email, failedAttempts },
    })
  }

  /**
   * Log logout
   */
  async logLogout(userId: string, tenantId?: string): Promise<void> {
    await this.logSuccess({
      tenantId: tenantId || 'unknown',
      userId,
      action: 'user_logout',
      resourceType: 'user',
      resourceId: userId,
    })
  }

  /**
   * Log password change
   */
  async logPasswordChange(
    userId: string,
    tenantId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      tenantId,
      userId,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
    })
  }

  /**
   * Log permission check failure
   */
  async logPermissionDenied(
    userId: string,
    tenantId: string,
    resource: string,
    action: string,
    reason?: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logBlocked({
      tenantId,
      userId,
      action: 'permission_denied',
      resourceType: resource,
      errorMessage: reason,
      ipAddress,
      metadata: { requiredPermission: `${resource}:${action}` },
    })
  }

  /**
   * Log password reset requested
   */
  async logPasswordResetRequested(
    userId: string,
    email: string,
    tenantId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      tenantId,
      userId,
      action: 'password_reset_requested',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      metadata: { email },
    })
  }

  /**
   * Log password changed (via reset or settings)
   */
  async logPasswordChanged(
    userId: string,
    email: string,
    tenantId: string,
    ipAddress?: string
  ): Promise<void> {
    await this.logSuccess({
      tenantId,
      userId,
      action: 'password_changed',
      resourceType: 'user',
      resourceId: userId,
      ipAddress,
      metadata: { email },
    })
  }
}

// Export singleton instance
export const auditLogger = new AuditLogger()
