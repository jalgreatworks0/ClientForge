/**
 * API Key Authentication Middleware
 * Validates API keys and attaches tenant/scope information to requests
 */

import { Request, Response, NextFunction } from 'express';

import { ApiKeyService } from '../services/api-keys/api-key.service';
import { logger } from '../utils/logging/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      apiKey?: {
        id: string;
        tenantId: string;
        scopes: string[];
        rateLimit: number;
      };
    }
  }
}

const apiKeyService = new ApiKeyService();

/**
 * Middleware to authenticate requests using API keys
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Extract API key from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Missing Authorization header',
          code: 'MISSING_API_KEY',
        },
      });
      return;
    }

    // Expected format: "Bearer cfk_..."
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({
        success: false,
        error: {
          message: 'Invalid Authorization header format. Use: Bearer <api_key>',
          code: 'INVALID_AUTH_FORMAT',
        },
      });
      return;
    }

    const plainKey = parts[1];

    // Validate the API key
    const validation = await apiKeyService.validateApiKey(plainKey);

    if (!validation.valid) {
      logger.warn('[ApiKeyAuth] Invalid API key attempt', {
        reason: validation.reason,
        ip: req.ip,
        path: req.path,
      });

      const statusCode = validation.rateLimitExceeded ? 429 : 401;
      const errorCode = validation.rateLimitExceeded
        ? 'RATE_LIMIT_EXCEEDED'
        : validation.expired
        ? 'API_KEY_EXPIRED'
        : 'INVALID_API_KEY';

      res.status(statusCode).json({
        success: false,
        error: {
          message: validation.reason || 'Invalid API key',
          code: errorCode,
        },
      });
      return;
    }

    // Attach API key info to request
    req.apiKey = {
      id: validation.apiKey!.id,
      tenantId: validation.apiKey!.tenantId,
      scopes: validation.apiKey!.scopes,
      rateLimit: validation.apiKey!.rateLimit,
    };

    // Also set tenantId for compatibility with other middleware
    if (req.user) {
      req.user.tenantId = validation.apiKey!.tenantId;
    } else {
      req.user = { tenantId: validation.apiKey!.tenantId } as any;
    }

    next();
  } catch (error: any) {
    logger.error('[ApiKeyAuth] Authentication error', {
      error: error.message,
      path: req.path,
    });

    res.status(500).json({
      success: false,
      error: {
        message: 'Authentication error',
        code: 'AUTH_ERROR',
      },
    });
  }
}

/**
 * Middleware to check if API key has required scope
 */
export function requireScope(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.apiKey) {
      res.status(401).json({
        success: false,
        error: {
          message: 'Not authenticated',
          code: 'NOT_AUTHENTICATED',
        },
      });
      return;
    }

    const hasRequiredScope = requiredScopes.some(scope =>
      req.apiKey!.scopes.includes(scope) || req.apiKey!.scopes.includes('*')
    );

    if (!hasRequiredScope) {
      logger.warn('[ApiKeyAuth] Insufficient scope', {
        apiKeyId: req.apiKey.id,
        requiredScopes,
        availableScopes: req.apiKey.scopes,
      });

      res.status(403).json({
        success: false,
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_SCOPE',
          requiredScopes,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Middleware for optional API key authentication
 * Continues even if no API key is provided
 */
export async function optionalApiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  // If API key is provided, validate it
  await apiKeyAuth(req, res, next);
}
