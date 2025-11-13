/**
 * Test Error Handler Mini-App
 * Provides isolated Express app for testing error handler behavior
 */

import express, { Application, Request, Response, NextFunction } from 'express'
import { errorHandler } from '../../backend/utils/errors/error-handler'
import {
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  TooManyRequestsError,
  InternalServerError,
} from '../../backend/utils/errors/app-error'

/**
 * Creates a test Express app configured for error handler testing
 */
export function makeErrorHandlerTestApp(): Application {
  const app = express()

  // Body parsing middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  // Test routes that throw specific error types

  /**
   * Validation Error Route
   * Simulates a validation failure (e.g., invalid input data)
   */
  app.get('/test/validation-error', (req: Request, res: Response, next: NextFunction) => {
    next(
      new ValidationError('Validation failed', {
        fields: {
          email: 'Invalid email format',
          age: 'Must be a positive number',
        },
      })
    )
  })

  /**
   * Unauthorized Error Route
   * Simulates authentication failure (e.g., missing or invalid token)
   */
  app.get('/test/auth-error', (req: Request, res: Response, next: NextFunction) => {
    next(new UnauthorizedError('Authentication required'))
  })

  /**
   * Forbidden Error Route
   * Simulates authorization failure (e.g., insufficient permissions)
   */
  app.get('/test/forbidden-error', (req: Request, res: Response, next: NextFunction) => {
    next(new ForbiddenError('Insufficient permissions', { requiredRole: 'admin' }))
  })

  /**
   * Rate Limit Error Route
   * Simulates rate limiting (e.g., too many requests)
   */
  app.get('/test/rate-limit-error', (req: Request, res: Response, next: NextFunction) => {
    const error = new TooManyRequestsError('Rate limit exceeded', {
      limit: 100,
      windowMs: 900000,
      retryAfter: 15,
    })

    // Simulate rate limit headers that middleware would set
    res.setHeader('X-RateLimit-Limit', '100')
    res.setHeader('X-RateLimit-Remaining', '0')
    res.setHeader('X-RateLimit-Reset', String(Date.now() + 900000))
    res.setHeader('Retry-After', '900')

    next(error)
  })

  /**
   * Generic Error Route
   * Simulates an unexpected/unhandled error
   */
  app.get('/test/generic-error', (req: Request, res: Response, next: NextFunction) => {
    next(new Error('Something went wrong unexpectedly'))
  })

  /**
   * Internal Server Error Route
   * Simulates an operational server error
   */
  app.get('/test/server-error', (req: Request, res: Response, next: NextFunction) => {
    next(new InternalServerError('Database connection failed'))
  })

  /**
   * Not Found Error Route
   * Explicitly tests NotFoundError handling
   */
  app.get('/test/not-found-error', (req: Request, res: Response, next: NextFunction) => {
    next(new NotFoundError('User'))
  })

  /**
   * Synchronous Error Route
   * Tests error thrown synchronously (not via next())
   */
  app.get('/test/sync-error', (req: Request, res: Response, next: NextFunction) => {
    throw new ValidationError('Synchronous validation error')
  })

  // 404 handler for truly unknown routes (mimics production)
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.status(404).json({
      success: false,
      error: {
        message: 'Route not found',
        statusCode: 404,
        path: req.path,
      },
    })
  })

  // Mount the actual error handler middleware (must be last)
  app.use(errorHandler)

  return app
}
