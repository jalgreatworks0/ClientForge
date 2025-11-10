/**
 * Structured Logging Module for Elaria Command Center
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\utils\logger.js
 * Purpose: Winston-based structured logging with security, correlation IDs, and sensitive data masking
 */

import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { sanitizeLogData } from './security.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Log levels
const LOG_LEVELS = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Custom format for structured logs
const structuredFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Human-readable format for console
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}] ${message}`;

    // Add metadata if present
    if (Object.keys(metadata).length > 0) {
      const cleanMetadata = { ...metadata };
      delete cleanMetadata.timestamp;
      delete cleanMetadata.level;

      if (Object.keys(cleanMetadata).length > 0) {
        msg += ` ${JSON.stringify(cleanMetadata)}`;
      }
    }

    return msg;
  })
);

/**
 * Create Winston logger instance
 */
function createLogger(options = {}) {
  const {
    level = process.env.LOG_LEVEL || 'info',
    logDir = path.join(__dirname, '../../logs'),
    service = 'elaria-command-center',
    enableConsole = true,
    enableFile = true,
  } = options;

  const transports = [];

  // Console transport (for development)
  if (enableConsole) {
    transports.push(
      new winston.transports.Console({
        format: consoleFormat,
        level,
      })
    );
  }

  // File transports (for production)
  if (enableFile) {
    // All logs
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'elaria-combined.log'),
        format: structuredFormat,
        level: 'debug',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
        tailable: true,
      })
    );

    // Error logs only
    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'elaria-error.log'),
        format: structuredFormat,
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 10,
        tailable: true,
      })
    );
  }

  const logger = winston.createLogger({
    level,
    levels: LOG_LEVELS,
    defaultMeta: { service },
    transports,
    exitOnError: false,
  });

  return logger;
}

// Singleton logger instance
let loggerInstance = null;

/**
 * Get or create logger instance
 */
export function getLogger(options = {}) {
  if (!loggerInstance) {
    loggerInstance = createLogger(options);
  }
  return loggerInstance;
}

/**
 * Logger class with enhanced features
 */
export class Logger {
  constructor(options = {}) {
    this.logger = getLogger(options);
    this.correlationId = null;
  }

  /**
   * Set correlation ID for request tracking
   */
  setCorrelationId(id) {
    this.correlationId = id;
  }

  /**
   * Generate new correlation ID
   */
  generateCorrelationId() {
    this.correlationId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    return this.correlationId;
  }

  /**
   * Add correlation ID to metadata
   */
  _addCorrelationId(metadata) {
    if (this.correlationId) {
      return { ...metadata, correlationId: this.correlationId };
    }
    return metadata;
  }

  /**
   * Sanitize and log
   */
  _sanitizeAndLog(level, message, data = {}) {
    const sanitized = sanitizeLogData(message, data);
    const metadata = this._addCorrelationId(sanitized.data);

    this.logger[level](sanitized.message, metadata);
  }

  /**
   * Log info message
   */
  info(message, data = {}) {
    this._sanitizeAndLog('info', message, data);
  }

  /**
   * Log error message
   */
  error(message, error = null, data = {}) {
    const errorData = { ...data };

    if (error instanceof Error) {
      errorData.error = {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    } else if (error) {
      errorData.error = error;
    }

    this._sanitizeAndLog('error', message, errorData);
  }

  /**
   * Log warning message
   */
  warn(message, data = {}) {
    this._sanitizeAndLog('warn', message, data);
  }

  /**
   * Log debug message
   */
  debug(message, data = {}) {
    this._sanitizeAndLog('debug', message, data);
  }

  /**
   * Log HTTP request
   */
  http(message, data = {}) {
    this._sanitizeAndLog('http', message, data);
  }

  /**
   * Log LM Studio API call
   */
  logApiCall(method, endpoint, options = {}) {
    this.info('LM Studio API call', {
      method,
      endpoint,
      model: options.model,
      temperature: options.temperature,
      maxTokens: options.maxTokens,
      duration: options.duration,
    });
  }

  /**
   * Log model loading
   */
  logModelLoad(modelName, success, duration = null) {
    const data = { modelName, success };
    if (duration) {
      data.duration = duration;
    }

    if (success) {
      this.info('Model loaded successfully', data);
    } else {
      this.error('Model loading failed', null, data);
    }
  }

  /**
   * Log tool execution
   */
  logToolExecution(toolName, args, result, duration = null) {
    const data = {
      toolName,
      argCount: Object.keys(args || {}).length,
      success: !!result,
      duration,
    };

    this.info('Tool executed', data);
  }

  /**
   * Log WebSocket connection event
   */
  logWebSocket(event, details = {}) {
    this.info(`WebSocket ${event}`, {
      event,
      ...details,
    });
  }

  /**
   * Log memory usage
   */
  logMemoryUsage() {
    const usage = process.memoryUsage();
    this.debug('Memory usage', {
      rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
      external: `${Math.round(usage.external / 1024 / 1024)} MB`,
    });
  }

  /**
   * Log performance metric
   */
  logPerformance(operation, duration, metadata = {}) {
    this.info('Performance metric', {
      operation,
      duration: `${duration}ms`,
      ...metadata,
    });
  }

  /**
   * Log security event
   */
  logSecurityEvent(eventType, severity, details = {}) {
    const level = severity === 'high' || severity === 'critical' ? 'error' : 'warn';
    this[level](`Security event: ${eventType}`, {
      eventType,
      severity,
      ...details,
    });
  }

  /**
   * Create child logger with additional default metadata
   */
  child(metadata) {
    const childLogger = new Logger();
    childLogger.logger = this.logger.child(metadata);
    childLogger.correlationId = this.correlationId;
    return childLogger;
  }
}

/**
 * Create default logger instance
 */
export const logger = new Logger();

/**
 * Performance timer utility
 */
export class PerformanceTimer {
  constructor(operation, logger = null) {
    this.operation = operation;
    this.logger = logger || new Logger();
    this.startTime = Date.now();
  }

  /**
   * End timer and log performance
   */
  end(metadata = {}) {
    const duration = Date.now() - this.startTime;
    this.logger.logPerformance(this.operation, duration, metadata);
    return duration;
  }
}

/**
 * Helper function to create performance timer
 */
export function startTimer(operation, logger = null) {
  return new PerformanceTimer(operation, logger);
}

export default {
  Logger,
  logger,
  getLogger,
  PerformanceTimer,
  startTimer,
};
