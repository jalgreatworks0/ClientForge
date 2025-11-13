/**
 * Auth HTTP Pipeline Test App
 *
 * Lightweight Express app for testing the auth middleware pipeline:
 * - TenantGuard (multi-tenant isolation enforcement)
 * - InputSanitizer (XSS/injection protection)
 * - RateLimiter (abuse protection)
 *
 * This app is ONLY for testing - no DB or external dependencies.
 */

import express, { Request, Response, NextFunction } from 'express'
import request from 'supertest'

import { tenantGuard } from '../../backend/middleware/tenant-guard'
import { rateLimit } from '../../backend/middleware/rate-limit'

/**
 * Simple email sanitizer (inline implementation to avoid ESM dependency issues)
 * Converts to lowercase, trims, removes non-email characters
 */
function sanitizeEmailSimple(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim()

  // Remove any characters that are not alphanumeric, @, ., -, +, or _
  sanitized = sanitized.replace(/[^a-z0-9@.\-+_]/g, '')

  // Basic email format validation
  const emailRegex = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
  if (!emailRegex.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Simple HTML tag stripper (inline implementation to avoid ESM dependency issues)
 * Removes all HTML tags and dangerous content
 */
function stripHtmlTags(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  // Remove HTML tags
  return input.replace(/<[^>]*>/g, '')
}

/**
 * Simple input sanitization middleware
 * Sanitizes email and password fields in request body
 */
function inputSanitizerMiddleware(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    // Sanitize email field
    if (typeof req.body.email === 'string') {
      req.body.email = sanitizeEmailSimple(req.body.email)
    }

    // Sanitize password field (strip HTML but keep special chars for passwords)
    if (typeof req.body.password === 'string') {
      req.body.password = stripHtmlTags(req.body.password)
    }

    // Sanitize any other string fields
    for (const key in req.body) {
      if (
        typeof req.body[key] === 'string' &&
        key !== 'email' &&
        key !== 'password' &&
        key !== 'tenantId'
      ) {
        req.body[key] = stripHtmlTags(req.body[key])
      }
    }
  }

  next()
}

/**
 * Create Express app for auth pipeline testing
 *
 * Middleware stack:
 * 1. JSON body parsing
 * 2. TenantGuard (enforces x-tenant-id header)
 * 3. InputSanitizer (sanitizes request body)
 * 4. RateLimiter (optional, configurable per route)
 *
 * @returns Express app configured for testing
 */
export function makeAuthPipelineTestApp() {
  const app = express()

  // Step 1: JSON body parsing
  app.use(express.json())

  // Step 2: TenantGuard - enforces multi-tenant isolation
  app.use('/auth', tenantGuard)

  // Step 3: InputSanitizer - sanitizes request body
  app.use('/auth', inputSanitizerMiddleware)

  // Test route: POST /auth/test-login
  // Returns sanitized input back to caller for verification
  app.post('/auth/test-login', (_req: Request, res: Response) => {
    res.status(200).json({
      tenantId: _req.tenantId,
      email: _req.body.email,
      password: _req.body.password,
      message: 'Auth pipeline processed successfully',
    })
  })

  // Test route with rate limiting: POST /auth/test-login-rate-limited
  // This route includes rate limiting (3 requests per minute for testing)
  app.post(
    '/auth/test-login-rate-limited',
    rateLimit({
      max: 3,
      windowSeconds: 60,
      message: 'Too many test login attempts',
    }),
    (_req: Request, res: Response) => {
      res.status(200).json({
        tenantId: _req.tenantId,
        email: _req.body.email,
        password: _req.body.password,
        message: 'Auth pipeline with rate limiting processed successfully',
      })
    }
  )

  // Health check route (no middleware)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ ok: true })
  })

  return app
}

/**
 * Helper for specs that want supertest directly
 *
 * @returns Supertest instance with auth pipeline app
 */
export function requestAuthPipelineApp() {
  return request(makeAuthPipelineTestApp())
}
