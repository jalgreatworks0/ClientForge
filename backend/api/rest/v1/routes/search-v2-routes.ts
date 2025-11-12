/**
 * Search API Routes (v2)
 * Unified search using Elasticsearch service with PostgreSQL fallback
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';

import { elasticsearchService } from '../../../../services/search/elasticsearch.service';
import { authenticate } from '../../../../middleware/authenticate';
import { validateRequest } from '../../../../middleware/validate-request';
import { logger } from '../../../../utils/logging/logger';

const router = Router();

// =============================================
// Validation Schemas
// =============================================

const searchSchema = z.object({
  query: z.object({
    q: z.string().min(1, 'Search query is required'),
    entityTypes: z.string().optional().transform(val => val ? val.split(',') : undefined),
    tags: z.string().optional().transform(val => val ? val.split(',') : undefined),
    assignedTo: z.string().optional().transform(val => val ? val.split(',') : undefined),
    createdAfter: z.string().optional().transform(val => val ? new Date(val) : undefined),
    createdBefore: z.string().optional().transform(val => val ? new Date(val) : undefined),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 20),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0),
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

const indexDocumentSchema = z.object({
  body: z.object({
    entityType: z.string(),
    entityId: z.string(),
    document: z.record(z.any()),
  }),
});

const bulkIndexSchema = z.object({
  body: z.object({
    documents: z.array(z.object({
      entityType: z.string(),
      entityId: z.string(),
      document: z.record(z.any()),
    })),
  }),
});

// =============================================
// Routes
// =============================================

/**
 * GET /api/v1/search
 * Universal search across all entities
 */
router.get(
  '/',
  authenticate,
  validateRequest(searchSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const {
        q,
        entityTypes,
        tags,
        assignedTo,
        createdAfter,
        createdBefore,
        limit,
        offset,
        sortBy,
        sortOrder,
      } = req.query as any;

      const searchResult = await elasticsearchService.search(tenantId, {
        query: q,
        filters: {
          entityTypes,
          tags,
          assignedTo,
          createdAfter,
          createdBefore,
        },
        pagination: {
          limit,
          offset,
        },
        sorting: sortBy
          ? { field: sortBy, order: sortOrder || 'asc' }
          : undefined,
      });

      res.json({
        success: true,
        data: searchResult.results,
        pagination: {
          total: searchResult.total,
          limit,
          offset,
        },
        took: searchResult.took,
        aggregations: searchResult.aggregations,
      });
    } catch (error: any) {
      logger.error('[Search API] Search failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Search failed',
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/search/contacts
 * Search only contacts
 */
router.get(
  '/contacts',
  authenticate,
  validateRequest(searchSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const { q, limit, offset } = req.query as any;

      const searchResult = await elasticsearchService.search(tenantId, {
        query: q,
        filters: {
          entityTypes: ['contact'],
        },
        pagination: {
          limit,
          offset,
        },
      });

      res.json({
        success: true,
        data: searchResult.results,
        pagination: {
          total: searchResult.total,
          limit,
          offset,
        },
        took: searchResult.took,
      });
    } catch (error: any) {
      logger.error('[Search API] Contact search failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Contact search failed',
      });
    }
  }
);

/**
 * GET /api/v1/search/deals
 * Search only deals
 */
router.get(
  '/deals',
  authenticate,
  validateRequest(searchSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const { q, limit, offset } = req.query as any;

      const searchResult = await elasticsearchService.search(tenantId, {
        query: q,
        filters: {
          entityTypes: ['deal'],
        },
        pagination: {
          limit,
          offset,
        },
      });

      res.json({
        success: true,
        data: searchResult.results,
        pagination: {
          total: searchResult.total,
          limit,
          offset,
        },
        took: searchResult.took,
      });
    } catch (error: any) {
      logger.error('[Search API] Deal search failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Deal search failed',
      });
    }
  }
);

/**
 * GET /api/v1/search/tasks
 * Search only tasks
 */
router.get(
  '/tasks',
  authenticate,
  validateRequest(searchSchema),
  async (req: Request, res: Response) => {
    try {
      const { tenantId } = req.user!;
      const { q, limit, offset } = req.query as any;

      const searchResult = await elasticsearchService.search(tenantId, {
        query: q,
        filters: {
          entityTypes: ['task'],
        },
        pagination: {
          limit,
          offset,
        },
      });

      res.json({
        success: true,
        data: searchResult.results,
        pagination: {
          total: searchResult.total,
          limit,
          offset,
        },
        took: searchResult.took,
      });
    } catch (error: any) {
      logger.error('[Search API] Task search failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Task search failed',
      });
    }
  }
);

/**
 * POST /api/v1/search/index
 * Index a single document (admin only)
 */
router.post(
  '/index',
  authenticate,
  validateRequest(indexDocumentSchema),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;

      // Only admins can manually index documents
      if (role !== 'admin' && role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const { entityType, entityId, document } = req.body;

      await elasticsearchService.index(entityType, entityId, document);

      res.status(201).json({
        success: true,
        message: 'Document indexed successfully',
      });
    } catch (error: any) {
      logger.error('[Search API] Indexing failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Indexing failed',
      });
    }
  }
);

/**
 * POST /api/v1/search/bulk-index
 * Bulk index documents (admin only)
 */
router.post(
  '/bulk-index',
  authenticate,
  validateRequest(bulkIndexSchema),
  async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;

      // Only admins can manually index documents
      if (role !== 'admin' && role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const { documents } = req.body;

      await elasticsearchService.bulkIndex(documents);

      res.status(201).json({
        success: true,
        message: `${documents.length} documents indexed successfully`,
      });
    } catch (error: any) {
      logger.error('[Search API] Bulk indexing failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Bulk indexing failed',
      });
    }
  }
);

/**
 * DELETE /api/v1/search/index/:entityType/:entityId
 * Delete a document from the index (admin only)
 */
router.delete(
  '/index/:entityType/:entityId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;

      // Only admins can manually delete from index
      if (role !== 'admin' && role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      const { entityType, entityId } = req.params;

      await elasticsearchService.delete(entityType, entityId);

      res.json({
        success: true,
        message: 'Document deleted from index',
      });
    } catch (error: any) {
      logger.error('[Search API] Delete from index failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Delete from index failed',
      });
    }
  }
);

/**
 * POST /api/v1/search/reindex
 * Recreate the search index (admin only)
 */
router.post(
  '/reindex',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { role } = req.user!;

      // Only super admins can reindex
      if (role !== 'super_admin') {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
        });
      }

      await elasticsearchService.createIndex();

      res.json({
        success: true,
        message: 'Index created successfully',
      });
    } catch (error: any) {
      logger.error('[Search API] Reindex failed', {
        error: error.message,
      });
      res.status(500).json({
        success: false,
        error: 'Reindex failed',
      });
    }
  }
);

export default router;
