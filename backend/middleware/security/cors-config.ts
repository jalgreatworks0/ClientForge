/**
 * Secure CORS Configuration
 * Implements strict CORS policies to prevent unauthorized access
 *
 * Security Features:
 * - Dynamic origin validation with whitelist
 * - Credential support with strict origin checking
 * - Pre-flight caching for performance
 * - Environment-based configuration
 */

import cors, { CorsOptions, CorsOptionsDelegate } from 'cors'
import { Request } from 'express'

import { logger } from '../../utils/logging/logger'

/**
 * Allowed origins based on environment
 */
const getAllowedOrigins = (): string[] => {
  const env = process.env.NODE_ENV || 'development'

  switch (env) {
    case 'production':
      // Production: Only allow specific domains
      return [
        process.env.FRONTEND_URL || 'https://app.clientforge.com',
        process.env.ADMIN_URL || 'https://admin.clientforge.com',
        'https://clientforge.com',
        'https://www.clientforge.com',
      ]

    case 'staging':
      // Staging: Allow staging domains
      return [
        process.env.FRONTEND_URL || 'https://staging.clientforge.com',
        process.env.ADMIN_URL || 'https://admin-staging.clientforge.com',
        'http://localhost:3000',
        'http://localhost:3001',
      ]

    case 'development':
    default:
      // Development: Allow localhost on common ports
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:4200',
        'http://localhost:5173', // Vite default
        'http://localhost:8080',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ]
  }
}

/**
 * Additional custom origins from environment variable
 * Comma-separated list in ALLOWED_ORIGINS env var
 */
const getCustomAllowedOrigins = (): string[] => {
  const customOrigins = process.env.ALLOWED_ORIGINS

  if (!customOrigins) {
    return []
  }

  return customOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0)
}

/**
 * Complete list of allowed origins
 */
const allowedOrigins = [...getAllowedOrigins(), ...getCustomAllowedOrigins()]

/**
 * Validate if an origin is allowed
 */
function isOriginAllowed(origin: string | undefined): boolean {
  if (!origin) {
    // Allow requests with no origin (mobile apps, Postman, curl, etc.)
    // In production, you may want to disable this
    return process.env.NODE_ENV !== 'production'
  }

  // Check if origin is in whitelist
  if (allowedOrigins.includes(origin)) {
    return true
  }

  // Check for wildcard patterns (e.g., *.clientforge.com)
  for (const allowedOrigin of allowedOrigins) {
    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin.replace('*', '.*')
      const regex = new RegExp(`^${pattern}$`)

      if (regex.test(origin)) {
        return true
      }
    }
  }

  return false
}

/**
 * CORS options delegate with dynamic origin validation
 */
const corsOptionsDelegate: CorsOptionsDelegate = (req: Request, callback) => {
  const origin = req.get('origin')

  const corsOptions: CorsOptions = {
    // Dynamic origin validation
    origin: (requestOrigin, cb) => {
      // Allow requests with no origin (e.g., mobile apps, Postman)
      if (!requestOrigin) {
        if (process.env.NODE_ENV === 'production') {
          logger.warn('Request with no origin rejected in production', {
            path: req.path,
            method: req.method,
            ip: req.ip,
          })
          return cb(new Error('CORS: Origin not allowed'), false)
        }

        return cb(null, true)
      }

      // Validate origin against whitelist
      if (isOriginAllowed(requestOrigin)) {
        logger.debug('CORS: Origin allowed', {
          origin: requestOrigin,
          path: req.path,
        })
        return cb(null, true)
      }

      // Reject unknown origins
      logger.warn('CORS: Origin rejected', {
        origin: requestOrigin,
        path: req.path,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('user-agent'),
      })

      return cb(new Error('CORS: Origin not allowed'), false)
    },

    // Allow credentials (cookies, authorization headers)
    credentials: true,

    // Allowed HTTP methods
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    // Allowed request headers
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-HTTP-Method-Override',
      'X-Tenant-ID',
      'X-Request-ID',
      'X-Client-Version',
      'Accept',
      'Accept-Language',
      'Cache-Control',
    ],

    // Exposed response headers (visible to frontend)
    exposedHeaders: [
      'X-Total-Count',
      'X-Page',
      'X-Per-Page',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Request-ID',
      'X-Auth-User-ID',
      'X-Auth-Tenant-ID',
    ],

    // Pre-flight cache duration (24 hours)
    maxAge: 86400,

    // Pass OPTIONS requests to next handler
    preflightContinue: false,

    // Provide successful response for OPTIONS requests
    optionsSuccessStatus: 204,
  }

  callback(null, corsOptions)
}

/**
 * Create CORS middleware with secure configuration
 */
export function createSecureCORS() {
  logger.info('CORS middleware initialized', {
    environment: process.env.NODE_ENV,
    allowedOrigins: allowedOrigins.length,
    credentialsEnabled: true,
  })

  return cors(corsOptionsDelegate)
}

/**
 * Strict CORS for sensitive endpoints
 * Only allows authenticated requests from known origins
 */
export function strictCORS() {
  const strictOptions: CorsOptions = {
    origin: (requestOrigin, callback) => {
      // Reject requests with no origin
      if (!requestOrigin) {
        logger.warn('Strict CORS: Request with no origin rejected', {
          environment: process.env.NODE_ENV,
        })
        return callback(new Error('CORS: Origin required for this endpoint'), false)
      }

      // Only allow whitelisted origins
      if (isOriginAllowed(requestOrigin)) {
        return callback(null, true)
      }

      logger.warn('Strict CORS: Origin rejected', {
        origin: requestOrigin,
      })

      return callback(new Error('CORS: Origin not allowed'), false)
    },

    credentials: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'], // No GET for sensitive ops
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID'],
    maxAge: 0, // No caching for sensitive endpoints
    optionsSuccessStatus: 204,
  }

  logger.info('Strict CORS middleware initialized')

  return cors(strictOptions)
}

/**
 * Public CORS (read-only endpoints)
 * Allows all origins but with limited methods
 */
export function publicCORS() {
  const publicOptions: CorsOptions = {
    origin: '*', // Allow all origins
    credentials: false, // No credentials
    methods: ['GET', 'OPTIONS'], // Read-only
    allowedHeaders: ['Content-Type', 'Accept', 'X-Request-ID'],
    exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page'],
    maxAge: 86400, // 24 hours
    optionsSuccessStatus: 204,
  }

  logger.info('Public CORS middleware initialized')

  return cors(publicOptions)
}

/**
 * Get allowed origins list (for debugging)
 */
export function getAllowedOriginsList(): string[] {
  return [...allowedOrigins]
}

/**
 * Check if an origin is allowed (utility function)
 */
export function checkOriginAllowed(origin: string): boolean {
  return isOriginAllowed(origin)
}

// Log CORS configuration on startup
logger.info('CORS configuration loaded', {
  environment: process.env.NODE_ENV,
  allowedOrigins: allowedOrigins,
  credentialsEnabled: true,
  preflightCaching: '24 hours',
})
