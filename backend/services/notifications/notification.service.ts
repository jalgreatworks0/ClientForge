/**
 * Notification Service
 * Multi-channel notification system supporting:
 * - In-app notifications (WebSocket + database)
 * - Email notifications
 * - SMS notifications (Twilio)
 * - Push notifications (FCM)
 */

import { EventEmitter } from 'events';

import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';
import { emailService } from '../email/email.service';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  priority: NotificationPriority;
  read: boolean;
  actionUrl?: string;
  imageUrl?: string;
  createdAt: Date;
  readAt?: Date;
  expiresAt?: Date;
}

export type NotificationType =
  | 'deal_created'
  | 'deal_updated'
  | 'deal_won'
  | 'deal_lost'
  | 'contact_created'
  | 'contact_updated'
  | 'task_assigned'
  | 'task_due_soon'
  | 'task_overdue'
  | 'invoice_paid'
  | 'invoice_overdue'
  | 'payment_failed'
  | 'subscription_renewed'
  | 'subscription_cancelled'
  | 'team_mention'
  | 'comment_added'
  | 'file_uploaded'
  | 'report_ready'
  | 'system_alert';

export type NotificationChannel = 'in_app' | 'email' | 'sms' | 'push';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  channels: {
    in_app: boolean;
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  types: Partial<Record<NotificationType, NotificationChannel[]>>;
  quietHours?: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;
  };
}

export interface CreateNotificationParams {
  tenantId: string;
  userId: string | string[]; // Can send to multiple users
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
  priority?: NotificationPriority;
  actionUrl?: string;
  imageUrl?: string;
  expiresAt?: Date;
}

export class NotificationService extends EventEmitter {
  private pool: Pool;

  constructor() {
    super();
    this.pool = getPool();
  }

  /**
   * Send a notification to one or multiple users
   */
  async send(params: CreateNotificationParams): Promise<Notification[]> {
    try {
      const userIds = Array.isArray(params.userId) ? params.userId : [params.userId];
      const notifications: Notification[] = [];

      for (const userId of userIds) {
        // Get user preferences
        const preferences = await this.getPreferences(userId, params.tenantId);

        // Determine channels based on preferences and params
        const channels = this.determineChannels(params, preferences);

        // Check quiet hours
        if (await this.isQuietHours(preferences)) {
          // Skip non-urgent notifications during quiet hours
          if (params.priority !== 'urgent') {
            logger.info('[Notifications] Skipped due to quiet hours', { userId });
            continue;
          }
        }

        // Create in-app notification
        const notification = await this.createNotification({
          tenantId: params.tenantId,
          userId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data,
          channels,
          priority: params.priority || 'normal',
          actionUrl: params.actionUrl,
          imageUrl: params.imageUrl,
          expiresAt: params.expiresAt,
        });

        notifications.push(notification);

        // Send via channels
        await this.deliverViaChannels(notification, channels, preferences);
      }

      return notifications;
    } catch (error: any) {
      logger.error('[Notifications] Failed to send notification', {
        error: error.message,
        params,
      });
      throw error;
    }
  }

  /**
   * Create in-app notification
   */
  private async createNotification(params: Omit<CreateNotificationParams, 'userId'> & { userId: string }): Promise<Notification> {
    const result = await this.pool.query(
      `INSERT INTO notifications (
        tenantId, user_id, type, title, message, data, channels, priority,
        action_url, image_url, expires_at, read
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, false)
      RETURNING *`,
      [
        params.tenantId,
        params.userId,
        params.type,
        params.title,
        params.message,
        JSON.stringify(params.data || {}),
        JSON.stringify(params.channels || ['in_app']),
        params.priority || 'normal',
        params.actionUrl,
        params.imageUrl,
        params.expiresAt,
      ]
    );

    return this.mapRowToNotification(result.rows[0]);
  }

  /**
   * Deliver notification via configured channels
   */
  private async deliverViaChannels(
    notification: Notification,
    channels: NotificationChannel[],
    preferences: NotificationPreferences
  ): Promise<void> {
    const deliveryPromises: Promise<any>[] = [];

    // In-app (WebSocket)
    if (channels.includes('in_app')) {
      deliveryPromises.push(this.deliverInApp(notification));
    }

    // Email
    if (channels.includes('email')) {
      deliveryPromises.push(this.deliverEmail(notification));
    }

    // SMS
    if (channels.includes('sms')) {
      deliveryPromises.push(this.deliverSMS(notification));
    }

    // Push
    if (channels.includes('push')) {
      deliveryPromises.push(this.deliverPush(notification));
    }

    // Wait for all deliveries (don't fail if one channel fails)
    await Promise.allSettled(deliveryPromises);
  }

