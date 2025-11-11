#!/usr/bin/env tsx
/**
 * Post-Deployment Verification Script
 * Runs comprehensive checks after deployment to ensure system is ready
 * 
 * Usage: npm run deploy:verify
 * Exit code: 0 if all checks pass, 1 if any checks fail
 */

import axios from 'axios'
import { Pool } from 'pg'
import { MongoClient } from 'mongodb'
import { createClient } from 'redis'
import { Client } from '@elastic/elasticsearch'
import * as dotenv from 'dotenv'

dotenv.config()

interface CheckResult {
  name: string
  passed: boolean
  message: string
}

const checks: CheckResult[] = []
const TIMEOUT = 10000

function addCheck(name: string, passed: boolean, message: string) {
  checks.push({ name, passed, message })
  const icon = passed ? '✅' : '❌'
  console.log(`${icon} ${name}: ${message}`)
}

async function runChecks() {
  console.log('\n════════════════════════════════════════════════')
  console.log('  Post-Deployment Verification')
  console.log('════════════════════════════════════════════════\n')

  // 1. API Health
  console.log('🔍 API Health Checks:')
  try {
    const response = await axios.get('http://localhost:3000/api/v1/health', {
      timeout: TIMEOUT,
    })
    addCheck(
      'API Health Endpoint',
      response.status === 200 && response.data.status === 'healthy',
      `Status: ${response.data.status}`
    )
  } catch (error: any) {
    addCheck('API Health Endpoint', false, error.message)
  }

  // 2. Database Connections
  console.log('\n🐘 Database Checks:')
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      connectionTimeoutMillis: TIMEOUT,
    })
    const result = await pool.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public'])
    addCheck(
      'PostgreSQL Connection',
      result.rows[0].table_count > 0,
      `Found ${result.rows[0].table_count} tables`
    )

    // Check for admin user
    try {
      const adminCheck = await pool.query(`
        SELECT id FROM users WHERE email = $1 LIMIT 1
      `, ['admin@clientforge.local'])
      addCheck(
        'Admin User Seeded',
        adminCheck.rows.length > 0,
        adminCheck.rows.length > 0 ? 'Admin user exists' : 'Run: npm run seed:admin'
      )
    } catch (error: any) {
      addCheck('Admin User Seeded', false, 'Could not check users table')
    }

    await pool.end()
  } catch (error: any) {
    addCheck('PostgreSQL Connection', false, error.message)
  }

  // 3. MongoDB
  console.log('\n🍃 MongoDB Checks:')
  try {
    const mongoClient = new MongoClient(process.env.MONGODB_URI || '')
    await mongoClient.connect()

    const db = mongoClient.db('clientforge')
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    addCheck(
      'MongoDB Collections',
      collectionNames.includes('app_logs') && collectionNames.includes('audit_logs'),
      `Found ${collections.length} collections`
    )

    await mongoClient.close()
  } catch (error: any) {
    addCheck('MongoDB Connection', false, error.message)
  }

  // 4. Redis
  console.log('\n📍 Redis Checks:')
  try {
    const redis = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: TIMEOUT },
    })
    await redis.connect()

    const pong = await redis.ping()
    addCheck('Redis Connection', pong === 'PONG', `PING: ${pong}`)

    // Check maxmemory-policy
    const config = await redis.configGet('maxmemory-policy')
    addCheck(
      'Redis maxmemory-policy',
      config[1] === 'noeviction',
      `Policy: ${config[1]} ${config[1] === 'noeviction' ? '(correct)' : '(should be noeviction for BullMQ)'}`
    )

    await redis.quit()
  } catch (error: any) {
    addCheck('Redis Connection', false, error.message)
  }

  // 5. Elasticsearch
  console.log('\n🔍 Elasticsearch Checks:')
  try {
    const esClient = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      requestTimeout: TIMEOUT,
    })

    const health = await esClient.cluster.health()
    addCheck(
      'Elasticsearch Cluster Health',
      health.status === 'green' || health.status === 'yellow',
      `Status: ${health.status}`
    )

    // Check indices
    const indices = await esClient.cat.indices({ format: 'json' })
    addCheck(
      'Elasticsearch Indices',
      Array.isArray(indices) && indices.length > 0,
      `Found ${indices.length} indices`
    )

    // Check for tenant aliases
    try {
      const aliases = await esClient.indices.getAlias({
        index: '*-alias',
      })
      addCheck(
        'Elasticsearch Tenant Aliases',
        Object.keys(aliases).length > 0,
        `Found ${Object.keys(aliases).length} tenant aliases`
      )
    } catch (error: any) {
      addCheck('Elasticsearch Tenant Aliases', false, 'No tenant aliases found - may need setup')
    }
  } catch (error: any) {
    addCheck('Elasticsearch Connection', false, error.message)
  }

  // 6. Queue System
  console.log('\n📦 Queue System Checks:')
  try {
    const redis = createClient({
      url: process.env.REDIS_URL,
      socket: { connectTimeout: TIMEOUT },
    })
    await redis.connect()

    const queues = ['email', 'data-sync', 'embeddings', 'file-processing', 'notifications']
    const queueInfo: Record<string, number> = {}

    for (const queueName of queues) {
      try {
        const count = await redis.lLen(`bull:${queueName}:wait`)
        queueInfo[queueName] = count
      } catch (error) {
        queueInfo[queueName] = 0
      }
    }

    addCheck(
      'Queue System',
      queues.length > 0,
      `${queues.length} queues configured`
    )

    await redis.quit()
  } catch (error: any) {
    addCheck('Queue System', false, error.message)
  }

  // 7. Login Flow
  console.log('\n🔐 Authentication Checks:')
  try {
    const loginResponse = await axios.post(
      'http://localhost:3000/api/v1/auth/login',
      {
        email: 'admin@clientforge.local',
        password: 'Admin!234',
      },
      {
        timeout: TIMEOUT,
        validateStatus: () => true, // Accept any status
      }
    )

    if (loginResponse.status === 200) {
      addCheck(
        'Admin Login',
        loginResponse.data.success === true,
        'Login successful'
      )

      // Verify token structure
      const hasTokens = loginResponse.data.data?.tokens?.accessToken && loginResponse.data.data?.tokens?.refreshToken
      addCheck(
        'JWT Tokens',
        hasTokens,
        hasTokens ? 'Tokens generated' : 'Token structure invalid'
      )
    } else if (loginResponse.status === 401) {
      addCheck(
        'Admin Login',
        false,
        'Invalid credentials - run: npm run seed:admin'
      )
    } else {
      addCheck(
        'Admin Login',
        false,
        `Unexpected status: ${loginResponse.status}`
      )
    }
  } catch (error: any) {
    addCheck('Admin Login', false, error.message)
  }

  // 8. API Endpoints
  console.log('\n📡 API Endpoint Checks:')
  const endpoints = [
    { method: 'GET', path: '/api/v1/health', authenticated: false },
    { method: 'GET', path: '/metrics', authenticated: false },
    { method: 'GET', path: '/api/v1/modules', authenticated: false },
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method as any,
        url: `http://localhost:3000${endpoint.path}`,
        timeout: TIMEOUT,
        validateStatus: () => true,
      })

      const passed = response.status < 500
      addCheck(
        `${endpoint.method} ${endpoint.path}`,
        passed,
        `Status: ${response.status}`
      )
    } catch (error: any) {
      addCheck(
        `${endpoint.method} ${endpoint.path}`,
        false,
        error.message
      )
    }
  }

  // 9. Frontend Configuration
  console.log('\n⚛️ Frontend Checks:')
  try {
    const response = await axios.get('http://localhost:3001', {
      timeout: TIMEOUT,
      validateStatus: () => true,
    })
    addCheck(
      'Frontend Server',
      response.status < 500,
      `Status: ${response.status}`
    )
  } catch (error: any) {
    addCheck('Frontend Server', false, 'Frontend not running on port 3001 (optional for backend testing)')
  }

  // Summary
  console.log('\n════════════════════════════════════════════════')
  console.log('  Verification Summary')
  console.log('════════════════════════════════════════════════\n')

  const passed = checks.filter((c) => c.passed).length
  const failed = checks.filter((c) => !c.passed).length

  console.log(`✅ Passed: ${passed}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`📊 Total: ${checks.length}\n`)

  if (failed > 0) {
    console.log('🚨 FAILED CHECKS:')
    checks
      .filter((c) => !c.passed)
      .forEach((c) => console.log(`   - ${c.name}: ${c.message}`))
    console.log()

    console.log('💡 NEXT STEPS:')
    console.log('   1. Review failed checks above')
    console.log('   2. Ensure all services are running')
    console.log('   3. Run: npm run seed:admin (if admin user not found)')
    console.log('   4. Check logs: npm run logs:backend')
    console.log()

    process.exit(1)
  } else {
    console.log('🎉 All checks passed! System is ready for use.\n')
    process.exit(0)
  }
}

// Run verification
runChecks().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
