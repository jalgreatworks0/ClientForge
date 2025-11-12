/**
 * Request Validation Middleware
 * Validates request body, query, and params using Zod schemas
 */

import { Request, Response, NextFunction } from 'express'
import { z, ZodError, ZodSchema } from 'zod'

import { ValidationError } from '../utils/errors/app-error'
import { logger } from '../utils/logging/logger'

export interface ValidationSchemas {
  body?: ZodSchema
  query?: ZodSchema
  params?: ZodSchema
}

/**
 * Middleware factory for request validation
 * Accepts either ValidationSchemas interface or a ZodObject with body/query/params
 */
export function validateRequest(schemas: ValidationSchemas | ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // If schemas is a ZodObject with shape property, extract body/query/params
      const validationSchemas: ValidationSchemas =
        schemas && typeof schemas === 'object' && 'shape' in schemas
          ? (schemas as any).shape
          : (schemas as ValidationSchemas);

      // Validate body
      if (validationSchemas.body) {
        req.body = await validationSchemas.body.parseAsync(req.body)
      }

      // Validate query params
      if (validationSchemas.query) {
        req.query = await validationSchemas.query.parseAsync(req.query)
      }

      // Validate route params
      if (validationSchemas.params) {
        req.params = await validationSchemas.params.parseAsync(req.params)
      }

      next()
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }))

        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors,
        })

        next(
          new ValidationError('Request validation failed', {
            errors,
          })
        )
      } else {
        logger.error('Unexpected validation error', { error })
        next(new ValidationError('Request validation failed'))
      }
    }
  }
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // UUID parameter
  uuidParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Pagination query
  paginationQuery: z.object({
    page: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 1))
      .refine((val) => val > 0, 'Page must be greater than 0'),
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : 20))
      .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
  }),

  // Email field
  email: z.string().email('Invalid email format').toLowerCase(),

  // Password field
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/,
      'Password must contain at least one special character'
    ),

  // Tenant ID (UUID)
  tenantId: z.string().uuid('Invalid tenant ID'),

  // User ID (UUID)
  userId: z.string().uuid('Invalid user ID'),
}
