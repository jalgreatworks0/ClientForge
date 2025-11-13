/**
 * Snapshot Test Helper
 * Utilities for snapshot testing
 */

/**
 * Sanitize timestamp fields for snapshot testing
 */
export function sanitizeTimestamps<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  const timestampFields = [
    'createdAt',
    'updatedAt',
    'lastLoginAt',
    'timestamp',
    'date',
  ]

  timestampFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '[TIMESTAMP]' as any
    }
  })

  return sanitized
}

/**
 * Sanitize ID fields for snapshot testing
 */
export function sanitizeIds<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj }

  const idFields = ['id', 'userId', 'tenantId', 'accountId', 'dealId', 'contactId']

  idFields.forEach((field) => {
    if (field in sanitized) {
      sanitized[field] = '[ID]' as any
    }
  })

  return sanitized
}

/**
 * Sanitize object for snapshot (timestamps + IDs)
 */
export function sanitizeForSnapshot<T extends Record<string, any>>(obj: T): T {
  return sanitizeIds(sanitizeTimestamps(obj))
}

/**
 * Sanitize array of objects for snapshot
 */
export function sanitizeArrayForSnapshot<T extends Record<string, any>>(
  arr: T[]
): T[] {
  return arr.map((item) => sanitizeForSnapshot(item))
}

/**
 * Create snapshot matcher
 */
export function toMatchSnapshot<T>(received: T, sanitize = true): T {
  if (sanitize && typeof received === 'object' && received !== null) {
    if (Array.isArray(received)) {
      return sanitizeArrayForSnapshot(received) as T
    }
    return sanitizeForSnapshot(received as any) as T
  }
  return received
}
