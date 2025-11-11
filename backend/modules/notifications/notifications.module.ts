/**
 * Notifications Module
 * Multi-channel notification system
 */

import { IModule, ModuleContext } from '../../core/module-registry';
import { Express } from 'express';
import notificationsRoutes from '../../api/rest/v1/routes/notifications-routes';
import { logger } from '../../utils/logging/logger';
import { notificationService } from '../../services/notifications/notification.service';
import { websocketService } from '../../services/notifications/websocket.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Server as HTTPServer } from 'http';

export class NotificationsModule implements IModule {
  name = 'notifications';
  version = '1.0.0';
  dependencies: string[] = [];

  async initialize(context: ModuleContext): Promise<void> {
    logger.info('[Notifications Module] Initializing notifications module...');

    // Run database migrations
    await this.runMigrations(context);

    // Initialize WebSocket server (will be attached to HTTP server later)
    if (context.httpServer) {
      websocketService.initialize(context.httpServer);
    }

    logger.info('[Notifications Module] Notifications module initialized successfully');
  }

  registerRoutes(app: Express, context: ModuleContext): void {
    logger.info('[Notifications Module] Registering notification routes...');

    // Register notification routes
    app.use('/api/v1/notifications', notificationsRoutes);

    logger.info('[Notifications Module] Notification routes registered');
  }

  registerEventHandlers(context: ModuleContext): void {
    logger.info('[Notifications Module] Registering notification event handlers...');

    // Listen for entity events and create notifications
    const eventMappings = [
      { event: 'deal:created', type: 'deal_created', title: 'New deal created' },
      { event: 'deal:updated', type: 'deal_updated', title: 'Deal updated' },
      { event: 'deal:won', type: 'deal_won', title: 'Deal won!' },
      { event: 'deal:lost', type: 'deal_lost', title: 'Deal lost' },
      { event: 'contact:created', type: 'contact_created', title: 'New contact added' },
      { event: 'contact:updated', type: 'contact_updated', title: 'Contact updated' },
      { event: 'task:assigned', type: 'task_assigned', title: 'Task assigned to you' },
      { event: 'invoice:paid', type: 'invoice_paid', title: 'Invoice paid' },
      { event: 'invoice:overdue', type: 'invoice_overdue', title: 'Invoice overdue' },
      { event: 'payment:failed', type: 'payment_failed', title: 'Payment failed' },
      { event: 'subscription:renewed', type: 'subscription_renewed', title: 'Subscription renewed' },
      { event: 'subscription:cancelled', type: 'subscription_cancelled', title: 'Subscription cancelled' },
    ];

    eventMappings.forEach(({ event, type, title }) => {
      context.eventBus?.on(event, async (data: any) => {
        try {
          await notificationService.send({
            tenantId: data.tenantId,
            userId: data.userId || data.assignedTo || data.ownerId,
            type: type as any,
            title,
            message: data.message || this.generateMessage(type, data),
            data: {
              entityId: data.id || data.entityId,
              entityType: event.split(':')[0],
              ...data.metadata,
            },
            actionUrl: data.actionUrl,
            priority: data.priority || 'normal',
          });

          logger.info(`[Notifications Module] Notification sent for ${event}`, {
            userId: data.userId,
          });
        } catch (error: any) {
          logger.error(`[Notifications Module] Failed to send notification for ${event}`, {
            error: error.message,
          });
        }
      });
    });

    logger.info('[Notifications Module] Notification event handlers registered');
  }

  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      // Check database connectivity
      await notificationService['pool'].query('SELECT 1');

      // Check WebSocket server
      const onlineUsers = websocketService.getOnlineUsersCount();

      return {
        healthy: true,
        details: {
          database: 'connected',
          websocket: 'running',
          onlineUsers,
        },
      };
    } catch (error: any) {
      logger.error('[Notifications Module] Health check failed', {
        error: error.message,
      });

      return {
        healthy: false,
        details: {
          error: error.message,
        },
      };
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[Notifications Module] Shutting down notifications module...');

    // Shutdown WebSocket server
    await websocketService.shutdown();

    logger.info('[Notifications Module] Notifications module shut down successfully');
  }

  // Helper methods
  private generateMessage(type: string, data: any): string {
    const messages: Record<string, (data: any) => string> = {
      deal_created: (d) => `New deal "${d.dealName || d.name}" has been created`,
      deal_updated: (d) => `Deal "${d.dealName || d.name}" has been updated`,
      deal_won: (d) => `Congratulations! Deal "${d.dealName || d.name}" has been won`,
      deal_lost: (d) => `Deal "${d.dealName || d.name}" has been lost`,
      contact_created: (d) => `New contact "${d.contactName || d.name}" has been added`,
      contact_updated: (d) => `Contact "${d.contactName || d.name}" has been updated`,
      task_assigned: (d) => `You have been assigned task "${d.taskTitle || d.title}"`,
      invoice_paid: (d) => `Invoice ${d.invoiceNumber} has been paid`,
      invoice_overdue: (d) => `Invoice ${d.invoiceNumber} is overdue`,
      payment_failed: (d) => `Payment for invoice ${d.invoiceNumber} has failed`,
      subscription_renewed: (d) => `Your ${d.planName} subscription has been renewed`,
      subscription_cancelled: (d) => `Your ${d.planName} subscription has been cancelled`,
    };

    const generator = messages[type];
    return generator ? generator(data) : `New ${type.replace('_', ' ')} notification`;
  }

  private async runMigrations(context: ModuleContext): Promise<void> {
    logger.info('[Notifications Module] Running notification database migrations...');

    try {
      const migrationPath = path.join(
        process.cwd(),
        'database',
        'migrations',
        '017_notifications.sql'
      );

      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

      // Execute migration
      await notificationService['pool'].query(migrationSQL);

      logger.info('[Notifications Module] Database migrations completed');
    } catch (error: any) {
      logger.error('[Notifications Module] Failed to run migrations', {
        error: error.message,
      });
      throw error;
    }
  }
}

// Export singleton instance
export const notificationsModule = new NotificationsModule();
