/**
 * Activity Timeline API Routes
 * Provides endpoints for activity tracking and audit trails
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { activityService, ActivityType, ActivityAction } from '../../../../services/activity/activity.service';
import { authenticate } from '../../../../middleware/authenticate';
import { validateRequest } from '../../../../middleware/validate-request';
import { logger } from '../../../../utils/logging/logger';

const router = Router();

// =============================================
// Validation Schemas
// =============================================

const getActivityFeedSchema = z.object({
  query: z.object({
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
    activityTypes: z.string().optional().transform(val => val ? val.split(',') as ActivityType[] : undefined),
    userIds: z.string().optional().transform(val => val ? val.split(',') : undefined),
  }),
});

const getEntityTimelineSchema = z.object({
  params: z.object({
    entityType: z.string(),
    entityId: z.string(),
  }),
  query: z.object({
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  }),
});

const searchActivitiesSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 50),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
  }),
});

const getStatisticsSchema = z.object({
  query: z.object({
    startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
    groupBy: z.enum(['day', 'week', 'month']).optional(),
  }),
});

const logActivitySchema = z.object({
  body: z.object({
    activityType: z.enum([
      'contact', 'deal', 'company', 'lead', 'task', 'invoice',
      'email', 'note', 'file', 'user', 'system'
    ]),
    entityType: z.string(),
    entityId: z.string(),
    entityName: z.string().optional(),
    action: z.enum([
      'created', 'updated', 'deleted', 'viewed', 'archived', 'restored',
      'assigned', 'unassigned', 'completed', 'reopened', 'sent', 'received',
      'uploaded', 'downloaded', 'shared', 'commented', 'mentioned',
      'logged_in', 'logged_out'
    ]),
    description: z.string().optional(),
    changes: z.array(z.object({
      field: z.string(),
      oldValue: z.any(),
      newValue: z.any(),
    })).optional(),
    metadata: z.record(z.any()).optional(),
  }),
});

// =============================================
// Routes
// =============================================

/**
 * GET /api/v1/timeline
 * Get tenant-wide activity feed
 */
router.get(
  '/',
  authenticate,
  validateRequest(getActivityFeedSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const { limit, offset, activityTypes, userIds } = req.query as any;

      const activities = await activityService.getTenantActivity(tenantId, {
        limit,
        offset,
        activityTypes,
        userIds,
      });

      res.json({
        success: true,
        data: activities,
        pagination: {
          limit,
          offset,
          total: activities.length,
        },
      });
    } catch (error: any) {
      logger.error('[Activities API] Failed to get tenant activity feed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve activity feed',
      });
    }
  }
);

/**
 * GET /api/v1/timeline/me
 * Get current user's activity feed
 */
router.get(
  '/me',
  authenticate,
  validateRequest(getActivityFeedSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId, tenantId } = req.user!;
      const { limit, offset, activityTypes } = req.query as any;

      const activities = await activityService.getUserActivity(userId, tenantId, {
        limit,
        offset,
        activityTypes,
      });

      res.json({
        success: true,
        data: activities,
        pagination: {
          limit,
          offset,
          total: activities.length,
        },
      });
    } catch (error: any) {
      logger.error('[Activities API] Failed to get user activity feed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve activity feed',
      });
    }
  }
);

/**
 * GET /api/v1/timeline/search
 * Search activities
 */
router.get(
  '/search',
  authenticate,
  validateRequest(searchActivitiesSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const { q, limit, offset } = req.query as any;

      const activities = await activityService.search(tenantId, q, {
        limit,
        offset,
      });

      res.json({
        success: true,
        data: activities,
        query: q,
        pagination: {
          limit,
          offset,
          total: activities.length,
        },
      });
    } catch (error: any) {
      logger.error('[Activities API] Failed to search activities', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to search activities',
      });
    }
  }
);

/**
 * GET /api/v1/timeline/statistics
 * Get activity statistics
 */
router.get(
  '/statistics',
  authenticate,
  validateRequest(getStatisticsSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const { startDate, endDate, groupBy } = req.query as any;

      const statistics = await activityService.getStatistics(tenantId, {
        startDate,
        endDate,
        groupBy,
      });

      res.json({
        success: true,
        data: statistics,
        filters: {
          startDate,
          endDate,
          groupBy: groupBy || 'day',
        },
      });
    } catch (error: any) {
      logger.error('[Activities API] Failed to get activity statistics', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve activity statistics',
      });
    }
  }
);

/**
 * GET /api/v1/timeline/:entityType/:entityId
 * Get timeline for a specific entity
 */
router.get(
  '/:entityType/:entityId',
  authenticate,
  validateRequest(getEntityTimelineSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const { entityType, entityId } = req.params;
      const { limit, offset } = req.query as any;

      const activities = await activityService.getEntityTimeline(
        tenantId,
        entityType,
        entityId,
        { limit, offset }
      );

      res.json({
        success: true,
        data: activities,
        pagination: {
          limit,
          offset,
          total: activities.length,
        },
      });
    } catch (error: any) {
      logger.error('[Activities API] Failed to get entity timeline', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve entity timeline',
      });
    }
  }
);

/**
 * POST /api/v1/timeline
 * Log a new activity (manual logging)
 */
router.post(
  '/',
  authenticate,
  validateRequest(logActivitySchema),
  async (req: Request, res: Response) => {
    try {
      const { userId, tenantId } = req.user!;
      const {
        activityType,
        entityType,
        entityId,
        entityName,
        action,
        description,
        changes,
        metadata,
      } = req.body;

      // Auto-generate description if not provided
      const finalDescription = description || activityService.formatDescription(
        action,
        entityType,
        entityName,
        changes
      );

      const activity = await activityService.log({
        tenantId,
        userId,
        activityType,
        entityType,
        entityId,
        entityName,
        action,
        description: finalDescription,
        changes,
        metadata,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.status(201).json({
        success: true,
        data: activity,
      });
    } catch (error: any) {
      logger.error('[Activities API] Failed to log activity', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to log activity',
      });
    }
  }
);

/**
 * DELETE /api/v1/timeline/cleanup
 * Cleanup old activities (admin only)
 */
router.delete(
  '/cleanup',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;

      // Only admins can cleanup activities
      if (role !== 'admin' && role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const daysOld = parseInt(req.query.daysOld as string) || 365;
      const deletedCount = await activityService.cleanup(daysOld);

      res.json({
        success: true,
        data: {
          deletedCount,
          daysOld,
        },
      });
    } catch (error: any) {
      logger.error('[Activities API] Failed to cleanup activities', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Failed to cleanup activities',
      });
    }
  }
);

export default router;
