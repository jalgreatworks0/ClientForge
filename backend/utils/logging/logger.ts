/**
 * Winston Logger Configuration
 * Centralized logging for the entire application
 */

import winston from 'winston'
import path from 'path'
import 'winston-mongodb'

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
}

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'cyan',
}

// Tell winston to use these colors
winston.addColors(colors)

// Define log format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
)

// Define console format (for development)
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf((info) => {
    const { timestamp, level, message, ...meta } = info
    const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
    return `${timestamp} [${level}]: ${message} ${metaString}`
  })
)

// Define which transports to use
const transports: winston.transport[] = []

// Console transport (always enabled in development)
if (process.env.NODE_ENV === 'development') {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
    })
  )
} else {
  // Production: JSON format for log aggregation
  transports.push(
    new winston.transports.Console({
      format,
    })
  )
}

// File transports (errors and combined)
const logDir = process.env.LOG_DIR || path.join(process.cwd(), 'logs')

transports.push(
  // Error log file
  new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
  }),
  // Combined log file
  new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
  })
)

// MongoDB transport for centralized logging
const mongodbUri = process.env.MONGODB_URI || 'mongodb://crm:password@localhost:27017/clientforge?authSource=admin'
transports.push(
  new winston.transports.MongoDB({
    db: mongodbUri,
    collection: 'app_logs',
    level: 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      winston.format.errors({ stack: true }),
      winston.format.splat(),
      winston.format.json()
    ),
    metaData: {
      timestamp: new Date(),
      service: 'clientforge-crm',
    },
    tryReconnect: true,
    decolorize: true,
  })
)

// Create the logger
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels,
  format,
  transports,
  exitOnError: false,
})

// Create a stream for Morgan HTTP request logging
export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim())
  },
}

/**
 * Helper function to safely log objects
 */
export function logSafe(level: string, message: string, meta?: any): void {
  try {
    // Remove sensitive data
    const safeMeta = meta ? sanitizeLogData(meta) : undefined
    logger.log(level, message, safeMeta)
  } catch (error) {
    logger.error('Failed to log message', { originalMessage: message, error })
  }
}

/**
 * Sanitize log data to remove sensitive information
 */
function sanitizeLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sensitiveKeys = [
    'password',
    'passwordHash',
    'token',
    'accessToken',
    'refreshToken',
    'secret',
    'apiKey',
    'creditCard',
    'ssn',
    'authorization',
  ]

  const sanitized = Array.isArray(data) ? [...data] : { ...data }

  for (const key in sanitized) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '***REDACTED***'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeLogData(sanitized[key])
    }
  }

  return sanitized
}

export default logger