  /**
   * Deliver in-app notification via WebSocket
   */
  private async deliverInApp(notification: Notification): Promise<void> {
    try {
      // Emit event that WebSocket server will listen to
      this.emit('notification:new', notification);

      logger.info('[Notifications] In-app notification delivered', {
        notificationId: notification.id,
        userId: notification.userId,
      });
    } catch (error: any) {
      logger.error('[Notifications] In-app delivery failed', {
        error: error.message,
        notificationId: notification.id,
      });
    }
  }

  /**
   * Deliver notification via email
   */
  private async deliverEmail(notification: Notification): Promise<void> {
    try {
      // Get user email
      const userResult = await this.pool.query(
        'SELECT email, first_name FROM users WHERE id = $1',
        [notification.userId]
      );

      if (userResult.rows.length === 0) return;

      const user = userResult.rows[0];

      // Send email
      await emailService.send({
        to: user.email,
        subject: notification.title,
        html: this.generateEmailHTML(notification, user.first_name),
      });

      logger.info('[Notifications] Email notification delivered', {
        notificationId: notification.id,
        email: user.email,
      });
    } catch (error: any) {
      logger.error('[Notifications] Email delivery failed', {
        error: error.message,
        notificationId: notification.id,
      });
    }
  }

  /**
   * Deliver notification via SMS (Twilio)
   */
  private async deliverSMS(notification: Notification): Promise<void> {
    try {
      // Get user phone number
      const userResult = await this.pool.query(
        'SELECT phone FROM users WHERE id = $1',
        [notification.userId]
      );

      if (userResult.rows.length === 0 || !userResult.rows[0].phone) return;

      const phone = userResult.rows[0].phone;

      // Check if Twilio is configured
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        logger.warn('[Notifications] Twilio not configured - SMS skipped');
        return;
      }

      // Import Twilio dynamically
      const twilio = await import('twilio');
      const client = twilio.default(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      // Send SMS
      await client.messages.create({
        body: `${notification.title}: ${notification.message}`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone,
      });

      logger.info('[Notifications] SMS notification delivered', {
        notificationId: notification.id,
        phone,
      });
    } catch (error: any) {
      logger.error('[Notifications] SMS delivery failed', {
        error: error.message,
        notificationId: notification.id,
      });
    }
  }

  /**
   * Deliver push notification (Firebase Cloud Messaging)
   */
  private async deliverPush(notification: Notification): Promise<void> {
    try {
      // Get user FCM tokens
      const tokenResult = await this.pool.query(
        'SELECT fcm_token FROM user_devices WHERE user_id = $1 AND fcm_token IS NOT NULL',
        [notification.userId]
      );

      if (tokenResult.rows.length === 0) return;

      // Check if Firebase is configured
      if (!process.env.FIREBASE_PROJECT_ID) {
        logger.warn('[Notifications] Firebase not configured - push skipped');
        return;
      }

      // Import Firebase Admin dynamically
      const admin = await import('firebase-admin');

      // Send to all user devices
      const tokens = tokenResult.rows.map((row) => row.fcm_token);
      const message = {
        notification: {
          title: notification.title,
          body: notification.message,
          imageUrl: notification.imageUrl,
        },
        data: notification.data || {},
        tokens,
      };

      await admin.messaging().sendMulticast(message);

      logger.info('[Notifications] Push notification delivered', {
        notificationId: notification.id,
        deviceCount: tokens.length,
      });
    } catch (error: any) {
      logger.error('[Notifications] Push delivery failed', {
        error: error.message,
        notificationId: notification.id,
      });
    }
  }

