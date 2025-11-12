/**
 * Centralized Authentication Types
 * Used across all controllers and middleware
 */

import { Request } from 'express'

/**
 * Authenticated request with user context
 * Extends Express Request with user information
 * Aligned with Express.Request augmentation in types/express.d.ts
 */
export interface AuthRequest extends Request {
  user: NonNullable<Request['user']>
  tenantId: string
}

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticated(req: Request): req is AuthRequest {
  return req.user !== undefined && req.user !== null && req.user.tenantId !== undefined
}
