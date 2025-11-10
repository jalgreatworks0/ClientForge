/**
 * Input Sanitization Utility
 * Prevents XSS, SQL injection, and other injection attacks
 */

import DOMPurify from 'isomorphic-dompurify'

import { logger } from '../logging/logger'

/**
 * Sanitize HTML content to prevent XSS attacks
 */
export function sanitizeHtml(dirty: string, options?: DOMPurify.Config): string {
  if (!dirty || typeof dirty !== 'string') {
    return ''
  }

  try {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: [
        'p',
        'br',
        'strong',
        'em',
        'u',
        'h1',
        'h2',
        'h3',
        'h4',
        'h5',
        'h6',
        'ul',
        'ol',
        'li',
        'a',
        'blockquote',
        'code',
        'pre',
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
      ALLOW_DATA_ATTR: false,
      ...options,
    })
  } catch (error) {
    logger.error('Failed to sanitize HTML', { error })
    return ''
  }
}

/**
 * Sanitize plain text (strip all HTML)
 */
export function sanitizePlainText(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  try {
    // Strip all HTML tags
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    })
  } catch (error) {
    logger.error('Failed to sanitize plain text', { error })
    return ''
  }
}

/**
 * Sanitize email address
 */
export function sanitizeEmail(email: string): string {
  if (!email || typeof email !== 'string') {
    return ''
  }

  // Convert to lowercase and trim
  let sanitized = email.toLowerCase().trim()

  // Remove any characters that are not alphanumeric, @, ., -, +, or _
  sanitized = sanitized.replace(/[^a-z0-9@.\-+_]/g, '')

  // Basic email format validation
  const emailRegex = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/
  if (!emailRegex.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  // Remove all non-digit and non-+ characters
  return phone.replace(/[^0-9+\-() ]/g, '').trim()
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string, allowedProtocols: string[] = ['http', 'https']): string {
  if (!url || typeof url !== 'string') {
    return ''
  }

  try {
    const trimmed = url.trim()

    // Parse URL
    const parsed = new URL(trimmed)

    // Check if protocol is allowed
    const protocol = parsed.protocol.replace(':', '')
    if (!allowedProtocols.includes(protocol)) {
      logger.warn('URL with disallowed protocol', { url: trimmed, protocol })
      return ''
    }

    // Prevent javascript: and data: URLs
    if (protocol === 'javascript' || protocol === 'data') {
      logger.warn('Blocked dangerous URL protocol', { url: trimmed, protocol })
      return ''
    }

    return parsed.toString()
  } catch (error) {
    logger.warn('Invalid URL provided', { url, error })
    return ''
  }
}

/**
 * Sanitize filename to prevent directory traversal attacks
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return ''
  }

  // Remove path separators and parent directory references
  let sanitized = filename.replace(/[\/\\]/g, '_')
  sanitized = sanitized.replace(/\.\./g, '_')

  // Remove any characters that could be problematic
  sanitized = sanitized.replace(/[^a-zA-Z0-9._-]/g, '_')

  // Limit filename length
  const maxLength = 255
  if (sanitized.length > maxLength) {
    const ext = sanitized.split('.').pop() || ''
    const name = sanitized.slice(0, maxLength - ext.length - 1)
    sanitized = `${name}.${ext}`
  }

  // Ensure filename is not empty
  if (!sanitized || sanitized === '.' || sanitized === '..') {
    return 'file'
  }

  return sanitized
}

/**
 * Sanitize SQL input (for use in LIKE queries)
 * Note: Always use parameterized queries - this is just for LIKE patterns
 */
export function sanitizeSqlLikePattern(pattern: string): string {
  if (!pattern || typeof pattern !== 'string') {
    return ''
  }

  // Escape special SQL LIKE characters
  return pattern
    .replace(/\\/g, '\\\\') // Escape backslash first
    .replace(/%/g, '\\%') // Escape percent
    .replace(/_/g, '\\_') // Escape underscore
}

/**
 * Sanitize object by recursively sanitizing all string values
 */
export function sanitizeObject(
  obj: any,
  sanitizer: (value: string) => string = sanitizePlainText
): any {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === 'string') {
    return sanitizer(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, sanitizer))
  }

  if (typeof obj === 'object') {
    const sanitized: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key], sanitizer)
      }
    }
    return sanitized
  }

  return obj
}

/**
 * Validate and sanitize integer
 */
export function sanitizeInteger(value: any, defaultValue: number = 0): number {
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Validate and sanitize float
 */
export function sanitizeFloat(value: any, defaultValue: number = 0): number {
  const parsed = parseFloat(value)
  return isNaN(parsed) ? defaultValue : parsed
}

/**
 * Validate and sanitize boolean
 */
export function sanitizeBoolean(value: any, defaultValue: boolean = false): boolean {
  if (typeof value === 'boolean') {
    return value
  }

  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1' || lower === 'yes') {
      return true
    }
    if (lower === 'false' || lower === '0' || lower === 'no') {
      return false
    }
  }

  if (typeof value === 'number') {
    return value !== 0
  }

  return defaultValue
}

/**
 * Sanitize array of strings
 */
export function sanitizeStringArray(
  arr: any,
  sanitizer: (value: string) => string = sanitizePlainText
): string[] {
  if (!Array.isArray(arr)) {
    return []
  }

  return arr.filter((item) => typeof item === 'string').map((item) => sanitizer(item))
}

/**
 * Remove null bytes from string (prevents C-style string injection)
 */
export function removeNullBytes(str: string): string {
  if (!str || typeof str !== 'string') {
    return ''
  }

  return str.replace(/\0/g, '')
}

/**
 * Sanitize JSON string
 */
export function sanitizeJson(jsonString: string): any {
  if (!jsonString || typeof jsonString !== 'string') {
    return null
  }

  try {
    return JSON.parse(jsonString)
  } catch (error) {
    logger.warn('Invalid JSON provided', { error })
    return null
  }
}

/**
 * Sanitize database identifier (table name, column name)
 * Only allows alphanumeric and underscore
 */
export function sanitizeIdentifier(identifier: string): string {
  if (!identifier || typeof identifier !== 'string') {
    return ''
  }

  // Only allow alphanumeric and underscore
  const sanitized = identifier.replace(/[^a-zA-Z0-9_]/g, '')

  // Must start with letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    return ''
  }

  return sanitized
}

/**
 * Comprehensive input sanitization for user-submitted data
 */
export function sanitizeUserInput(input: any, type: 'html' | 'text' | 'email' | 'url' = 'text'): any {
  if (!input) {
    return input
  }

  switch (type) {
    case 'html':
      return typeof input === 'string' ? sanitizeHtml(input) : input

    case 'text':
      return typeof input === 'string' ? sanitizePlainText(input) : input

    case 'email':
      return typeof input === 'string' ? sanitizeEmail(input) : input

    case 'url':
      return typeof input === 'string' ? sanitizeUrl(input) : input

    default:
      return input
  }
}
