#!/usr/bin/env tsx
/**
 * Cache Performance Test
 * Tests cache hit ratio and performance improvements
 *
 * Usage:
 *   npx tsx scripts/cache/test-cache-performance.ts
 */

import axios from 'axios'
import * as dotenv from 'dotenv'

dotenv.config()

const API_URL = process.env.API_URL || 'http://localhost:3001'
const API_PREFIX = '/api/v1'

interface TestResult {
  name: string
  coldRequestTime: number
  hotRequestTime: number
  improvement: number
  improvementPercent: number
}

async function testCachePerformance(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════════╗')
  console.log('║     Cache Performance Test - ClientForge CRM                  ║')
  console.log('╚════════════════════════════════════════════════════════════════╝\n')

  try {
    // Authenticate
    console.log('1. Authenticating...')
    const loginResponse = await axios.post(`${API_URL}${API_PREFIX}/auth/login`, {
      email: process.env.TEST_USER_EMAIL || 'admin@clientforge.com',
      password: process.env.TEST_USER_PASSWORD || 'Admin@123'
    })

    const authToken = loginResponse.data.data.access_token
    console.log('✓ Authenticated\n')

    const headers = { 'Authorization': `Bearer ${authToken}` }

    // Define endpoints to test
    const endpoints = [
      {
        name: 'Dashboard Metrics',
        path: '/analytics/dashboard',
      },
      {
        name: 'Deal Analytics',
        path: '/analytics/deals',
      },
      {
        name: 'Contact Analytics',
        path: '/analytics/contacts',
      },
    ]

    const results: TestResult[] = []

    for (const endpoint of endpoints) {
      console.log(`\n2. Testing ${endpoint.name}`)
      console.log('─'.repeat(64))

      // Cold request (cache miss)
      console.log(`  → Cold request (cache miss)...`)
      const coldStart = Date.now()
      await axios.get(`${API_URL}${API_PREFIX}${endpoint.path}`, { headers })
      const coldTime = Date.now() - coldStart
      console.log(`    Time: ${coldTime}ms`)

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 100))

      // Hot request (cache hit)
      console.log(`  → Hot request (cache hit)...`)
      const hotStart = Date.now()
      await axios.get(`${API_URL}${API_PREFIX}${endpoint.path}`, { headers })
      const hotTime = Date.now() - hotStart
      console.log(`    Time: ${hotTime}ms`)

      const improvement = coldTime - hotTime
      const improvementPercent = ((improvement / coldTime) * 100).toFixed(1)

      results.push({
        name: endpoint.name,
        coldRequestTime: coldTime,
        hotRequestTime: hotTime,
        improvement,
        improvementPercent: parseFloat(improvementPercent),
      })

      console.log(`  ✓ Improvement: ${improvement}ms (${improvementPercent}%)`)
    }

    // Get cache statistics
    console.log('\n3. Cache Statistics')
    console.log('─'.repeat(64))

    try {
      const statsResponse = await axios.get(`${API_URL}${API_PREFIX}/cache/stats`, { headers })
      const stats = statsResponse.data.data

      const totalRequests = stats.hits + stats.misses
      const hitRatio = totalRequests > 0
        ? ((stats.hits / totalRequests) * 100).toFixed(1)
        : '0.0'

      console.log(`  Cache Hits: ${stats.hits}`)
      console.log(`  Cache Misses: ${stats.misses}`)
      console.log(`  Hit Ratio: ${hitRatio}%`)
      console.log(`  Total Keys: ${stats.keys}`)
      console.log(`  Memory Used: ${stats.memory}`)
    } catch (error) {
      console.log(`  Cache stats endpoint not available (implement in analytics controller)`)
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('\n📊 Performance Summary\n')

    console.log('  Endpoint                    Cold      Hot     Improvement')
    console.log('  ────────────────────────────────────────────────────────────')

    for (const result of results) {
      const name = result.name.padEnd(27)
      const cold = `${result.coldRequestTime}ms`.padStart(6)
      const hot = `${result.hotRequestTime}ms`.padStart(6)
      const improvement = `${result.improvement}ms (${result.improvementPercent}%)`.padStart(18)
      console.log(`  ${name} ${cold}  ${hot}  ${improvement}`)
    }

    const avgImprovement = results.reduce((sum, r) => sum + r.improvementPercent, 0) / results.length
    console.log('')
    console.log(`  Average Improvement: ${avgImprovement.toFixed(1)}%`)
    console.log('')

    if (avgImprovement >= 80) {
      console.log('✅ Excellent cache performance! (>80% improvement)')
    } else if (avgImprovement >= 60) {
      console.log('✓ Good cache performance (60-80% improvement)')
    } else if (avgImprovement >= 40) {
      console.log('○ Moderate cache performance (40-60% improvement)')
    } else {
      console.log('⚠️  Low cache performance (<40% improvement)')
      console.log('   Consider:')
      console.log('   - Increasing cache TTL for stable data')
      console.log('   - Checking Redis configuration')
      console.log('   - Ensuring queries are actually cached')
    }

    console.log('\n📝 Next Steps:')
    console.log('   1. Monitor cache hit ratio in production')
    console.log('   2. Adjust TTL values based on data freshness requirements')
    console.log('   3. Implement cache invalidation on data updates')
    console.log('   4. Consider warming cache on application startup\n')

  } catch (error: any) {
    console.error('\n✗ Test failed:', error.message)
    if (error.response) {
      console.error('  Response:', error.response.status, error.response.statusText)
    }
    process.exit(1)
  }
}

// Run
testCachePerformance().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
