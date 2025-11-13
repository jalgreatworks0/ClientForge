/**
 * Test CORS & Security Headers Mini-App
 * Provides isolated Express app for testing CORS and security header behavior
 */

import express, { Application, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import cors from 'cors'
import { corsConfig } from '../../config/security/cors-config'
import { errorHandler } from '../../backend/utils/errors/error-handler'
import { AppError } from '../../backend/utils/errors/app-error'

/**
 * Creates a test Express app configured for CORS and security headers testing
 *
 * Middleware order (matches production):
 * 1. Helmet (security headers)
 * 2. CORS
 * 3. Body parsing
 * 4. Routes
 * 5. 404 handler
 * 6. Error handler
 */
export function makeCorsSecurityTestApp(): Application {
  const app = express()

  // Security headers - matches production configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
      hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true,
      },
    })
  )

  // CORS - uses actual production config
  app.use(cors(corsConfig))

  // Body parsing middleware
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  /**
   * Simple GET route
   * Tests: Basic CORS behavior, security headers on success
   */
  app.get('/cors/simple', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Simple GET request',
    })
  })

  /**
   * Simple POST route
   * Tests: CORS with POST method, body parsing
   */
  app.post('/cors/simple', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      message: 'Simple POST request',
      receivedBody: req.body,
    })
  })

  /**
   * Authenticated route
   * Tests: CORS with Authorization header, credentials
   */
  app.get('/cors/authenticated', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization

    if (!authHeader) {
      throw new AppError('Missing authorization header', 401)
    }

    res.status(200).json({
      success: true,
      message: 'Authenticated request',
      hasAuth: true,
    })
  })

  /**
   * Error route
   * Tests: Security headers on error responses
   */
  app.get('/cors/error', (req: Request, res: Response) => {
    throw new AppError('Test error for CORS/security headers', 500)
  })

  /**
   * Validation error route
   * Tests: Security headers on validation errors (400)
   */
  app.post('/cors/validation-error', (req: Request, res: Response) => {
    throw new AppError('Validation failed', 400)
  })

  /**
   * Custom headers route
   * Tests: Exposed headers (X-Total-Count, X-Page-Count, X-Request-ID)
   */
  app.get('/cors/custom-headers', (req: Request, res: Response) => {
    res.setHeader('X-Total-Count', '100')
    res.setHeader('X-Page-Count', '10')
    res.setHeader('X-Request-ID', 'test-request-123')
    res.setHeader('X-Internal-Only', 'should-not-be-exposed') // Not in exposedHeaders

    res.status(200).json({
      success: true,
      message: 'Response with custom headers',
    })
  })

  /**
   * Secure data route
   * Tests: Security headers on sensitive data responses
   */
  app.get('/cors/secure-data', (req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      sensitiveData: 'confidential-info',
    })
  })

  /**
   * OPTIONS route (preflight)
   * Tests: Preflight handling, OPTIONS success status
   */
  app.options('/cors/preflight', (req: Request, res: Response) => {
    // CORS middleware handles this, but we define it explicitly for testing
    res.sendStatus(200)
  })

  // 404 handler - tests security headers on not found
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
  // Tests: Security headers on error responses
  app.use(errorHandler)

  return app
}
