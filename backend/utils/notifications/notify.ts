/**
 * Notification Helper Utilities
 * Convenient functions for sending notifications throughout the application
 */

import { notificationService } from '../../services/notifications/notification.service';
import { logger } from '../logging/logger';

/**
 * Notify about a new deal
 */
export async function notifyDealCreated(
  tenantId: string,
  userId: string,
  dealName: string,
  dealId: string,
  value?: number
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'deal_created',
      title: 'New Deal Created',
      message: `Deal "${dealName}" has been created${value ? ` with value $${(value / 100).toFixed(2)}` : ''}`,
      data: { dealId, dealName, value },
      actionUrl: `/deals/${dealId}`,
      priority: 'normal',
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send deal created notification', { error: error.message });
  }
}

/**
 * Notify about a won deal
 */
export async function notifyDealWon(
  tenantId: string,
  userId: string,
  dealName: string,
  dealId: string,
  value: number
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'deal_won',
      title: 'Deal Won! 🎉',
      message: `Congratulations! Deal "${dealName}" has been won for $${(value / 100).toFixed(2)}`,
      data: { dealId, dealName, value },
      actionUrl: `/deals/${dealId}`,
      priority: 'high',
      channels: ['in_app', 'email'],
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send deal won notification', { error: error.message });
  }
}

/**
 * Notify about a task assignment
 */
export async function notifyTaskAssigned(
  tenantId: string,
  userId: string,
  taskTitle: string,
  taskId: string,
  dueDate?: Date,
  assignedBy?: string
): Promise<void> {
  try {
    const dueDateText = dueDate ? ` (due ${dueDate.toLocaleDateString()})` : '';

    await notificationService.send({
      tenantId,
      userId,
      type: 'task_assigned',
      title: 'Task Assigned',
      message: `You have been assigned task "${taskTitle}"${dueDateText}`,
      data: { taskId, taskTitle, dueDate: dueDate?.toISOString(), assignedBy },
      actionUrl: `/tasks/${taskId}`,
      priority: 'normal',
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send task assigned notification', { error: error.message });
  }
}

/**
 * Notify about an overdue task
 */
export async function notifyTaskOverdue(
  tenantId: string,
  userId: string,
  taskTitle: string,
  taskId: string
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'task_overdue',
      title: 'Task Overdue',
      message: `Task "${taskTitle}" is now overdue`,
      data: { taskId, taskTitle },
      actionUrl: `/tasks/${taskId}`,
      priority: 'high',
      channels: ['in_app', 'email'],
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send task overdue notification', { error: error.message });
  }
}

/**
 * Notify about a payment failure
 */
export async function notifyPaymentFailed(
  tenantId: string,
  userId: string,
  invoiceNumber: string,
  amount: number
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'payment_failed',
      title: 'Payment Failed',
      message: `Payment for invoice ${invoiceNumber} ($${(amount / 100).toFixed(2)}) has failed. Please update your payment method.`,
      data: { invoiceNumber, amount },
      actionUrl: '/billing/payment-methods',
      priority: 'urgent',
      channels: ['in_app', 'email', 'sms'],
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send payment failed notification', { error: error.message });
  }
}

/**
 * Notify about a paid invoice
 */
export async function notifyInvoicePaid(
  tenantId: string,
  userId: string,
  invoiceNumber: string,
  amount: number
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'invoice_paid',
      title: 'Invoice Paid',
      message: `Invoice ${invoiceNumber} for $${(amount / 100).toFixed(2)} has been paid. Thank you!`,
      data: { invoiceNumber, amount },
      actionUrl: `/invoices/${invoiceNumber}`,
      priority: 'normal',
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send invoice paid notification', { error: error.message });
  }
}

/**
 * Notify about a team mention
 */
export async function notifyTeamMention(
  tenantId: string,
  userId: string,
  mentionedBy: string,
  entityType: string,
  entityId: string,
  context: string
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'team_mention',
      title: 'You were mentioned',
      message: `${mentionedBy} mentioned you in ${entityType}: "${context.substring(0, 100)}..."`,
      data: { mentionedBy, entityType, entityId, context },
      actionUrl: `/${entityType}s/${entityId}`,
      priority: 'high',
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send team mention notification', { error: error.message });
  }
}

/**
 * Notify about a new comment
 */
export async function notifyCommentAdded(
  tenantId: string,
  userId: string,
  commenterName: string,
  entityType: string,
  entityId: string,
  commentPreview: string
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'comment_added',
      title: 'New Comment',
      message: `${commenterName} commented: "${commentPreview.substring(0, 100)}..."`,
      data: { commenterName, entityType, entityId, commentPreview },
      actionUrl: `/${entityType}s/${entityId}#comments`,
      priority: 'normal',
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send comment added notification', { error: error.message });
  }
}

/**
 * Notify about a file upload
 */
export async function notifyFileUploaded(
  tenantId: string,
  userId: string,
  fileName: string,
  uploadedBy: string,
  entityType: string,
  entityId: string
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'file_uploaded',
      title: 'File Uploaded',
      message: `${uploadedBy} uploaded ${fileName} to ${entityType}`,
      data: { fileName, uploadedBy, entityType, entityId },
      actionUrl: `/${entityType}s/${entityId}#files`,
      priority: 'low',
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send file uploaded notification', { error: error.message });
  }
}

/**
 * Notify about a completed report
 */
export async function notifyReportReady(
  tenantId: string,
  userId: string,
  reportName: string,
  reportUrl: string
): Promise<void> {
  try {
    await notificationService.send({
      tenantId,
      userId,
      type: 'report_ready',
      title: 'Report Ready',
      message: `Your report "${reportName}" is ready to download`,
      data: { reportName, reportUrl },
      actionUrl: reportUrl,
      priority: 'normal',
      channels: ['in_app', 'email'],
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send report ready notification', { error: error.message });
  }
}

/**
 * Send a system alert to all tenant users
 */
export async function notifySystemAlert(
  tenantId: string,
  userIds: string[],
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'error' = 'info'
): Promise<void> {
  try {
    const priority = severity === 'error' ? 'urgent' : severity === 'warning' ? 'high' : 'normal';

    await notificationService.send({
      tenantId,
      userId: userIds,
      type: 'system_alert',
      title,
      message,
      priority,
      channels: ['in_app', 'email'],
    });
  } catch (error: any) {
    logger.error('[Notify] Failed to send system alert', { error: error.message });
  }
}
