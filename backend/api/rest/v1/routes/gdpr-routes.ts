/**
 * GDPR API Routes
 * Handles data subject requests and consent management
 */

import express, { Request, Response, Router } from 'express';
import { GDPRService } from '../../../../services/compliance/gdpr.service';
import { authenticate } from '../../../../middleware/authenticate';
import { validateRequest } from '../../../../middleware/validate-request';
import { logger } from '../../../../utils/logging/logger';
import { z } from 'zod';

const router = Router();
const gdprService = new GDPRService();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createAccessRequestSchema = z.object({
  subjectEmail: z.string().email(),
});

const createErasureRequestSchema = z.object({
  subjectEmail: z.string().email(),
});

const createPortabilityRequestSchema = z.object({
  subjectEmail: z.string().email(),
});

const recordConsentSchema = z.object({
  userId: z.string().uuid(),
  consentType: z.string().min(1).max(100),
  granted: z.boolean(),
  metadata: z.object({
    ipAddress: z.string().optional(),
    userAgent: z.string().optional(),
  }).optional(),
});

// =============================================================================
// DATA SUBJECT ACCESS REQUEST (DSAR) ROUTES
// =============================================================================

/**
 * POST /api/v1/gdpr/requests/access
 * Create a data access request (Right to Access)
 */
router.post(
  '/requests/access',
  authenticate,
  validateRequest(createAccessRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { subjectEmail } = req.body;
      const tenantId = req.user!.tenantId;
      const requestedBy = req.user!.id;

      const request = await gdprService.requestDataAccess(
        tenantId,
        subjectEmail,
        requestedBy
      );

      logger.info('[GDPR API] Data access request created', {
        tenantId,
        requestId: request.id,
        subjectEmail,
      });

      res.status(201).json({
        success: true,
        data: request,
        message: 'Data access request created. You will receive an email when the export is ready.',
      });
    } catch (error: any) {
      logger.error('[GDPR API] Failed to create data access request', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create data access request',
      });
    }
  }
);

/**
 * POST /api/v1/gdpr/requests/erasure
 * Create a data erasure request (Right to Erasure / Right to be Forgotten)
 */
router.post(
  '/requests/erasure',
  authenticate,
  validateRequest(createErasureRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { subjectEmail } = req.body;
      const tenantId = req.user!.tenantId;
      const requestedBy = req.user!.id;

      const request = await gdprService.requestDataErasure(
        tenantId,
        subjectEmail,
        requestedBy
      );

      logger.info('[GDPR API] Data erasure request created', {
        tenantId,
        requestId: request.id,
        subjectEmail,
      });

      res.status(201).json({
        success: true,
        data: request,
        message: 'Data erasure request created. The data will be anonymized within 30 days.',
      });
    } catch (error: any) {
      logger.error('[GDPR API] Failed to create data erasure request', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create data erasure request',
      });
    }
  }
);

/**
 * POST /api/v1/gdpr/requests/portability
 * Create a data portability request (Right to Data Portability)
 */
router.post(
  '/requests/portability',
  authenticate,
  validateRequest(createPortabilityRequestSchema),
  async (req: Request, res: Response) => {
    try {
      const { subjectEmail } = req.body;
      const tenantId = req.user!.tenantId;
      const requestedBy = req.user!.id;

      const request = await gdprService.requestDataPortability(
        tenantId,
        subjectEmail,
        requestedBy
      );

      logger.info('[GDPR API] Data portability request created', {
        tenantId,
        requestId: request.id,
        subjectEmail,
      });

      res.status(201).json({
        success: true,
        data: request,
        message: 'Data portability request created. You will receive a JSON export when ready.',
      });
    } catch (error: any) {
      logger.error('[GDPR API] Failed to create data portability request', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to create data portability request',
      });
    }
  }
);

/**
 * GET /api/v1/gdpr/requests
 * List all data subject requests for the tenant
 */
router.get('/requests', authenticate, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, type, limit = 50, offset = 0 } = req.query;

    // Build query dynamically
    let query = 'SELECT * FROM data_subject_requests WHERE tenant_id = $1';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type) {
      query += ` AND request_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    query += ` ORDER BY request_date DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await gdprService['pool'].query(query, params);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        total: result.rowCount,
      },
    });
  } catch (error: any) {
    logger.error('[GDPR API] Failed to list requests', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to list data subject requests',
    });
  }
});

/**
 * GET /api/v1/gdpr/requests/:id
 * Get a specific data subject request
 */
