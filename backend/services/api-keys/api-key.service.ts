/**
 * API Key Management Service
 * Handles creation, validation, rotation, and revocation of API keys
 * Implements secure key generation, hashing, and rate limiting
 */

import { Pool } from 'pg';
import { getPool } from '../../database/postgresql/pool';
import { logger } from '../../utils/logging/logger';
import * as crypto from 'crypto';
import { Redis } from 'ioredis';

export interface ApiKey {
  id: string;
  tenantId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  rateLimit: number;
  expiresAt?: Date;
  lastUsedAt?: Date;
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyParams {
  tenantId: string;
  userId: string;
  name: string;
  scopes: string[];
  rateLimit?: number;
  expiresInDays?: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  rateLimitExceeded?: boolean;
  expired?: boolean;
  reason?: string;
}

export class ApiKeyService {
  private pool: Pool;
  private redis: Redis;

  constructor() {
    this.pool = getPool();
    this.redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
  }

  /**
   * Generate a new API key
   */
  async createApiKey(params: CreateApiKeyParams): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const { tenantId, userId, name, scopes, rateLimit = 1000, expiresInDays } = params;

    try {
      // Validate inputs
      if (!tenantId || !userId || !name || !scopes || scopes.length === 0) {
        throw new Error('Missing required fields');
      }

      // Generate secure API key
      const plainKey = this.generateSecureKey();
      const keyPrefix = plainKey.substring(0, 8);
      const keyHash = this.hashKey(plainKey);

      // Calculate expiration date
      let expiresAt: Date | undefined;
      if (expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);
      }

      // Store in database
      const result = await this.pool.query(
        `INSERT INTO api_keys (
          tenant_id, name, key_prefix, key_hash, scopes, rate_limit,
          expires_at, is_active, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, tenant_id, name, key_prefix, key_hash, scopes, rate_limit,
                  expires_at, is_active, created_by, created_at, updated_at`,
        [tenantId, name, keyPrefix, keyHash, scopes, rateLimit, expiresAt, true, userId]
      );

      const apiKey = this.mapRowToApiKey(result.rows[0]);

      logger.info('[ApiKey] API key created', {
        tenantId,
        apiKeyId: apiKey.id,
        name,
        scopes,
      });

      // Return both the API key object and the plain key (only time we'll show it)
      return { apiKey, plainKey };
    } catch (error: any) {
      logger.error('[ApiKey] Failed to create API key', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to create API key');
    }
  }

  /**
   * Validate an API key
   */
  async validateApiKey(plainKey: string): Promise<ApiKeyValidationResult> {
    try {
      if (!plainKey || plainKey.length < 32) {
        return { valid: false, reason: 'Invalid key format' };
      }

      // Extract prefix
      const keyPrefix = plainKey.substring(0, 8);
      const keyHash = this.hashKey(plainKey);

      // Find key by prefix and hash
      const result = await this.pool.query(
        `SELECT
          id, tenant_id, name, key_prefix, key_hash, scopes, rate_limit,
          expires_at, last_used_at, is_active, created_by, created_at, updated_at
         FROM api_keys
         WHERE key_prefix = $1 AND key_hash = $2`,
        [keyPrefix, keyHash]
      );

      if (result.rows.length === 0) {
        return { valid: false, reason: 'Key not found' };
      }

      const apiKey = this.mapRowToApiKey(result.rows[0]);

      // Check if active
      if (!apiKey.isActive) {
        return { valid: false, reason: 'Key has been revoked', apiKey };
      }

      // Check expiration
      if (apiKey.expiresAt && new Date() > apiKey.expiresAt) {
        return { valid: false, expired: true, reason: 'Key has expired', apiKey };
      }

      // Check rate limit
      const rateLimitExceeded = await this.checkRateLimit(apiKey);
      if (rateLimitExceeded) {
        return { valid: false, rateLimitExceeded: true, reason: 'Rate limit exceeded', apiKey };
      }

      // Update last used timestamp
      await this.updateLastUsed(apiKey.id);

      logger.info('[ApiKey] API key validated', {
        tenantId: apiKey.tenantId,
        apiKeyId: apiKey.id,
      });

      return { valid: true, apiKey };
    } catch (error: any) {
      logger.error('[ApiKey] Failed to validate API key', {
        error: error.message,
      });
      return { valid: false, reason: 'Validation error' };
    }
  }

