/**
 * Express Request Type Augmentation
 * Adds custom properties to Express Request interface
 */

import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      tenantId?: string
      userId?: string
      session?: Record<string, unknown>
      user?: {
        id: string
        userId: string  // Alias for id
        email: string
        tenantId: string
        role?: string
        permissions?: string[]
        provider?: 'google' | 'microsoft' | 'local'
        providerId?: string
      }
      file?: {
        fieldname: string
        originalname: string
        encoding: string
        mimetype: string
        size: number
        destination: string
        filename: string
        path: string
        buffer: Buffer
      }
      files?: {
        [fieldname: string]: Express.Multer.File[]
      } | Express.Multer.File[]
    }
  }
}

export {}
