/**
 * Activities Module
 * Handles activity timeline system initialization and event handlers
 */

import { EventEmitter } from 'events';

import { Pool } from 'pg';

import { getPool } from '../../database/postgresql/pool';
import { activityService } from '../../services/activity/activity.service';
import { logger } from '../../utils/logging/logger';

export interface IModule {
  name: string;
  initialize(): Promise<void>;
  shutdown?(): Promise<void>;
}

export class ActivitiesModule implements IModule {
  public name = 'activities';
  private pool: Pool;
  private eventEmitter: EventEmitter;

  constructor(eventEmitter: EventEmitter) {
    this.pool = getPool();
    this.eventEmitter = eventEmitter;
  }

  async initialize(): Promise<void> {
    try {
      logger.info('[Activities Module] Initializing...');

      // Run migration
      await this.runMigration();

      // Setup event handlers
      this.setupEventHandlers();

      logger.info('[Activities Module] Initialized successfully');
    } catch (error: any) {
      logger.error('[Activities Module] Failed to initialize', {
        error: error.message,
      });
      throw error;
    }
  }

  async shutdown(): Promise<void> {
    logger.info('[Activities Module] Shutting down...');
    // Cleanup if needed
  }

  /**
   * Run database migration
   */
  private async runMigration(): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const path = await import('path');

      const migrationPath = path.join(
        process.cwd(),
        'database',
        'migrations',
        '018_activities.sql'
      );

      const migrationSQL = await fs.readFile(migrationPath, 'utf-8');

      await this.pool.query(migrationSQL);

      logger.info('[Activities Module] Migration executed successfully');
    } catch (error: any) {
      // If migration already exists, that's okay
      if (error.message?.includes('already exists')) {
        logger.info('[Activities Module] Migration already applied');
        return;
      }
      logger.error('[Activities Module] Migration failed', {
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Setup event handlers for automatic activity logging
   */
  private setupEventHandlers(): void {
    // Deal events
    this.eventEmitter.on('deal:created', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'deal',
        entityType: 'deal',
        entityId: data.dealId,
        entityName: data.dealName,
        action: 'created',
        description: `Created deal "${data.dealName}"`,
        metadata: data.metadata,
      });
    });

    this.eventEmitter.on('deal:updated', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'deal',
        entityType: 'deal',
        entityId: data.dealId,
        entityName: data.dealName,
        action: 'updated',
        description: `Updated deal "${data.dealName}"`,
        changes: data.changes,
        metadata: data.metadata,
      });
    });

    this.eventEmitter.on('deal:won', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'deal',
        entityType: 'deal',
        entityId: data.dealId,
        entityName: data.dealName,
        action: 'completed',
        description: `Won deal "${data.dealName}" for $${(data.value / 100).toFixed(2)}`,
        metadata: { ...data.metadata, dealValue: data.value, stage: 'won' },
      });
    });

    // Contact events
    this.eventEmitter.on('contact:created', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'contact',
        entityType: 'contact',
        entityId: data.contactId,
        entityName: data.contactName,
        action: 'created',
        description: `Created contact "${data.contactName}"`,
        metadata: data.metadata,
      });
    });

    this.eventEmitter.on('contact:updated', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'contact',
        entityType: 'contact',
        entityId: data.contactId,
        entityName: data.contactName,
        action: 'updated',
        description: `Updated contact "${data.contactName}"`,
        changes: data.changes,
        metadata: data.metadata,
      });
    });

    // Task events
    this.eventEmitter.on('task:created', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'task',
        entityType: 'task',
        entityId: data.taskId,
        entityName: data.taskTitle,
        action: 'created',
        description: `Created task "${data.taskTitle}"`,
        metadata: data.metadata,
      });
    });

    this.eventEmitter.on('task:assigned', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'task',
        entityType: 'task',
        entityId: data.taskId,
        entityName: data.taskTitle,
        action: 'assigned',
        description: `Assigned task "${data.taskTitle}" to ${data.assignedToName}`,
        metadata: { ...data.metadata, assignedTo: data.assignedToId },
      });
    });

    this.eventEmitter.on('task:completed', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'task',
        entityType: 'task',
        entityId: data.taskId,
        entityName: data.taskTitle,
        action: 'completed',
        description: `Completed task "${data.taskTitle}"`,
        metadata: data.metadata,
      });
    });

    // Email events
    this.eventEmitter.on('email:sent', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'email',
        entityType: data.entityType || 'email',
        entityId: data.entityId || data.emailId,
        entityName: data.subject,
        action: 'sent',
        description: `Sent email: "${data.subject}"`,
        metadata: { ...data.metadata, recipients: data.to },
      });
    });

    this.eventEmitter.on('email:received', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'email',
        entityType: data.entityType || 'email',
        entityId: data.entityId || data.emailId,
        entityName: data.subject,
        action: 'received',
        description: `Received email: "${data.subject}"`,
        metadata: { ...data.metadata, from: data.from },
      });
    });

    // File events
    this.eventEmitter.on('file:uploaded', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'file',
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.fileName,
        action: 'uploaded',
        description: `Uploaded file "${data.fileName}"`,
        metadata: { ...data.metadata, fileSize: data.fileSize, mimeType: data.mimeType },
      });
    });

    // Comment events
    this.eventEmitter.on('comment:added', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'note',
        entityType: data.entityType,
        entityId: data.entityId,
        entityName: data.entityName,
        action: 'commented',
        description: `Commented on ${data.entityType}: "${data.commentPreview}"`,
        metadata: data.metadata,
      });
    });

    // User events
    this.eventEmitter.on('user:login', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'user',
        entityType: 'user',
        entityId: data.userId,
        entityName: data.userName,
        action: 'logged_in',
        description: `${data.userName} logged in`,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      });
    });

    this.eventEmitter.on('user:logout', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'user',
        entityType: 'user',
        entityId: data.userId,
        entityName: data.userName,
        action: 'logged_out',
        description: `${data.userName} logged out`,
        metadata: data.metadata,
      });
    });

    // Invoice events
    this.eventEmitter.on('invoice:created', async (data) => {
      await this.logActivity({
        tenantId: data.tenantId,
        userId: data.userId,
        activityType: 'invoice',
        entityType: 'invoice',
        entityId: data.invoiceId,
        entityName: data.invoiceNumber,
        action: 'created',
        description: `Created invoice ${data.invoiceNumber}`,
        metadata: { ...data.metadata, amount: data.amount },
      });
    });

    logger.info('[Activities Module] Event handlers configured');
  }

  /**
   * Helper to log activity with error handling
   */
  private async logActivity(params: any): Promise<void> {
    try {
      await activityService.log(params);
    } catch (error: any) {
      logger.error('[Activities Module] Failed to log activity', {
        error: error.message,
        params,
      });
      // Don't throw - activity logging should not break main flow
    }
  }
}

// Export singleton instance factory
export const createActivitiesModule = (eventEmitter: EventEmitter): ActivitiesModule => {
  return new ActivitiesModule(eventEmitter);
};
