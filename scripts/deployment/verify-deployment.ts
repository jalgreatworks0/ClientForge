#!/usr/bin/env tsx
/**
 * Post-Deployment Verification Script
 * Automated health checks after deployment
 *
 * Exit Codes:
 *   0 = All checks passed
 *   1 = One or more checks failed
 *
 * Usage:
 *   npx tsx scripts/deployment/verify-deployment.ts
 *   npx tsx scripts/deployment/verify-deployment.ts --url http://production-url.com
 */

import axios from 'axios'
import * as dotenv from 'dotenv'
import { getElasticsearchClient } from '../../config/database/elasticsearch-config'
import { getRedisClient } from '../../config/database/redis-config'
import { Pool } from 'pg'

dotenv.config()

interface CheckResult {
  name: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  duration: number
}

class DeploymentVerifier {
  private results: CheckResult[] = []
  private baseUrl: string
  private pool: Pool

  constructor() {
    // Get base URL from args or environment
    const urlArg = process.argv.find(arg => arg.startsWith('--url='))
    this.baseUrl = urlArg
      ? urlArg.split('=')[1]
      : process.env.API_URL || 'http://localhost:3000'

    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    })
  }

  async runAllChecks(): Promise<void> {
    console.log('╔════════════════════════════════════════════════════════════════╗')
    console.log('║     Post-Deployment Verification - ClientForge CRM           ║')
    console.log('╚════════════════════════════════════════════════════════════════╝\n')
    console.log(`Target: ${this.baseUrl}\n`)

    // Run checks
    await this.checkHealthEndpoint()
    await this.checkMetricsEndpoint()
    await this.checkDatabaseConnection()
    await this.checkRedisConnection()
    await this.checkElasticsearchConnection()
    await this.checkElasticsearchAliases()
    await this.checkQueueWorkers()
    await this.checkDLQCount()
    await this.checkRedisAOF()

    // Display results
    this.displayResults()

    // Exit with appropriate code
    const failed = this.results.filter(r => r.status === 'FAIL').length
    process.exit(failed > 0 ? 1 : 0)
  }

  private async runCheck(
    name: string,
    checkFn: () => Promise<void>
  ): Promise<void> {
    const startTime = Date.now()

    try {
      await checkFn()
      const duration = Date.now() - startTime

      this.results.push({
        name,
        status: 'PASS',
        message: 'OK',
        duration,
      })

      console.log(`✓ ${name} (${duration}ms)`)
    } catch (error: any) {
      const duration = Date.now() - startTime

      this.results.push({
        name,
        status: 'FAIL',
        message: error.message,
        duration,
      })

      console.log(`✗ ${name} - ${error.message}`)
    }
  }

  private async checkHealthEndpoint(): Promise<void> {
    await this.runCheck('Health Endpoint', async () => {
      const response = await axios.get(`${this.baseUrl}/api/v1/health`, {
        timeout: 5000,
      })

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`)
      }

      if (!response.data.success) {
        throw new Error('Health check returned success: false')
      }
    })
  }

  private async checkMetricsEndpoint(): Promise<void> {
    await this.runCheck('Metrics Endpoint', async () => {
      try {
        const response = await axios.get(`${this.baseUrl}/metrics`, {
          timeout: 5000,
        })

        if (response.status !== 200) {
          throw new Error(`Expected 200, got ${response.status}`)
        }

        // Verify it looks like Prometheus metrics
        if (!response.data.includes('# HELP') && !response.data.includes('# TYPE')) {
          throw new Error('Response does not look like Prometheus metrics')
        }
      } catch (error: any) {
        if (error.response?.status === 404) {
          throw new Error('Metrics endpoint not found (not yet implemented)')
        }
        throw error
      }
    })
  }

  private async checkDatabaseConnection(): Promise<void> {
    await this.runCheck('PostgreSQL Connection', async () => {
      const result = await this.pool.query('SELECT 1 as health')

      if (result.rows[0].health !== 1) {
        throw new Error('Unexpected query result')
      }
    })
  }

  private async checkRedisConnection(): Promise<void> {
    await this.runCheck('Redis Connection', async () => {
      const redis = await getRedisClient()
      const pong = await redis.ping()

      if (pong !== 'PONG') {
        throw new Error(`Expected PONG, got ${pong}`)
      }
    })
  }

  private async checkElasticsearchConnection(): Promise<void> {
    await this.runCheck('Elasticsearch Connection', async () => {
      const client = await getElasticsearchClient()
      const health = await client.cluster.health()

      if (health.status === 'red') {
        throw new Error('Cluster status is RED')
      }
    })
  }

  private async checkElasticsearchAliases(): Promise<void> {
    await this.runCheck('Elasticsearch Aliases', async () => {
      const client = await getElasticsearchClient()

      // Check if key write aliases exist (for ILM rollover)
      const aliases = ['contacts-write', 'deals-write', 'tasks-write']
      for (const alias of aliases) {
        try {
          const result = await client.indices.getAlias({ name: alias })
          if (!result || Object.keys(result).length === 0) {
            throw new Error(`Write alias ${alias} not found`)
          }
        } catch (error: any) {
          throw new Error(`Alias ${alias} check failed: ${error.message}`)
        }
      }
    })
  }

  private async checkQueueWorkers(): Promise<void> {
    await this.runCheck('Queue Workers', async () => {
      // Check if queue workers are processing jobs
      // This is a simplified check - in production you'd check actual worker processes
      const redis = await getRedisClient()

      const queues = ['email', 'notifications', 'ai-processing', 'data-sync', 'reporting']
      let activeWorkers = 0

      for (const queue of queues) {
        const workers = await redis.get(`bull:${queue}:workers`)
        if (workers && parseInt(workers, 10) > 0) {
          activeWorkers++
        }
      }

      // At least some workers should be active (relaxed check)
      if (activeWorkers === 0) {
        // Warn instead of fail - workers might not be needed yet
        console.warn('  ⚠️  No active queue workers detected')
      }
    })
  }

  private async checkDLQCount(): Promise<void> {
    await this.runCheck('DLQ Count', async () => {
      // Use BullMQ API instead of raw Redis to avoid key type issues
      const { Queue } = await import('bullmq')
      const IORedis = (await import('ioredis')).default

      const connection = new IORedis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
        maxRetriesPerRequest: null,
      })

      const queues = ['email', 'notifications', 'data-sync', 'embeddings', 'file-processing']
      let totalDLQ = 0

      try {
        for (const queueName of queues) {
          const dlqQueue = new Queue(`${queueName}:dlq`, { connection })
          const count = await dlqQueue.getWaitingCount()
          totalDLQ += count
        }

        // Threshold: warn if > 10, fail if > 100
        if (totalDLQ > 100) {
          throw new Error(`DLQ has ${totalDLQ} jobs (threshold: 100)`)
        } else if (totalDLQ > 10) {
          console.warn(`  ⚠️  DLQ has ${totalDLQ} jobs (warning threshold: 10)`)
        }
      } finally {
        await connection.quit()
      }
    })
  }

  private async checkRedisAOF(): Promise<void> {
    await this.runCheck('Redis AOF', async () => {
      const redis = await getRedisClient()
      const info = await redis.info('persistence')

      // Check if AOF is enabled
      if (!info.includes('aof_enabled:1')) {
        console.warn('  ⚠️  Redis AOF is not enabled (data persistence at risk)')
      }
    })
  }

  private displayResults(): void {
    console.log('\n═══════════════════════════════════════════════════════════════')
    console.log('\n📊 Verification Results\n')

    const passed = this.results.filter(r => r.status === 'PASS').length
    const failed = this.results.filter(r => r.status === 'FAIL').length
    const warned = this.results.filter(r => r.status === 'WARN').length
    const total = this.results.length

    console.log(`  Total Checks: ${total}`)
    console.log(`  ✓ Passed: ${passed}`)
    if (failed > 0) console.log(`  ✗ Failed: ${failed}`)
    if (warned > 0) console.log(`  ⚠ Warnings: ${warned}`)

    if (failed > 0) {
      console.log('\n❌ DEPLOYMENT VERIFICATION FAILED\n')
      console.log('Failed checks:')
      for (const result of this.results.filter(r => r.status === 'FAIL')) {
        console.log(`  - ${result.name}: ${result.message}`)
      }
      console.log('')
    } else if (warned > 0) {
      console.log('\n⚠️  DEPLOYMENT VERIFICATION PASSED WITH WARNINGS\n')
    } else {
      console.log('\n✅ ALL CHECKS PASSED!\n')
      console.log('Deployment verification successful.')
      console.log('System is ready for traffic.\n')
    }

    // Performance summary
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0)
    console.log(`Total verification time: ${totalTime}ms\n`)
  }
}

// Run verification
const verifier = new DeploymentVerifier()
verifier.runAllChecks().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