  /**
   * Get user's notification preferences
   */
  async getPreferences(userId: string, tenantId: string): Promise<NotificationPreferences> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM notification_preferences WHERE user_id = $1 AND tenantId = $2',
        [userId, tenantId]
      );

      if (result.rows.length === 0) {
        // Return default preferences
        return this.getDefaultPreferences(userId, tenantId);
      }

      const row = result.rows[0];
      return {
        userId: row.user_id,
        tenantId: row.tenantId,
        channels: row.channels,
        types: row.types || {},
        quietHours: row.quiet_hours,
      };
    } catch (error: any) {
      logger.error('[Notifications] Failed to get preferences', {
        error: error.message,
        userId,
      });
      return this.getDefaultPreferences(userId, tenantId);
    }
  }

  /**
   * Update user's notification preferences
   */
  async updatePreferences(userId: string, tenantId: string, preferences: Partial<NotificationPreferences>): Promise<void> {
    await this.pool.query(
      `INSERT INTO notification_preferences (user_id, tenantId, channels, types, quiet_hours)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, tenantId)
       DO UPDATE SET channels = $3, types = $4, quiet_hours = $5, updated_at = NOW()`,
      [
        userId,
        tenantId,
        JSON.stringify(preferences.channels),
        JSON.stringify(preferences.types),
        JSON.stringify(preferences.quietHours),
      ]
    );

    logger.info('[Notifications] Preferences updated', { userId });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    await this.pool.query(
      'UPDATE notifications SET read = true, read_at = NOW() WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );

    this.emit('notification:read', { notificationId, userId });
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string, tenantId: string): Promise<void> {
    await this.pool.query(
      'UPDATE notifications SET read = true, read_at = NOW() WHERE user_id = $1 AND tenantId = $2 AND read = false',
      [userId, tenantId]
    );

    this.emit('notifications:all_read', { userId, tenantId });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    const result = await this.pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND tenantId = $2 AND read = false AND (expires_at IS NULL OR expires_at > NOW())',
      [userId, tenantId]
    );

    return parseInt(result.rows[0].count);
  }

  /**
   * Get user's notifications
   */
  async getNotifications(
    userId: string,
    tenantId: string,
    options: { limit?: number; offset?: number; unreadOnly?: boolean } = {}
  ): Promise<Notification[]> {
    const { limit = 50, offset = 0, unreadOnly = false } = options;

    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1 AND tenantId = $2
      AND (expires_at IS NULL OR expires_at > NOW())
    `;

    if (unreadOnly) {
      query += ' AND read = false';
    }

    query += ' ORDER BY created_at DESC LIMIT $3 OFFSET $4';

    const result = await this.pool.query(query, [userId, tenantId, limit, offset]);

    return result.rows.map((row) => this.mapRowToNotification(row));
  }

  /**
   * Delete notification
   */
  async delete(notificationId: string, userId: string): Promise<void> {
    await this.pool.query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2',
      [notificationId, userId]
    );
  }

  /**
   * Delete old read notifications (cleanup job)
   */
  async cleanupOldNotifications(daysOld: number = 30): Promise<number> {
    const result = await this.pool.query(
      `DELETE FROM notifications
       WHERE read = true AND read_at < NOW() - INTERVAL '${daysOld} days'`
    );

    logger.info('[Notifications] Cleaned up old notifications', {
      deleted: result.rowCount,
      daysOld,
    });

    return result.rowCount || 0;
  }

  // Helper methods
  private determineChannels(
    params: CreateNotificationParams,
    preferences: NotificationPreferences
  ): NotificationChannel[] {
    // If channels explicitly specified, use those
    if (params.channels && params.channels.length > 0) {
      return params.channels.filter((channel) => preferences.channels[channel]);
    }

    // Otherwise, use preferences for this notification type
    const typePreferences = preferences.types[params.type];
    if (typePreferences && typePreferences.length > 0) {
      return typePreferences;
    }

    // Default to in-app only
    return preferences.channels.in_app ? ['in_app'] : [];
  }

  private async isQuietHours(preferences: NotificationPreferences): Promise<boolean> {
    if (!preferences.quietHours?.enabled) return false;

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    return (
      currentTime >= preferences.quietHours.start &&
      currentTime <= preferences.quietHours.end
    );
  }

  private getDefaultPreferences(userId: string, tenantId: string): NotificationPreferences {
    return {
      userId,
      tenantId,
      channels: {
        in_app: true,
        email: true,
        sms: false,
        push: true,
      },
      types: {},
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };
  }

  private generateEmailHTML(notification: Notification, userName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <body style="font-family:Arial,sans-serif;padding:20px;">
        <h2>${notification.title}</h2>
        <p>Hi ${userName},</p>
        <p>${notification.message}</p>
        ${notification.actionUrl ? `<p><a href="${notification.actionUrl}" style="background-color:#2563eb;color:#fff;padding:10px 20px;text-decoration:none;border-radius:4px;display:inline-block;">View Details</a></p>` : ''}
        <p style="color:#6b7280;font-size:14px;margin-top:30px;">Â© 2025 ClientForge</p>
      </body>
      </html>
    `;
  }

  private mapRowToNotification(row: any): Notification {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.user_id,
      type: row.type,
      title: row.title,
      message: row.message,
      data: this.parseJSON(row.data),
      channels: this.parseJSON(row.channels),
      priority: row.priority,
      read: row.read,
      actionUrl: row.action_url,
      imageUrl: row.image_url,
      createdAt: row.created_at,
      readAt: row.read_at,
      expiresAt: row.expires_at,
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
    return value || {};
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
