/**
 * Security Utilities for Elaria Command Center
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\utils\security.js
 * Purpose: Input validation, path sanitization, and security helpers
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Validate and sanitize file paths to prevent path traversal attacks
 * @param {string} filePath - The file path to validate
 * @param {string} allowedBase - The base directory that files must be within
 * @returns {string} The validated absolute path
 * @throws {Error} If path is outside allowed base or contains suspicious patterns
 */
export function validateFilePath(filePath, allowedBase = null) {
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Invalid file path: must be a non-empty string');
  }

  // Check for null bytes (common attack vector)
  if (filePath.includes('\0')) {
    throw new Error('Invalid file path: contains null byte');
  }

  // Resolve to absolute path
  const resolved = path.resolve(filePath);

  // If allowedBase specified, ensure path is within it
  if (allowedBase) {
    const base = path.resolve(allowedBase);

    // Normalize both paths for comparison
    const normalizedResolved = path.normalize(resolved);
    const normalizedBase = path.normalize(base);

    if (!normalizedResolved.startsWith(normalizedBase)) {
      throw new Error(`Path traversal attempt: ${filePath} is outside allowed base ${allowedBase}`);
    }
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /\.\.[\/\\]/,  // Parent directory traversal
    /^[\/\\]{2,}/, // UNC paths or multiple slashes
    /[<>"|?*]/     // Invalid filename characters
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(filePath)) {
      throw new Error(`Invalid file path: contains suspicious pattern ${pattern}`);
    }
  }

  return resolved;
}

/**
 * Validate tool arguments to prevent injection attacks
 * @param {object} args - The tool arguments object
 * @param {object} schema - Schema defining expected argument types and constraints
 * @returns {object} The validated arguments
 * @throws {Error} If arguments don't match schema or contain suspicious content
 */
