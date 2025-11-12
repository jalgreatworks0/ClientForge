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
  user?: {
    id: string
    email: string
    tenantId: string
    role?: string
    permissions?: string[]
  }
}

/**
 * Type guard to check if request is authenticated
 */
export function isAuthenticated(req: Request): req is AuthRequest {
  return 'user' in req && req.user !== undefined
}
