/**
 * Centralized Authentication Types
 * Used across all controllers and middleware
 */

import { Request } from 'express'

/**
 * Authenticated request with user context
 * Extends Express Request with user information
 */
export interface AuthRequest extends Request {
  user?: {
    userId: string
    tenantId: string
    roleId: string
    email?: string
    jti?: string
  }
}

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticated(req: Request): req is AuthRequest {
  return 'user' in req && req.user !== undefined
}
