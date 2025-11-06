/**
 * Application Error Class
 * Structured error handling for the entire application
 */

export class AppError extends Error {
  public readonly statusCode: number
  public readonly isOperational: boolean
  public readonly context?: Record<string, any>
  public readonly timestamp: Date

  constructor(
    message: string,
    statusCode: number = 500,
    context?: Record<string, any>,
    isOperational: boolean = true
  ) {
    super(message)

    this.statusCode = statusCode
    this.isOperational = isOperational
    this.context = context
    this.timestamp = new Date()

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor)

    // Set the prototype explicitly to maintain instanceof checks
    Object.setPrototypeOf(this, AppError.prototype)
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON(): Record<string, any> {
    return {
      success: false,
      error: {
        message: this.message,
        statusCode: this.statusCode,
        timestamp: this.timestamp.toISOString(),
        ...(process.env.NODE_ENV === 'development' && this.context && { context: this.context }),
      },
    }
  }
}

/**
 * Pre-defined error types for common scenarios
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 400, context)
    Object.setPrototypeOf(this, ValidationError.prototype)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', context?: Record<string, any>) {
    super(message, 401, context)
    Object.setPrototypeOf(this, UnauthorizedError.prototype)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', context?: Record<string, any>) {
    super(message, 403, context)
    Object.setPrototypeOf(this, ForbiddenError.prototype)
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', context?: Record<string, any>) {
    super(`${resource} not found`, 404, context)
    Object.setPrototypeOf(this, NotFoundError.prototype)
  }
}

export class ConflictError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, 409, context)
    Object.setPrototypeOf(this, ConflictError.prototype)
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests', context?: Record<string, any>) {
    super(message, 429, context)
    Object.setPrototypeOf(this, TooManyRequestsError.prototype)
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', context?: Record<string, any>) {
    super(message, 500, context)
    Object.setPrototypeOf(this, InternalServerError.prototype)
  }
}

export class ServiceUnavailableError extends AppError {
  constructor(message: string = 'Service unavailable', context?: Record<string, any>) {
    super(message, 503, context)
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype)
  }
}
