/**
 * Activity Timeline Service
 * Tracks all entity changes and user activities
 * Provides comprehensive audit trail and activity feed
 */

import { Pool } from 'pg';
import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';

export interface Activity {
  id: string;
  tenantId: string;
  userId: string;
  activityType: ActivityType;
  entityType: string;
  entityId: string;
  entityName?: string;
  action: ActivityAction;
  description: string;
  changes?: ActivityChange[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export type ActivityType =
  | 'contact'
  | 'deal'
  | 'company'
  | 'lead'
  | 'task'
  | 'invoice'
  | 'email'
  | 'note'
  | 'file'
  | 'user'
  | 'system';

export type ActivityAction =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'viewed'
  | 'archived'
  | 'restored'
  | 'assigned'
  | 'unassigned'
  | 'completed'
  | 'reopened'
  | 'sent'
  | 'received'
  | 'uploaded'
  | 'downloaded'
  | 'shared'
  | 'commented'
  | 'mentioned'
  | 'logged_in'
  | 'logged_out';

export interface ActivityChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface CreateActivityParams {
  tenantId: string;
  userId: string;
  activityType: ActivityType;
  entityType: string;
  entityId: string;
  entityName?: string;
  action: ActivityAction;
  description: string;
  changes?: ActivityChange[];
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

export class ActivityService {
  private pool: Pool;

  constructor() {
    this.pool = getPool();
  }

  /**
   * Log an activity
   */
  async log(params: CreateActivityParams): Promise<Activity> {
    try {
      const result = await this.pool.query(
        `INSERT INTO activities (
          tenant_id, user_id, activity_type, entity_type, entity_id, entity_name,
          action, description, changes, metadata, ip_address, user_agent
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          params.tenantId,
          params.userId,
          params.activityType,
          params.entityType,
          params.entityId,
          params.entityName,
          params.action,
          params.description,
          JSON.stringify(params.changes || []),
          JSON.stringify(params.metadata || {}),
          params.ipAddress,
          params.userAgent,
        ]
      );

      const activity = this.mapRowToActivity(result.rows[0]);

      logger.info('[Activity] Activity logged', {
        activityId: activity.id,
        entityType: params.entityType,
        action: params.action,
      });

      return activity;
    } catch (error: any) {
      logger.error('[Activity] Failed to log activity', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Get entity timeline
   */
  async getEntityTimeline(
    tenantId: string,
    entityType: string,
    entityId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Activity[]> {
    const { limit = 50, offset = 0 } = options;

    const result = await this.pool.query(
      `SELECT a.*, u.first_name, u.last_name, u.avatar_url
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.tenant_id = $1 AND a.entity_type = $2 AND a.entity_id = $3
       ORDER BY a.created_at DESC
       LIMIT $4 OFFSET $5`,
      [tenantId, entityType, entityId, limit, offset]
    );

    return result.rows.map((row) => this.mapRowToActivity(row));
  }

  /**
   * Get user activity feed
   */
  async getUserActivity(
    userId: string,
    tenantId: string,
    options: { limit?: number; offset?: number; activityTypes?: ActivityType[] } = {}
  ): Promise<Activity[]> {
    const { limit = 50, offset = 0, activityTypes } = options;

    let query = `
      SELECT a.*, u.first_name, u.last_name, u.avatar_url
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.tenant_id = $1 AND a.user_id = $2
    `;

    const params: any[] = [tenantId, userId];

    if (activityTypes && activityTypes.length > 0) {
      query += ` AND a.activity_type = ANY($3)`;
      params.push(activityTypes);
      query += ` ORDER BY a.created_at DESC LIMIT $4 OFFSET $5`;
      params.push(limit, offset);
    } else {
      query += ` ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`;
      params.push(limit, offset);
    }

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => this.mapRowToActivity(row));
  }

  /**
   * Get tenant-wide activity feed
   */
  async getTenantActivity(
    tenantId: string,
    options: { limit?: number; offset?: number; activityTypes?: ActivityType[]; userIds?: string[] } = {}
  ): Promise<Activity[]> {
    const { limit = 50, offset = 0, activityTypes, userIds } = options;

    let query = `
      SELECT a.*, u.first_name, u.last_name, u.avatar_url
      FROM activities a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (activityTypes && activityTypes.length > 0) {
      query += ` AND a.activity_type = ANY($${paramIndex})`;
      params.push(activityTypes);
      paramIndex++;
    }

    if (userIds && userIds.length > 0) {
      query += ` AND a.user_id = ANY($${paramIndex})`;
      params.push(userIds);
      paramIndex++;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return result.rows.map((row) => this.mapRowToActivity(row));
  }

  /**
   * Get activity statistics
   */
  async getStatistics(
    tenantId: string,
    options: { startDate?: Date; endDate?: Date; groupBy?: 'day' | 'week' | 'month' } = {}
  ): Promise<any> {
    const { startDate, endDate, groupBy = 'day' } = options;

    let dateFormat: string;
    switch (groupBy) {
      case 'week':
        dateFormat = 'YYYY-"W"IW';
        break;
      case 'month':
        dateFormat = 'YYYY-MM';
        break;
      default:
        dateFormat = 'YYYY-MM-DD';
    }

    let query = `
      SELECT
        TO_CHAR(created_at, '${dateFormat}') as period,
        activity_type,
        action,
        COUNT(*) as count
      FROM activities
      WHERE tenant_id = $1
    `;

    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` GROUP BY period, activity_type, action ORDER BY period DESC`;

    const result = await this.pool.query(query, params);

    return result.rows;
  }

  /**
   * Search activities
   */
  async search(
    tenantId: string,
    searchQuery: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Activity[]> {
    const { limit = 50, offset = 0 } = options;

    const result = await this.pool.query(
      `SELECT a.*, u.first_name, u.last_name, u.avatar_url
       FROM activities a
       LEFT JOIN users u ON a.user_id = u.id
       WHERE a.tenant_id = $1
       AND (
         a.description ILIKE $2
         OR a.entity_name ILIKE $2
         OR u.first_name ILIKE $2
         OR u.last_name ILIKE $2
       )
       ORDER BY a.created_at DESC
       LIMIT $3 OFFSET $4`,
      [tenantId, `%${searchQuery}%`, limit, offset]
    );

    return result.rows.map((row) => this.mapRowToActivity(row));
  }

  /**
   * Delete old activities (cleanup)
   */
  async cleanup(daysOld: number = 365): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM activities WHERE created_at < NOW() - INTERVAL '${daysOld} days'`
    );

    logger.info('[Activity] Cleaned up old activities', {
      deleted: result.rowCount,
      daysOld,
    });

    return result.rowCount || 0;
  }

  /**
   * Track field changes automatically
   */
  detectChanges(oldData: Record<string, any>, newData: Record<string, any>): ActivityChange[] {
    const changes: ActivityChange[] = [];

    // Find changed fields
    Object.keys(newData).forEach((key) => {
      if (oldData[key] !== newData[key]) {
        changes.push({
          field: key,
          oldValue: oldData[key],
          newValue: newData[key],
        });
      }
    });

    return changes;
  }

  /**
   * Format activity description with change details
   */
  formatDescription(action: ActivityAction, entityType: string, entityName?: string, changes?: ActivityChange[]): string {
    const entity = entityName || entityType;
    let description = `${this.capitalizeFirst(action)} ${entity}`;

    if (changes && changes.length > 0) {
      const fieldNames = changes.map((c) => c.field).join(', ');
      description += ` (${fieldNames})`;
    }

    return description;
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  private mapRowToActivity(row: any): Activity {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      userId: row.user_id,
      activityType: row.activity_type,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      action: row.action,
      description: row.description,
      changes: this.parseJSON(row.changes),
      metadata: this.parseJSON(row.metadata),
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    };
  }

  private parseJSON(value: any): any {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }
    return value || [];
  }
}

// Export singleton instance
export const activityService = new ActivityService();
