/**
 * API Keys Management Routes
 * CRUD operations for API keys
 */

import { Router, Request, Response } from 'express';

import { ApiKeyService } from '../../../../services/api-keys/api-key.service';
import { logger } from '../../../../utils/logging/logger';

const router = Router();
const apiKeyService = new ApiKeyService();

/**
 * POST /api/v1/api-keys
 * Create a new API key
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, scopes, rateLimit, expiresInDays } = req.body;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!name || !scopes || !Array.isArray(scopes)) {
      return res.status(400).json({ error: 'name and scopes are required' });
    }

    const { apiKey, plainKey } = await apiKeyService.createApiKey({
      tenantId,
      userId,
      name,
      scopes,
      rateLimit,
      expiresInDays,
    });

    logger.info('[ApiKeysAPI] API key created', {
      tenantId,
      apiKeyId: apiKey.id,
    });

    res.status(201).json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      // WARNING: This is the only time the plain key is shown!
      plainKey,
      warning: 'Store this API key securely. It will not be shown again.',
    });
  } catch (error: any) {
    logger.error('[ApiKeysAPI] Failed to create API key', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

/**
 * GET /api/v1/api-keys
 * List all API keys for tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const apiKeys = await apiKeyService.listApiKeys(tenantId);

    res.json({
      apiKeys: apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes,
        rateLimit: key.rateLimit,
        expiresAt: key.expiresAt,
        lastUsedAt: key.lastUsedAt,
        isActive: key.isActive,
        createdBy: key.createdBy,
        createdAt: key.createdAt,
      })),
    });
  } catch (error: any) {
    logger.error('[ApiKeysAPI] Failed to list API keys', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to list API keys' });
  }
});

/**
 * GET /api/v1/api-keys/:id/stats
 * Get usage statistics for an API key
 */
router.get('/:id/stats', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Verify ownership
    const apiKeys = await apiKeyService.listApiKeys(tenantId);
    const apiKey = apiKeys.find(k => k.id === id);

    if (!apiKey) {
      return res.status(404).json({ error: 'API key not found' });
    }

    const stats = await apiKeyService.getUsageStats(id);

    res.json({
      apiKeyId: id,
      stats,
    });
  } catch (error: any) {
    logger.error('[ApiKeysAPI] Failed to get API key stats', {
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get API key stats' });
  }
});

/**
 * PUT /api/v1/api-keys/:id/scopes
 * Update API key scopes
 */
router.put('/:id/scopes', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { scopes } = req.body;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!scopes || !Array.isArray(scopes)) {
      return res.status(400).json({ error: 'scopes array is required' });
    }

    await apiKeyService.updateScopes(tenantId, id, scopes);

    logger.info('[ApiKeysAPI] API key scopes updated', {
      tenantId,
      apiKeyId: id,
    });

    res.json({ success: true });
  } catch (error: any) {
    logger.error('[ApiKeysAPI] Failed to update API key scopes', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to update scopes' });
  }
});

/**
 * POST /api/v1/api-keys/:id/rotate
 * Rotate an API key (create new, revoke old)
 */
router.post('/:id/rotate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;

    if (!tenantId || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { apiKey, plainKey } = await apiKeyService.rotateApiKey(tenantId, id, userId);

    logger.info('[ApiKeysAPI] API key rotated', {
      tenantId,
      oldKeyId: id,
      newKeyId: apiKey.id,
    });

    res.json({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        keyPrefix: apiKey.keyPrefix,
        scopes: apiKey.scopes,
        rateLimit: apiKey.rateLimit,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
      },
      plainKey,
      warning: 'Store this new API key securely. The old key has been revoked.',
    });
  } catch (error: any) {
    logger.error('[ApiKeysAPI] Failed to rotate API key', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to rotate API key' });
  }
});

/**
 * DELETE /api/v1/api-keys/:id
 * Revoke an API key
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user?.tenantId;

    if (!tenantId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    await apiKeyService.revokeApiKey(tenantId, id);

    logger.info('[ApiKeysAPI] API key revoked', {
      tenantId,
      apiKeyId: id,
    });

    res.status(204).send();
  } catch (error: any) {
    logger.error('[ApiKeysAPI] Failed to revoke API key', {
      error: error.message,
    });
    res.status(500).json({ error: error.message || 'Failed to revoke API key' });
  }
});

export default router;
