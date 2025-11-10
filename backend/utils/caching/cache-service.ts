/**
 * Redis Caching Service
 * Provides caching layer for expensive queries and computations
 */

import { getRedisClient } from '../../../config/database/redis-config'
import { logger } from '../logging/logger'

export interface CacheOptions {
  /**
   * Time to live in seconds
   */
  ttl: number

  /**
   * Namespace for cache keys (e.g., 'contacts', 'deals')
   */
  namespace?: string

  /**
   * Whether to cache null/undefined results
   * Default: false
   */
  cacheNull?: boolean
}

/**
 * Generic caching wrapper for async functions
 *
 * @param key - Cache key (will be prefixed with namespace)
 * @param fn - Function to execute if cache miss
 * @param options - Cache configuration
 * @returns Cached or fresh result
 *
 * @example
 * const contacts = await cachedQuery(
 *   `tenant:${tenantId}:page:${page}`,
 *   () => contactRepo.findAll(tenantId, page),
 *   { ttl: 300, namespace: 'contacts' }
 * )
 */
export async function cachedQuery<T>(
  key: string,
  fn: () => Promise<T>,
  options: CacheOptions
): Promise<T> {
  const { ttl, namespace = 'cache', cacheNull = false } = options
  const fullKey = `${namespace}:${key}`

  try {
    const redis = await getRedisClient()

    // Try to get from cache
    const cached = await redis.get(fullKey)

    if (cached !== null) {
      logger.debug('Cache hit', { key: fullKey })
      const parsed = JSON.parse(cached)

      // Handle cached null values
      if (parsed === null && !cacheNull) {
        logger.debug('Cached null value, executing function', { key: fullKey })
        const result = await fn()
        await redis.setex(fullKey, ttl, JSON.stringify(result))
        return result
      }

      return parsed as T
    }

    // Cache miss - execute function
    logger.debug('Cache miss', { key: fullKey })
    const result = await fn()

    // Don't cache null/undefined unless explicitly allowed
    if ((result === null || result === undefined) && !cacheNull) {
      logger.debug('Skipping cache for null result', { key: fullKey })
      return result
    }

    // Store in cache
    await redis.setex(fullKey, ttl, JSON.stringify(result))
    logger.debug('Cached result', { key: fullKey, ttl })

    return result
  } catch (error) {
    // If Redis fails, fall back to direct execution
    logger.error('Cache operation failed, falling back to direct execution', {
      error,
      key: fullKey,
    })
    return fn()
  }
}

/**
 * Invalidate cache for a specific key
 *
 * @param key - Cache key to invalidate
 * @param namespace - Namespace (default: 'cache')
 *
 * @example
 * await invalidateCache(`tenant:${tenantId}:contacts`, 'contacts')
 */
export async function invalidateCache(
  key: string,
  namespace: string = 'cache'
): Promise<void> {
  const fullKey = `${namespace}:${key}`

  try {
    const redis = await getRedisClient()
    await redis.del(fullKey)
    logger.debug('Cache invalidated', { key: fullKey })
  } catch (error) {
    logger.error('Cache invalidation failed', { error, key: fullKey })
  }
}

/**
 * Invalidate all cache keys matching a pattern
 *
 * @param pattern - Pattern to match (e.g., 'tenant:123:*')
 * @param namespace - Namespace (default: 'cache')
 *
 * @example
 * // Invalidate all contacts for a tenant
 * await invalidateCachePattern('tenant:123:*', 'contacts')
 */
export async function invalidateCachePattern(
  pattern: string,
  namespace: string = 'cache'
): Promise<number> {
  const fullPattern = `${namespace}:${pattern}`

  try {
    const redis = await getRedisClient()
    const keys = await redis.keys(fullPattern)

    if (keys.length === 0) {
      logger.debug('No cache keys found for pattern', { pattern: fullPattern })
      return 0
    }

    await redis.del(...keys)
    logger.info('Cache invalidated by pattern', {
      pattern: fullPattern,
      keysDeleted: keys.length,
    })

    return keys.length
  } catch (error) {
    logger.error('Cache pattern invalidation failed', {
      error,
      pattern: fullPattern,
    })
    return 0
  }
}

/**
 * Set cache value directly
 *
 * @param key - Cache key
 * @param value - Value to cache
 * @param ttl - Time to live in seconds
 * @param namespace - Namespace (default: 'cache')
 */
export async function setCache<T>(
  key: string,
  value: T,
  ttl: number,
  namespace: string = 'cache'
): Promise<void> {
  const fullKey = `${namespace}:${key}`

  try {
    const redis = await getRedisClient()
    await redis.setex(fullKey, ttl, JSON.stringify(value))
    logger.debug('Cache set', { key: fullKey, ttl })
  } catch (error) {
    logger.error('Cache set failed', { error, key: fullKey })
  }
}

/**
 * Get cache value directly
 *
 * @param key - Cache key
 * @param namespace - Namespace (default: 'cache')
 * @returns Cached value or null
 */
export async function getCache<T>(
  key: string,
  namespace: string = 'cache'
): Promise<T | null> {
  const fullKey = `${namespace}:${key}`

  try {
    const redis = await getRedisClient()
    const cached = await redis.get(fullKey)

    if (cached === null) {
      return null
    }

    return JSON.parse(cached) as T
  } catch (error) {
    logger.error('Cache get failed', { error, key: fullKey })
    return null
  }
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  hits: number
  misses: number
  keys: number
  memory: string
}> {
  try {
    const redis = await getRedisClient()
    const info = await redis.info('stats')

    // Parse Redis INFO output
    const stats = info.split('\r\n').reduce((acc, line) => {
      const [key, value] = line.split(':')
      if (key && value) {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, string>)

    const keyCount = await redis.dbsize()

    return {
      hits: parseInt(stats.keyspace_hits || '0', 10),
      misses: parseInt(stats.keyspace_misses || '0', 10),
      keys: keyCount,
      memory: stats.used_memory_human || '0',
    }
  } catch (error) {
    logger.error('Failed to get cache stats', { error })
    return {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: '0',
    }
  }
}

/**
 * Predefined cache configurations
 */
export const CacheTTL = {
  /** 1 minute - for frequently changing data */
  SHORT: 60,

  /** 5 minutes - for standard queries */
  MEDIUM: 300,

  /** 15 minutes - for infrequently changing data */
  LONG: 900,

  /** 1 hour - for static/reference data */
  VERY_LONG: 3600,

  /** 1 day - for rarely changing data */
  DAY: 86400,
} as const

/**
 * Cache namespaces
 */
export const CacheNamespace = {
  CONTACTS: 'contacts',
  ACCOUNTS: 'accounts',
  DEALS: 'deals',
  ACTIVITIES: 'activities',
  USERS: 'users',
  ANALYTICS: 'analytics',
  SEARCH: 'search',
} as const
