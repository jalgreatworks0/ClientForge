/**
 * Activity Tracking Helper Utilities
 * Convenient functions for logging activities throughout the application
 */

import { activityService, ActivityAction } from '../../services/activity/activity.service';
import { logger } from '../logging/logger';

/**
 * Track deal creation
 */
export async function trackDealCreated(
  tenantId: string,
  userId: string,
  dealId: string,
  dealName: string,
  value?: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'deal',
      entityType: 'deal',
      entityId: dealId,
      entityName: dealName,
      action: 'created',
      description: `Created deal "${dealName}"${value ? ` with value $${(value / 100).toFixed(2)}` : ''}`,
      metadata: { dealValue: value },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track deal created', { error: error.message });
  }
}

/**
 * Track deal update with changes
 */
export async function trackDealUpdated(
  tenantId: string,
  userId: string,
  dealId: string,
  dealName: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const changes = activityService.detectChanges(oldData, newData);

    await activityService.log({
      tenantId,
      userId,
      activityType: 'deal',
      entityType: 'deal',
      entityId: dealId,
      entityName: dealName,
      action: 'updated',
      description: activityService.formatDescription('updated', 'deal', dealName, changes),
      changes,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track deal updated', { error: error.message });
  }
}

/**
 * Track deal won
 */
export async function trackDealWon(
  tenantId: string,
  userId: string,
  dealId: string,
  dealName: string,
  value: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'deal',
      entityType: 'deal',
      entityId: dealId,
      entityName: dealName,
      action: 'completed',
      description: `Won deal "${dealName}" for $${(value / 100).toFixed(2)}`,
      metadata: { dealValue: value, stage: 'won' },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track deal won', { error: error.message });
  }
}

/**
 * Track contact creation
 */
export async function trackContactCreated(
  tenantId: string,
  userId: string,
  contactId: string,
  contactName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'contact',
      entityType: 'contact',
      entityId: contactId,
      entityName: contactName,
      action: 'created',
      description: `Created contact "${contactName}"`,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track contact created', { error: error.message });
  }
}

/**
 * Track contact update with changes
 */
export async function trackContactUpdated(
  tenantId: string,
  userId: string,
  contactId: string,
  contactName: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const changes = activityService.detectChanges(oldData, newData);

    await activityService.log({
      tenantId,
      userId,
      activityType: 'contact',
      entityType: 'contact',
      entityId: contactId,
      entityName: contactName,
      action: 'updated',
      description: activityService.formatDescription('updated', 'contact', contactName, changes),
      changes,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track contact updated', { error: error.message });
  }
}

/**
 * Track task creation
 */
export async function trackTaskCreated(
  tenantId: string,
  userId: string,
  taskId: string,
  taskTitle: string,
  dueDate?: Date,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'task',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      action: 'created',
      description: `Created task "${taskTitle}"${dueDate ? ` (due ${dueDate.toLocaleDateString()})` : ''}`,
      metadata: { dueDate: dueDate?.toISOString() },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track task created', { error: error.message });
  }
}

/**
 * Track task assignment
 */
export async function trackTaskAssigned(
  tenantId: string,
  userId: string,
  taskId: string,
  taskTitle: string,
  assignedToId: string,
  assignedToName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'task',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      action: 'assigned',
      description: `Assigned task "${taskTitle}" to ${assignedToName}`,
      metadata: { assignedTo: assignedToId, assignedToName },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track task assigned', { error: error.message });
  }
}

/**
 * Track task completion
 */
export async function trackTaskCompleted(
  tenantId: string,
  userId: string,
  taskId: string,
  taskTitle: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'task',
      entityType: 'task',
      entityId: taskId,
      entityName: taskTitle,
      action: 'completed',
      description: `Completed task "${taskTitle}"`,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track task completed', { error: error.message });
  }
}

/**
 * Track email sent
 */
export async function trackEmailSent(
  tenantId: string,
  userId: string,
  emailId: string,
  subject: string,
  recipients: string[],
  entityType?: string,
  entityId?: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'email',
      entityType: entityType || 'email',
      entityId: entityId || emailId,
      entityName: subject,
      action: 'sent',
      description: `Sent email: "${subject}" to ${recipients.join(', ')}`,
      metadata: { recipients },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track email sent', { error: error.message });
  }
}

/**
 * Track file upload
 */
export async function trackFileUploaded(
  tenantId: string,
  userId: string,
  fileName: string,
  fileSize: number,
  mimeType: string,
  entityType: string,
  entityId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'file',
      entityType,
      entityId,
      entityName: fileName,
      action: 'uploaded',
      description: `Uploaded file "${fileName}" (${(fileSize / 1024).toFixed(2)} KB)`,
      metadata: { fileName, fileSize, mimeType },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track file upload', { error: error.message });
  }
}

/**
 * Track file download
 */
export async function trackFileDownloaded(
  tenantId: string,
  userId: string,
  fileName: string,
  entityType: string,
  entityId: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'file',
      entityType,
      entityId,
      entityName: fileName,
      action: 'downloaded',
      description: `Downloaded file "${fileName}"`,
      metadata: { fileName },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track file download', { error: error.message });
  }
}

/**
 * Track comment addition
 */
export async function trackCommentAdded(
  tenantId: string,
  userId: string,
  commentText: string,
  entityType: string,
  entityId: string,
  entityName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    const preview = commentText.substring(0, 100);

    await activityService.log({
      tenantId,
      userId,
      activityType: 'note',
      entityType,
      entityId,
      entityName,
      action: 'commented',
      description: `Commented on ${entityType}: "${preview}${commentText.length > 100 ? '...' : ''}"`,
      metadata: { commentLength: commentText.length },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track comment added', { error: error.message });
  }
}

/**
 * Track user login
 */
export async function trackUserLogin(
  tenantId: string,
  userId: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'user',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      action: 'logged_in',
      description: `${userName} logged in`,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track user login', { error: error.message });
  }
}

/**
 * Track user logout
 */
export async function trackUserLogout(
  tenantId: string,
  userId: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'user',
      entityType: 'user',
      entityId: userId,
      entityName: userName,
      action: 'logged_out',
      description: `${userName} logged out`,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track user logout', { error: error.message });
  }
}

/**
 * Track invoice creation
 */
export async function trackInvoiceCreated(
  tenantId: string,
  userId: string,
  invoiceId: string,
  invoiceNumber: string,
  amount: number,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType: 'invoice',
      entityType: 'invoice',
      entityId: invoiceId,
      entityName: invoiceNumber,
      action: 'created',
      description: `Created invoice ${invoiceNumber} for $${(amount / 100).toFixed(2)}`,
      metadata: { amount },
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track invoice created', { error: error.message });
  }
}

/**
 * Generic activity tracking with custom action
 */
export async function trackActivity(
  tenantId: string,
  userId: string,
  activityType: 'contact' | 'deal' | 'company' | 'lead' | 'task' | 'invoice' | 'email' | 'note' | 'file' | 'user' | 'system',
  entityType: string,
  entityId: string,
  entityName: string,
  action: ActivityAction,
  description: string,
  changes?: Array<{ field: string; oldValue: any; newValue: any }>,
  metadata?: Record<string, any>,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await activityService.log({
      tenantId,
      userId,
      activityType,
      entityType,
      entityId,
      entityName,
      action,
      description,
      changes,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error: any) {
    logger.error('[Activity Track] Failed to track activity', { error: error.message });
  }
}