  /**
   * List API keys for a tenant
   */
  async listApiKeys(tenantId: string): Promise<ApiKey[]> {
    try {
      if (!tenantId) {
        throw new Error('tenantId is required');
      }

      const result = await this.pool.query(
        `SELECT
          id, tenant_id, name, key_prefix, key_hash, scopes, rate_limit,
          expires_at, last_used_at, is_active, created_by, created_at, updated_at
         FROM api_keys
         WHERE tenant_id = $1
         ORDER BY created_at DESC`,
        [tenantId]
      );

      return result.rows.map(row => this.mapRowToApiKey(row));
    } catch (error: any) {
      logger.error('[ApiKey] Failed to list API keys', {
        tenantId,
        error: error.message,
      });
      throw new Error('Failed to list API keys');
    }
  }

  /**
   * Revoke an API key
   */
  async revokeApiKey(tenantId: string, apiKeyId: string): Promise<void> {
    try {
      if (!tenantId || !apiKeyId) {
        throw new Error('tenantId and apiKeyId are required');
      }

      const result = await this.pool.query(
        `UPDATE api_keys
         SET is_active = false, updated_at = NOW()
         WHERE id = $1 AND tenant_id = $2`,
        [apiKeyId, tenantId]
      );

      if (result.rowCount === 0) {
        throw new Error('API key not found');
      }

      // Clear rate limit cache
      await this.clearRateLimit(apiKeyId);

      logger.info('[ApiKey] API key revoked', {
        tenantId,
        apiKeyId,
      });
    } catch (error: any) {
      logger.error('[ApiKey] Failed to revoke API key', {
        tenantId,
        apiKeyId,
        error: error.message,
      });
      throw new Error('Failed to revoke API key');
    }
  }

