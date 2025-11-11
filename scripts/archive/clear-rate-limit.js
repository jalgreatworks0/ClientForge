/**
 * Clear Rate Limit from Redis
 * Run this to clear authentication rate limits
 */

require('dotenv').config()
const Redis = require('ioredis')

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379')

async function clearRateLimit() {
  try {
    console.log('🔄 Connecting to Redis...')

    // Get all rate limit keys
    const keys = await redis.keys('rate_limit:*')

    if (keys.length === 0) {
      console.log('✅ No rate limit keys found')
    } else {
      console.log(`🗑️  Deleting ${keys.length} rate limit keys...`)
      await redis.del(...keys)
      console.log('✅ Rate limits cleared successfully!')
    }

    await redis.quit()
    process.exit(0)
  } catch (error) {
    console.error('❌ Error:', error.message)
    process.exit(1)
  }
}

clearRateLimit()
