#!/usr/bin/env node
/**
 * Service Verification Script
 * Verifies all new services are properly configured and operational
 */

import { createClient } from 'redis'
import { io } from 'socket.io-client'
import axios from 'axios'

interface VerificationResult {
  service: string
  status: 'PASS' | 'FAIL' | 'WARN'
  message: string
  details?: any
}

class ServiceVerifier {
  private results: VerificationResult[] = []
  private apiUrl = process.env.API_URL || 'http://localhost:3000'
  private wsUrl = process.env.WS_URL || 'http://localhost:3000'

  /**
   * Run all verification checks
   */
  async verify(): Promise<void> {
    console.log('= ClientForge CRM - Service Verification\n')
    console.log('=' .repeat(60))

    await this.verifyRedis()
    await this.verifyWebSocket()
    await this.verifyQueueService()
    await this.verifyElasticsearchSync()
    await this.verifyApiEndpoints()

    this.printResults()
  }

  /**
   * Verify Redis connection
   */
  private async verifyRedis(): Promise<void> {
    const testName = 'Redis Connection'
    console.log(`\n[1/5] Testing ${testName}...`)

    try {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          connectTimeout: 5000,
        },
      })

      await client.connect()

      // Test set/get
      await client.set('verify:test', 'ok')
      const value = await client.get('verify:test')
      await client.del('verify:test')
      await client.disconnect()

      if (value === 'ok') {
        this.addResult({
          service: testName,
          status: 'PASS',
          message: 'Redis is operational and responding correctly',
        })
      } else {
        this.addResult({
          service: testName,
          status: 'FAIL',
          message: 'Redis returned unexpected value',
          details: { expected: 'ok', received: value },
        })
      }
    } catch (error: any) {
      this.addResult({
        service: testName,
        status: 'FAIL',
        message: 'Failed to connect to Redis',
        details: error.message,
      })
    }
  }

  /**
   * Verify WebSocket service
   */
  private async verifyWebSocket(): Promise<void> {
    const testName = 'WebSocket Service'
    console.log(`\n[2/5] Testing ${testName}...`)

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.addResult({
          service: testName,
          status: 'FAIL',
          message: 'WebSocket connection timeout',
        })
        socket.close()
        resolve()
      }, 10000)

      // Note: This requires a valid JWT token for authentication
      // In production, you'd generate a test token or use a test endpoint
      const socket = io(this.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false,
        auth: {
          token: process.env.TEST_JWT_TOKEN || '',
        },
      })

      socket.on('connect', () => {
        clearTimeout(timeout)
        this.addResult({
          service: testName,
          status: 'PASS',
          message: 'WebSocket service is operational',
          details: { socketId: socket.id },
        })
        socket.close()
        resolve()
      })

      socket.on('connect_error', (error: Error) => {
        clearTimeout(timeout)
        // If no auth token, it's expected to fail authentication but the service is running
        if (error.message.includes('Authentication error')) {
          this.addResult({
            service: testName,
            status: 'WARN',
            message: 'WebSocket server is running but requires authentication',
            details: 'Set TEST_JWT_TOKEN env var for full verification',
          })
        } else {
          this.addResult({
            service: testName,
            status: 'FAIL',
            message: 'WebSocket connection failed',
            details: error.message,
          })
        }
        socket.close()
        resolve()
      })

      socket.on('error', (error: any) => {
        clearTimeout(timeout)
        this.addResult({
          service: testName,
          status: 'FAIL',
          message: 'WebSocket error occurred',
          details: error,
        })
        socket.close()
        resolve()
      })
    })
  }

  /**
   * Verify Job Queue service
   */
  private async verifyQueueService(): Promise<void> {
    const testName = 'Job Queue Service'
    console.log(`\n[3/5] Testing ${testName}...`)

    // The queue service runs in-process, so we'll verify Redis connection
    // which is required for Bull queues
    try {
      const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
      })

      await client.connect()

      // Check for Bull keys
      const keys = await client.keys('bull:*')
      await client.disconnect()

      this.addResult({
        service: testName,
        status: 'PASS',
        message: 'Queue service prerequisites are met',
        details: {
          redisConnected: true,
          existingQueues: keys.length > 0 ? keys.length : 'none (will be created on first use)',
        },
      })
    } catch (error: any) {
      this.addResult({
        service: testName,
        status: 'FAIL',
        message: 'Queue service cannot connect to Redis',
        details: error.message,
      })
    }
  }

  /**
   * Verify Elasticsearch sync service
   */
  private async verifyElasticsearchSync(): Promise<void> {
    const testName = 'Elasticsearch Sync Service'
    console.log(`\n[4/5] Testing ${testName}...`)

    try {
      const elasticsearchUrl = process.env.ELASTICSEARCH_URL || 'http://localhost:9200'

      const response = await axios.get(`${elasticsearchUrl}/_cluster/health`, {
        timeout: 5000,
      })

      if (response.data.status === 'green' || response.data.status === 'yellow') {
        this.addResult({
          service: testName,
          status: 'PASS',
          message: 'Elasticsearch is operational',
          details: {
            status: response.data.status,
            nodes: response.data.number_of_nodes,
          },
        })
      } else {
        this.addResult({
          service: testName,
          status: 'WARN',
          message: 'Elasticsearch cluster is unhealthy',
          details: { status: response.data.status },
        })
      }
    } catch (error: any) {
      this.addResult({
        service: testName,
        status: 'WARN',
        message: 'Elasticsearch is not accessible (optional service)',
        details: error.message,
      })
    }
  }

  /**
   * Verify API endpoints
   */
  private async verifyApiEndpoints(): Promise<void> {
    const testName = 'API Endpoints'
    console.log(`\n[5/5] Testing ${testName}...`)

    try {
      // Test health endpoint
      const healthResponse = await axios.get(`${this.apiUrl}/health`, {
        timeout: 5000,
      })

      if (healthResponse.status === 200) {
        this.addResult({
          service: testName,
          status: 'PASS',
          message: 'API server is responding correctly',
          details: {
            statusCode: healthResponse.status,
            data: healthResponse.data,
          },
        })
      } else {
        this.addResult({
          service: testName,
          status: 'FAIL',
          message: 'API returned unexpected status',
          details: { statusCode: healthResponse.status },
        })
      }
    } catch (error: any) {
      this.addResult({
        service: testName,
        status: 'FAIL',
        message: 'Failed to connect to API server',
        details: error.message,
      })
    }
  }

  /**
   * Add verification result
   */
  private addResult(result: VerificationResult): void {
    this.results.push(result)

    const icon = result.status === 'PASS' ? '' : result.status === 'WARN' ? ' ' : 'L'
    console.log(`   ${icon} ${result.status}: ${result.message}`)

    if (result.details) {
      console.log(`      Details:`, result.details)
    }
  }

  /**
   * Print summary results
   */
  private printResults(): void {
    console.log('\n' + '='.repeat(60))
    console.log('\n=Ê VERIFICATION SUMMARY\n')

    const passed = this.results.filter((r) => r.status === 'PASS').length
    const warnings = this.results.filter((r) => r.status === 'WARN').length
    const failed = this.results.filter((r) => r.status === 'FAIL').length
    const total = this.results.length

    console.log(`Total Tests:  ${total}`)
    console.log(` Passed:    ${passed}`)
    console.log(`   Warnings:  ${warnings}`)
    console.log(`L Failed:    ${failed}`)

    console.log('\n' + '='.repeat(60))

    if (failed === 0 && warnings === 0) {
      console.log('\n<‰ All services verified successfully!')
      process.exit(0)
    } else if (failed === 0) {
      console.log('\n All critical services operational (some warnings)')
      process.exit(0)
    } else {
      console.log('\nL Some services failed verification')
      process.exit(1)
    }
  }
}

// Run verification
const verifier = new ServiceVerifier()
verifier.verify().catch((error) => {
  console.error('Verification script failed:', error)
  process.exit(1)
})
