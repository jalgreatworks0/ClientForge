/**
 * Test Validation Mini-App
 * Provides isolated Express app for testing request validation behavior
 */

import express, { Application, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { validateRequest } from '../../backend/middleware/validate-request'
import { errorHandler } from '../../backend/utils/errors/error-handler'
import { UnauthorizedError } from '../../backend/utils/errors/app-error'

/**
 * Mock authenticate middleware for testing
 * Simulates tenant extraction from header
 */
function mockAuthenticate(req: any, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id']

  if (!tenantId) {
    return next(new UnauthorizedError('Missing tenant ID'))
  }

  // Attach mock user with tenant
  req.user = {
    userId: 'test-user-id',
    tenantId: tenantId as string,
    roleId: 'test-role-id',
    email: 'test@example.com',
  }

  next()
}

/**
 * Mock sanitizer middleware
 * Trims whitespace from string fields
 */
function mockSanitizer(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body)
  }
  next()
}

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj.trim()
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject)
  }
  if (obj && typeof obj === 'object') {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  return obj
}

/**
 * Validation schemas for test routes
 */
const schemas = {
  basic: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }).strict(), // Reject extra fields

  basicLoose: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
  }), // Allow extra fields (will be stripped by Zod)

  nested: z.object({
    profile: z.object({
      firstName: z.string().min(1, 'First name is required'),
      age: z.number().int().positive('Age must be a positive integer'),
    }),
    tags: z.array(z.string()).min(1, 'At least one tag is required'),
  }).strict(),

  array: z.object({
    items: z.array(
      z.object({
        id: z.string().uuid('Item ID must be a valid UUID'),
        quantity: z.number().int().positive('Quantity must be a positive integer'),
      })
    ).min(1, 'At least one item is required'),
  }).strict(),

  query: z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val, 10) : 20),
    search: z.string().optional(),
  }),
}

/**
 * Creates a test Express app configured for validation testing
 */
export function makeValidationTestApp(): Application {
  const app = express()

  // Body parsing middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  /**
   * Basic validation route (protected)
   * Tests: happy path, missing fields, type errors
   */
  app.post(
    '/validation/basic',
    mockAuthenticate,
    mockSanitizer,
    validateRequest({ body: schemas.basic }),
    (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: {
          email: req.body.email,
          password: req.body.password,
          receivedKeys: Object.keys(req.body),
        },
      })
    }
  )

  /**
   * Extra fields route (loose validation)
   * Tests: extra field stripping behavior
   */
  app.post(
    '/validation/extra-fields',
    mockAuthenticate,
    mockSanitizer,
    validateRequest({ body: schemas.basicLoose }),
    (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: {
          receivedKeys: Object.keys(req.body),
          values: req.body,
        },
      })
    }
  )

  /**
   * Nested validation route
   * Tests: nested object validation, nested errors
   */
  app.post(
    '/validation/nested',
    mockAuthenticate,
    mockSanitizer,
    validateRequest({ body: schemas.nested }),
    (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: {
          profile: req.body.profile,
          tags: req.body.tags,
        },
      })
    }
  )

  /**
   * Array validation route
   * Tests: array item validation, array errors
   */
  app.post(
    '/validation/array',
    mockAuthenticate,
    mockSanitizer,
    validateRequest({ body: schemas.array }),
    (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: {
          itemCount: req.body.items.length,
          items: req.body.items,
        },
      })
    }
  )

  /**
   * No tenant route
   * Tests: middleware ordering (authenticate before validation)
   */
  app.post(
    '/validation/no-tenant',
    mockAuthenticate, // This will fail if no tenant header
    mockSanitizer,
    validateRequest({ body: schemas.basic }),
    (req: Request, res: Response) => {
      res.status(200).json({ success: true })
    }
  )

  /**
   * Query validation route
   * Tests: query parameter validation
   */
  app.get(
    '/validation/query',
    mockAuthenticate,
    validateRequest({ query: schemas.query }),
    (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: {
          page: req.query.page,
          limit: req.query.limit,
          search: req.query.search,
        },
      })
    }
  )

  /**
   * Whitespace test route
   * Tests: sanitizer + validation interaction
   */
  app.post(
    '/validation/whitespace',
    mockAuthenticate,
    mockSanitizer, // This should trim whitespace
    validateRequest({ body: schemas.basic }),
    (req: Request, res: Response) => {
      res.status(200).json({
        success: true,
        data: {
          email: req.body.email,
          password: req.body.password,
        },
      })
    }
  )

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        statusCode: 404,
        path: req.path,
      },
    })
  })

  // Global error handler (must be last)
  app.use(errorHandler)

  return app
}
