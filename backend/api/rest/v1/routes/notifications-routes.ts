/**
 * Notifications API Routes
 * Handles notification CRUD and preferences
 */

import { Router, Request, Response } from 'express';
import { notificationService } from '../../../../services/notifications/notification.service';
import { authenticate } from '../../../../middleware/authenticate';
import { validateRequest } from '../../../../middleware/validate-request';
import { logger } from '../../../../utils/logging/logger';
import { z } from 'zod';

const router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const sendNotificationSchema = z.object({
  userId: z.union([z.string().uuid(), z.array(z.string().uuid())]),
  type: z.string(),
  title: z.string().min(1).max(255),
  message: z.string().min(1),
  data: z.record(z.any()).optional(),
  channels: z.array(z.enum(['in_app', 'email', 'sms', 'push'])).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  actionUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
});

const updatePreferencesSchema = z.object({
  channels: z.object({
    in_app: z.boolean(),
    email: z.boolean(),
    sms: z.boolean(),
    push: z.boolean(),
  }).optional(),
  types: z.record(z.array(z.enum(['in_app', 'email', 'sms', 'push']))).optional(),
  quietHours: z.object({
    enabled: z.boolean(),
    start: z.string().regex(/^\d{2}:\d{2}$/),
    end: z.string().regex(/^\d{2}:\d{2}$/),
  }).optional(),
});

// =============================================================================
// NOTIFICATION ROUTES
// =============================================================================

/**
 * POST /api/v1/notifications
 * Send a notification (admin/system only)
 */
router.post(
  '/',
  authenticate,
  validateRequest(sendNotificationSchema),
  async (req: Request, res: Response) => {
    try {
      // Check if user has permission to send notifications
      if (req.user!.role !== 'admin' && req.user!.role !== 'owner') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const notifications = await notificationService.send({
        tenantId: req.user!.tenantId,
        ...req.body,
      });

      res.status(201).json({
        success: true,
        data: notifications,
      });
    } catch (error: any) {
      logger.error('[Notifications API] Failed to send notification', {
        error: error.message,
      });
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/notifications
 * Get current user's notifications
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const { limit, offset, unreadOnly } = req.query;

    const notifications = await notificationService.getNotifications(
      req.user!.id,
      req.user!.tenantId,
      {
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
        unreadOnly: unreadOnly === 'true',
      }
    );

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error: any) {
    logger.error('[Notifications API] Failed to get notifications', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get notifications',
    });
  }
});

/**
 * GET /api/v1/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authenticate, async (req: Request, res: Response) => {
  try {
    const count = await notificationService.getUnreadCount(
      req.user!.id,
      req.user!.tenantId
    );

    res.json({
      success: true,
      data: { count },
    });
  } catch (error: any) {
    logger.error('[Notifications API] Failed to get unread count', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get unread count',
    });
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark notification as read
 */
router.patch('/:id/read', authenticate, async (req: Request, res: Response) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Notification marked as read',
    });
  } catch (error: any) {
    logger.error('[Notifications API] Failed to mark as read', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', authenticate, async (req: Request, res: Response) => {
  try {
    await notificationService.markAllAsRead(req.user!.id, req.user!.tenantId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error: any) {
    logger.error('[Notifications API] Failed to mark all as read', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification
 */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    await notificationService.delete(req.params.id, req.user!.id);

    res.json({
      success: true,
      message: 'Notification deleted',
    });
  } catch (error: any) {
    logger.error('[Notifications API] Failed to delete notification', {
      error: error.message,
    });
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
});

// =============================================================================
// PREFERENCE ROUTES
// =============================================================================

/**
 * GET /api/v1/notifications/preferences
 * Get current user's notification preferences
 */
router.get('/preferences', authenticate, async (req: Request, res: Response) => {
  try {
    const preferences = await notificationService.getPreferences(
      req.user!.id,
      req.user!.tenantId
    );

    res.json({
      success: true,
      data: preferences,
    });
  } catch (error: any) {
    logger.error('[Notifications API] Failed to get preferences', {
      error: error.message,
    });
    res.status(500).json({
      success: false,
      error: 'Failed to get preferences',
    });
  }
});

/**
 * PATCH /api/v1/notifications/preferences
 * Update notification preferences
 */
router.patch(
  '/preferences',
  authenticate,
  validateRequest(updatePreferencesSchema),
  async (req: Request, res: Response) => {
    try {
      await notificationService.updatePreferences(
        req.user!.id,
        req.user!.tenantId,
        req.body
      );

      res.json({
        success: true,
        message: 'Preferences updated',
      });
    } catch (error: any) {
      logger.error('[Notifications API] Failed to update preferences', {
        error: error.message,
      });
      res.status(400).json({
        success: false,
        error: error.message,
      });
    }
  }
);

export default router;