router.get('/requests/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    const result = await gdprService['pool'].query(
      'SELECT * FROM data_subject_requests WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('[GDPR API] Failed to get request', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get data subject request',
    });
  }
});

/**
 * POST /api/v1/gdpr/requests/:id/execute
 * Execute a pending GDPR request (admin only)
 */
router.post('/requests/:id/execute', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;

    // Check if user is admin
    if (req.user!.role !== 'admin' && req.user!.role !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can execute GDPR requests',
      });
    }

    // Get request details
    const result = await gdprService['pool'].query(
      'SELECT * FROM data_subject_requests WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Request not found',
      });
    }

    const request = result.rows[0];

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Request is not pending',
      });
    }

    // Execute based on type
    if (request.request_type === 'access' || request.request_type === 'portability') {
      const format = request.request_type === 'portability' ? 'json' : 'json';
      await gdprService.executeDataExport(id, format);

      res.json({
        success: true,
        message: 'Data export completed',
      });
    } else if (request.request_type === 'erasure') {
      await gdprService.executeDataErasure(id);

      res.json({
        success: true,
        message: 'Data erasure completed',
      });
    } else {
      res.status(400).json({
        success: false,
        error: 'Unsupported request type for execution',
      });
    }
  } catch (error: any) {
    logger.error('[GDPR API] Failed to execute request', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to execute GDPR request',
    });
  }
});

// =============================================================================
// CONSENT MANAGEMENT ROUTES
// =============================================================================

/**
 * POST /api/v1/gdpr/consent
 * Record user consent
 */
router.post(
  '/consent',
  authenticate,
  validateRequest(recordConsentSchema),
  async (req: Request, res: Response) => {
    try {
      const { userId, consentType, granted, metadata } = req.body;
      const tenantId = req.user!.tenantId;

      // Verify user belongs to tenant
      const userResult = await gdprService['pool'].query(
        'SELECT id FROM users WHERE id = $1 AND tenant_id = $2',
        [userId, tenantId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found',
        });
      }

      const consent = await gdprService.recordConsent(
        tenantId,
        userId,
        consentType,
        granted,
        metadata
      );

      logger.info('[GDPR API] Consent recorded', {
        tenantId,
        userId,
        consentType,
        granted,
      });

      res.status(201).json({
        success: true,
        data: consent,
      });
    } catch (error: any) {
      logger.error('[GDPR API] Failed to record consent', {
        error: error.message,
      });

      res.status(500).json({
        success: false,
        error: 'Failed to record consent',
      });
    }
  }
);

/**
 * GET /api/v1/gdpr/consent/:userId
 * Get all consent records for a user
 */
router.get('/consent/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const tenantId = req.user!.tenantId;

    const result = await gdprService['pool'].query(
      `SELECT * FROM consent_records
       WHERE tenant_id = $1 AND user_id = $2
       ORDER BY created_at DESC`,
      [tenantId, userId]
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    logger.error('[GDPR API] Failed to get consent records', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to get consent records',
    });
  }
});

/**
 * GET /api/v1/gdpr/consent/:userId/:consentType
 * Check if user has granted specific consent
 */
router.get('/consent/:userId/:consentType', authenticate, async (req: Request, res: Response) => {
  try {
    const { userId, consentType } = req.params;
    const tenantId = req.user!.tenantId;

    const hasConsent = await gdprService.hasConsent(tenantId, userId, consentType);

    res.json({
      success: true,
      data: {
        userId,
        consentType,
        granted: hasConsent,
      },
    });
  } catch (error: any) {
    logger.error('[GDPR API] Failed to check consent', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to check consent',
    });
  }
});

// =============================================================================
// EXPORT DOWNLOAD ROUTE
// =============================================================================

/**
 * GET /api/v1/gdpr/exports/:filename
 * Download GDPR data export
 */
router.get('/exports/:filename', authenticate, async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const tenantId = req.user!.tenantId;

    // Verify the export belongs to this tenant
    if (!filename.includes(tenantId)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const filepath = `./storage/gdpr-exports/${tenantId}/${filename}`;

    res.download(filepath, (err) => {
      if (err) {
        logger.error('[GDPR API] Failed to download export', {
          error: err.message,
          filename,
        });

        res.status(404).json({
          success: false,
          error: 'Export file not found',
        });
      }
    });
  } catch (error: any) {
    logger.error('[GDPR API] Failed to serve export', {
      error: error.message,
    });

    res.status(500).json({
      success: false,
      error: 'Failed to serve export file',
    });
  }
});

export default router;