  /**
   * Rotate an API key (create new, revoke old)
   */
  async rotateApiKey(
    tenantId: string,
    apiKeyId: string,
    userId: string
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    try {
      if (!tenantId || !apiKeyId || !userId) {
        throw new Error('tenantId, apiKeyId, and userId are required');
      }

      // Get old key
      const result = await this.pool.query(
        `SELECT name, scopes, rate_limit, expires_at
         FROM api_keys
         WHERE id = $1 AND tenant_id = $2`,
        [apiKeyId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new Error('API key not found');
      }

      const oldKey = result.rows[0];

      // Create new key with same settings
      const expiresInDays = oldKey.expires_at
        ? Math.ceil((new Date(oldKey.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : undefined;

      const newKey = await this.createApiKey({
        tenantId,
        userId,
        name: `${oldKey.name} (rotated)`,
        scopes: oldKey.scopes,
        rateLimit: oldKey.rate_limit,
        expiresInDays,
      });

      // Revoke old key
      await this.revokeApiKey(tenantId, apiKeyId);

      logger.info('[ApiKey] API key rotated', {
        tenantId,
        oldKeyId: apiKeyId,
        newKeyId: newKey.apiKey.id,
      });

      return newKey;
    } catch (error: any) {
      logger.error('[ApiKey] Failed to rotate API key', {
        tenantId,
        apiKeyId,
        error: error.message,
      });
      throw new Error('Failed to rotate API key');
    }
  }

  /**
   * Update API key scopes
   */
  async updateScopes(tenantId: string, apiKeyId: string, scopes: string[]): Promise<void> {
    try {
      if (!tenantId || !apiKeyId || !scopes || scopes.length === 0) {
        throw new Error('Invalid parameters');
      }

      const result = await this.pool.query(
        `UPDATE api_keys
         SET scopes = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [scopes, apiKeyId, tenantId]
      );

      if (result.rowCount === 0) {
        throw new Error('API key not found');
      }

      logger.info('[ApiKey] API key scopes updated', {
        tenantId,
        apiKeyId,
        scopes,
      });
    } catch (error: any) {
      logger.error('[ApiKey] Failed to update scopes', {
        tenantId,
        apiKeyId,
        error: error.message,
      });
      throw new Error('Failed to update scopes');
    }
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(apiKeyId: string): Promise<{
    requestCount: number;
    lastHour: number;
    lastDay: number;
    lastWeek: number;
  }> {
    try {
      const now = Date.now();
      const hourAgo = now - 60 * 60 * 1000;
      const dayAgo = now - 24 * 60 * 60 * 1000;
      const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

      // Get usage from Redis sorted set
      const allRequests = await this.redis.zrange(`apikey:usage:${apiKeyId}`, 0, -1, 'WITHSCORES');

      let lastHour = 0;
      let lastDay = 0;
      let lastWeek = 0;

      for (let i = 1; i < allRequests.length; i += 2) {
        const timestamp = parseInt(allRequests[i]);
        if (timestamp > hourAgo) lastHour++;
        if (timestamp > dayAgo) lastDay++;
        if (timestamp > weekAgo) lastWeek++;
      }

      return {
        requestCount: allRequests.length / 2,
        lastHour,
        lastDay,
        lastWeek,
      };
    } catch (error: any) {
      logger.error('[ApiKey] Failed to get usage stats', {
        apiKeyId,
        error: error.message,
      });
      return { requestCount: 0, lastHour: 0, lastDay: 0, lastWeek: 0 };
    }
  }

  /**
   * Generate a secure random API key
   */
  private generateSecureKey(): string {
    // Format: cfk_<32 random hex chars>
    const randomBytes = crypto.randomBytes(32);
    return `cfk_${randomBytes.toString('hex')}`;
  }

  /**
   * Hash an API key using SHA-256
   */
  private hashKey(plainKey: string): string {
    return crypto.createHash('sha256').update(plainKey).digest('hex');
  }

  /**
   * Check rate limit for API key
   */
  private async checkRateLimit(apiKey: ApiKey): Promise<boolean> {
    try {
      const key = `apikey:ratelimit:${apiKey.id}`;
      const now = Date.now();
      const windowStart = now - 60000; // 1 minute window

      // Add current request to sorted set
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // Remove old entries outside window
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count requests in window
      const count = await this.redis.zcard(key);

      // Set expiration on key
      await this.redis.expire(key, 120); // 2 minutes

      // Also track usage for statistics
      await this.redis.zadd(`apikey:usage:${apiKey.id}`, now, `${now}`);
      await this.redis.expire(`apikey:usage:${apiKey.id}`, 7 * 24 * 60 * 60); // 7 days

      return count > apiKey.rateLimit;
    } catch (error: any) {
      logger.error('[ApiKey] Failed to check rate limit', {
        apiKeyId: apiKey.id,
        error: error.message,
      });
      return false; // Fail open
    }
  }

  /**
   * Clear rate limit cache
   */
  private async clearRateLimit(apiKeyId: string): Promise<void> {
    try {
      await this.redis.del(`apikey:ratelimit:${apiKeyId}`);
      await this.redis.del(`apikey:usage:${apiKeyId}`);
    } catch (error: any) {
      logger.error('[ApiKey] Failed to clear rate limit', {
        apiKeyId,
        error: error.message,
      });
    }
  }

  /**
   * Update last used timestamp
   */
  private async updateLastUsed(apiKeyId: string): Promise<void> {
    try {
      await this.pool.query(
        'UPDATE api_keys SET last_used_at = NOW() WHERE id = $1',
        [apiKeyId]
      );
    } catch (error: any) {
      // Non-critical error, just log
      logger.warn('[ApiKey] Failed to update last_used_at', {
        apiKeyId,
        error: error.message,
      });
    }
  }

  /**
   * Map database row to ApiKey object
   */
  private mapRowToApiKey(row: any): ApiKey {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      keyPrefix: row.key_prefix,
      keyHash: row.key_hash,
      scopes: row.scopes,
      rateLimit: row.rate_limit,
      expiresAt: row.expires_at,
      lastUsedAt: row.last_used_at,
      isActive: row.is_active,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
