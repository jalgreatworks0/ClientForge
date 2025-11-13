/**
 * Auth Test Helper
 * Utilities for authentication in tests
 */

import jwt from 'jsonwebtoken'

const DEFAULT_JWT_SECRET = 'test-secret-key'

export interface AuthTokenPayload {
  userId: string
  tenantId: string
  email?: string
  role?: string
  type?: 'access' | 'refresh'
}

/**
 * Generate a test JWT token
 */
export function generateTestJWT(payload: AuthTokenPayload, expiresIn = '1h'): string {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET

  return jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      email: payload.email,
      role: payload.role,
      type: payload.type ?? 'access',
    },
    secret,
    { expiresIn }
  )
}

/**
 * Generate auth headers for API requests
 */
export function createAuthHeaders(userId: string, tenantId: string): Record<string, string> {
  const token = generateTestJWT({ userId, tenantId })

  return {
    'x-tenant-id': tenantId,
    authorization: `Bearer ${token}`,
  }
}

/**
 * Generate test auth headers (default tenant)
 */
export function testAuthHeaders(userId = 'test_user'): Record<string, string> {
  return createAuthHeaders(userId, 'test_tenant')
}

/**
 * Decode a JWT token without verification (for testing)
 */
export function decodeTestJWT(token: string): AuthTokenPayload | null {
  try {
    const decoded = jwt.decode(token)
    return decoded as AuthTokenPayload
  } catch {
    return null
  }
}

/**
 * Generate an expired JWT token
 */
export function generateExpiredJWT(payload: AuthTokenPayload): string {
  const secret = process.env.JWT_SECRET || DEFAULT_JWT_SECRET

  return jwt.sign(
    {
      userId: payload.userId,
      tenantId: payload.tenantId,
      type: payload.type ?? 'access',
    },
    secret,
    { expiresIn: '-1h' } // Expired 1 hour ago
  )
}

/**
 * Generate a malformed JWT token
 */
export function generateMalformedJWT(): string {
  return 'invalid.jwt.token'
}
