/**
 * Redis Configuration
 * Cache, sessions, and real-time data
 */

import { createClient, RedisClientType } from 'redis'

const NODE_ENV = process.env.NODE_ENV ?? 'development'
const REDIS_URL = (process.env.REDIS_URL && process.env.REDIS_URL.trim())
  || (NODE_ENV === 'production' ? '' : 'redis://redis:6379')

export interface RedisConfig {
  url: string
  host: string
  port: number
  password?: string
  db: number
  ttl: number
  maxRetriesPerRequest: number
  enableReadyCheck: boolean
  enableOfflineQueue: boolean
}

export const redisConfig: RedisConfig = {
  url: REDIS_URL,
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0', 10),
  ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour default
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  enableOfflineQueue: true,
}

/**
 * Create and export Redis client
 */
let client: RedisClientType | null = null

export async function getRedisClient(): Promise<RedisClientType> {
  if (!REDIS_URL) {
    throw new Error('REDIS_URL missing; set env or provide service URL.')
  }

  if (!client) {
    client = createClient({
      url: redisConfig.url,
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('❌ Redis: Too many reconnection attempts')
            return new Error('Redis reconnection failed')
          }
          return Math.min(retries * 100, 3000) // Exponential backoff
        },
      },
      password: redisConfig.password,
      database: redisConfig.db,
    })

    client.on('error', (err) => {
      console.error('❌ Redis Client Error:', err)
    })

    client.on('connect', () => {
      console.log('✅ Redis connecting...')
    })

    client.on('ready', () => {
      console.log('✅ Redis ready')
    })

    client.on('reconnecting', () => {
      console.log('⚠️ Redis reconnecting...')
    })

    await client.connect()
  }

  return client
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (client) {
    await client.quit()
    client = null
    console.log('Redis connection closed')
  }
}

/**
 * Test Redis connection
 */
export async function testRedisConnection(): Promise<boolean> {
  try {
    const testClient = await getRedisClient()
    await testClient.ping()
    console.log('✅ Redis connection test successful')
    return true
  } catch (error) {
    console.error('❌ Redis connection test failed:', error)
    return false
  }
}

export default redisConfig
