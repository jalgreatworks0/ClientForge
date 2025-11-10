/**
 * Global Error Handler Middleware
 * Handles all errors in Express application
 */

import { Request, Response, NextFunction } from 'express'
import { AppError } from './app-error'
import { logger } from '../logging/logger'

/**
 * Global error handling middleware
 */
export function errorHandler(
  error: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Default error values
  let statusCode = 500
  let message = 'Internal server error'
  let isOperational = false
  let context: Record<string, any> | undefined

  // Handle AppError instances
  if (error instanceof AppError) {
    statusCode = error.statusCode
    message = error.message
    isOperational = error.isOperational
    context = error.context
  }

  // Log error
  const logContext = {
    statusCode,
    message,
    isOperational,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: (req as any).user?.userId,
    tenantId: (req as any).user?.tenantId,
    ...(context && { errorContext: context }),
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
  }

  if (statusCode >= 500) {
    logger.error('Server error', logContext)
  } else if (statusCode >= 400) {
    logger.warn('Client error', logContext)
  }

  // Send error response
  const response: any = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  }

  // Add additional context in development
  if (process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack
    if (context) {
      response.error.context = context
    }
  }

  res.status(statusCode).json(response)

  // If error is not operational, log as critical and potentially exit
  if (!isOperational && process.env.NODE_ENV === 'production') {
    logger.error('CRITICAL: Non-operational error occurred', {
      error: error.message,
      stack: error.stack,
    })
    // In production, you might want to:
    // - Send alert to monitoring service (Sentry, DataDog)
    // - Gracefully shutdown if error is critical
    // - Restart process via process manager (PM2, Kubernetes)
  }
}

/**
 * Handle unhandled promise rejections
 */
export function handleUnhandledRejection(reason: any, promise: Promise<any>): void {
  logger.error('Unhandled Promise Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise,
  })

  // In production, you might want to gracefully shutdown
  if (process.env.NODE_ENV === 'production') {
    // Give ongoing requests time to complete
    setTimeout(() => {
      process.exit(1)
    }, 5000)
  }
}

/**
 * Handle uncaught exceptions
 */
export function handleUncaughtException(error: Error): void {
  logger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
  })

  // Uncaught exceptions are serious - shutdown immediately
  process.exit(1)
}

/**
 * Setup global error handlers
 */
export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', handleUnhandledRejection)
  process.on('uncaughtException', handleUncaughtException)

  logger.info('[OK] Global error handlers configured')
}