export function validateToolArgs(args, schema) {
  if (!args || typeof args !== 'object') {
    throw new Error('Invalid tool arguments: must be an object');
  }

  // Prevent prototype pollution
  if (Object.prototype.hasOwnProperty.call(args, '__proto__') ||
      Object.prototype.hasOwnProperty.call(args, 'constructor') ||
      Object.prototype.hasOwnProperty.call(args, 'prototype')) {
    throw new Error('Invalid tool arguments: contains forbidden properties');
  }

  const validated = {};

  // Validate against schema
  for (const [key, definition] of Object.entries(schema)) {
    const value = args[key];

    // Check required fields
    if (definition.required && (value === undefined || value === null)) {
      throw new Error(`Missing required argument: ${key}`);
    }

    // Skip if optional and not provided
    if (value === undefined || value === null) {
      continue;
    }

    // Type validation
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (definition.type && actualType !== definition.type) {
      throw new Error(`Invalid type for ${key}: expected ${definition.type}, got ${actualType}`);
    }

    // String validation
    if (definition.type === 'string') {
      if (definition.maxLength && value.length > definition.maxLength) {
        throw new Error(`Argument ${key} exceeds maximum length of ${definition.maxLength}`);
      }
      if (definition.pattern && !definition.pattern.test(value)) {
        throw new Error(`Argument ${key} does not match required pattern`);
      }
      // Check for command injection patterns
      if (definition.noShellChars && /[;&|`$(){}[\]<>]/.test(value)) {
        throw new Error(`Argument ${key} contains shell metacharacters`);
      }
    }

    // Number validation
    if (definition.type === 'number') {
      if (definition.min !== undefined && value < definition.min) {
        throw new Error(`Argument ${key} is below minimum value of ${definition.min}`);
      }
      if (definition.max !== undefined && value > definition.max) {
        throw new Error(`Argument ${key} exceeds maximum value of ${definition.max}`);
      }
    }

    // Array validation
    if (definition.type === 'array') {
      if (definition.maxItems && value.length > definition.maxItems) {
        throw new Error(`Argument ${key} exceeds maximum items of ${definition.maxItems}`);
      }
      if (definition.itemType) {
        for (let i = 0; i < value.length; i++) {
          const itemType = typeof value[i];
          if (itemType !== definition.itemType) {
            throw new Error(`Item ${i} in ${key} has invalid type: expected ${definition.itemType}, got ${itemType}`);
          }
        }
      }
    }

    validated[key] = value;
  }

  return validated;
}

/**
 * Validate SQL parameters to prevent SQL injection
 * @param {any} param - The parameter to validate
 * @param {string} type - Expected type ('string', 'number', 'boolean')
 * @returns {any} The validated parameter
 * @throws {Error} If parameter is invalid or contains SQL injection attempts
 */
export function validateSQLParam(param, type = 'string') {
  if (param === null || param === undefined) {
    return param;
  }

  switch (type) {
    case 'string':
      if (typeof param !== 'string') {
        throw new Error(`SQL parameter must be a string, got ${typeof param}`);
      }
      // Check for SQL injection patterns
      const sqlPatterns = [
        /(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/i,
        /(;|--|\/\*|\*\/)/,
        /('|").*(\1)/
      ];
      for (const pattern of sqlPatterns) {
        if (pattern.test(param)) {
          throw new Error('SQL parameter contains suspicious SQL keywords or patterns');
        }
      }
      return param;

    case 'number':
      const num = Number(param);
      if (isNaN(num) || !isFinite(num)) {
        throw new Error(`SQL parameter must be a valid number, got ${param}`);
      }
      return num;

    case 'boolean':
      if (typeof param !== 'boolean') {
        throw new Error(`SQL parameter must be a boolean, got ${typeof param}`);
      }
      return param;

    default:
      throw new Error(`Unsupported SQL parameter type: ${type}`);
  }
}

/**
 * Sanitize log messages to prevent sensitive data exposure
 * @param {string} message - The log message
 * @param {object} data - Additional data to log
 * @returns {object} Sanitized log data
 */
export function sanitizeLogData(message, data = {}) {
  const sensitiveKeys = [
    'password', 'token', 'secret', 'api_key', 'apiKey', 'apikey',
    'auth', 'authorization', 'credential', 'private_key', 'privateKey'
  ];

  const sanitized = { ...data };

  // Recursively sanitize object
  function sanitizeObject(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = Array.isArray(obj) ? [] : {};

    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();

      // Check if key contains sensitive keywords
      const isSensitive = sensitiveKeys.some(k => lowerKey.includes(k));

      if (isSensitive) {
        result[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  return {
    message,
    data: sanitizeObject(sanitized),
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate input length to prevent DoS attacks
 * @param {string} input - The input to validate
 * @param {number} maxLength - Maximum allowed length
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {string} The validated input
 * @throws {Error} If input exceeds maximum length
 */
export function validateInputLength(input, maxLength = 10000, fieldName = 'input') {
  if (typeof input !== 'string') {
    throw new Error(`${fieldName} must be a string`);
  }

  if (input.length > maxLength) {
    throw new Error(`${fieldName} exceeds maximum length of ${maxLength} characters`);
  }

  return input;
}

/**
 * Create a rate limiter for function calls
 * @param {number} maxCalls - Maximum calls allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Rate limiter wrapper
 */
export function createRateLimiter(maxCalls, windowMs) {
  const calls = [];

  return function rateLimitWrapper(fn) {
    return function(...args) {
      const now = Date.now();

      // Remove old calls outside the window
      while (calls.length > 0 && calls[0] < now - windowMs) {
        calls.shift();
      }

      // Check if limit exceeded
      if (calls.length >= maxCalls) {
        throw new Error(`Rate limit exceeded: max ${maxCalls} calls per ${windowMs}ms`);
      }

      calls.push(now);
      return fn.apply(this, args);
    };
  };
}

/**
 * Validate model identifier to prevent malicious model loading
 * @param {string} modelId - The model identifier
 * @returns {string} The validated model identifier
 * @throws {Error} If model identifier is invalid
 */
export function validateModelIdentifier(modelId) {
  if (!modelId || typeof modelId !== 'string') {
    throw new Error('Model identifier must be a non-empty string');
  }

  // Only allow alphanumeric, hyphens, underscores, dots
  if (!/^[a-zA-Z0-9._-]+$/.test(modelId)) {
    throw new Error('Model identifier contains invalid characters');
  }

  if (modelId.length > 100) {
    throw new Error('Model identifier exceeds maximum length of 100 characters');
  }

  return modelId;
}

export default {
  validateFilePath,
  validateToolArgs,
  validateSQLParam,
  sanitizeLogData,
  validateInputLength,
  createRateLimiter,
  validateModelIdentifier
};
