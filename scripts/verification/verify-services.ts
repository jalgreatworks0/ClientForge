#!/usr/bin/env tsx
/**
 * ClientForge CRM - Phase 0 Health Check Script
 * Comprehensive verification of all core services and configurations
 *
 * Usage: npm run verify:services
 */

import * as fs from 'fs'
import * as path from 'path'
import axios from 'axios'
import { Pool } from 'pg'
import { MongoClient } from 'mongodb'
import { createClient } from 'redis'
import { Client } from '@elastic/elasticsearch'
import * as dotenv from 'dotenv'

dotenv.config()

interface HealthStatus {
  service: string
  status: 'healthy' | 'warning' | 'error'
  details: string
  timestamp: string
}

const results: HealthStatus[] = []

function logStatus(service: string, status: 'healthy' | 'warning' | 'error', details: string) {
  const result: HealthStatus = {
    service,
    status,
    details,
    timestamp: new Date().toISOString(),
  }
  results.push(result)
  const icon = status === 'healthy' ? '✅' : status === 'warning' ? '⚠️' : '❌'
  console.log(`${icon} ${service}: ${details}`)
}

async function runHealthChecks() {
  console.log('\n════════════════════════════════════════════════')
  console.log('  ClientForge CRM - System Health Check')
  console.log('════════════════════════════════════════════════\n')

  // 1. Environment Check
  console.log('📋 Environment Configuration:')
  const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'MONGODB_URI',
    'REDIS_URL',
    'ELASTICSEARCH_URL',
    'JWT_SECRET',
  ]
  let envStatus = 'healthy'
  const missingVars: string[] = []
  requiredEnvVars.forEach((varName) => {
    if (!process.env[varName]) {
      missingVars.push(varName)
      envStatus = 'error'
    }
  })

  if (envStatus === 'healthy') {
    logStatus('Environment', 'healthy', 'All required environment variables present')
  } else {
    logStatus(
      'Environment',
      'error',
      `Missing: ${missingVars.join(', ')}`
    )
  }

  // 2. File Structure Check
  console.log('\n📁 File Structure:')
  const requiredPaths = [
    'backend/index.ts',
    'backend/api/server.ts',
    'backend/modules/core/module.ts',
    'frontend/vite.config.ts',
    'frontend/src/lib/api.ts',
    'scripts/seed/seed-admin.ts',
    'package.json',
  ]
  let fileStatus = 'healthy'
  const missingPaths: string[] = []
  requiredPaths.forEach((filePath) => {
    if (!fs.existsSync(path.join(process.cwd(), filePath))) {
      missingPaths.push(filePath)
      fileStatus = 'error'
    }
  })

  if (fileStatus === 'healthy') {
    logStatus('File Structure', 'healthy', 'All critical files present')
  } else {
    logStatus('File Structure', 'error', `Missing: ${missingPaths.join(', ')}`)
  }

  // 3. Package Dependencies Check
  console.log('\n📦 Dependencies:')
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
    const deps = packageJson.dependencies || {}

    const criticalDeps = {
      bullmq: 'BullMQ queue system',
      express: 'Web framework',
      typescript: 'Type safety',
      postgres: 'Database driver (pg)',
      mongodb: 'MongoDB driver',
      ioredis: 'Redis client',
    }

    let depsOk = true
    for (const [depName, description] of Object.entries(criticalDeps)) {
      const actualName = depName === 'postgres' ? 'pg' : depName
      if (deps[actualName]) {
        logStatus(`Dep: ${description}`, 'healthy', `${actualName}@${deps[actualName]}`)
      } else {
        logStatus(`Dep: ${description}`, 'error', `${actualName} not found`)
        depsOk = false
      }
    }

    // Check for conflicts
    if (deps['bull'] && deps['bullmq']) {
      logStatus('Dependencies', 'error', 'Both bull and bullmq installed - remove bull!')
    } else if (!deps['bullmq']) {
      logStatus('Dependencies', 'error', 'bullmq not installed')
    } else {
      logStatus('Dependencies', 'healthy', 'No Bull/BullMQ conflicts')
    }
  } catch (error: any) {
    logStatus('Dependencies', 'error', `Failed to read package.json: ${error.message}`)
  }

  // 4. PostgreSQL Check
  console.log('\n🐘 PostgreSQL:')
  try {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL })
    const result = await pool.query('SELECT NOW()')
    logStatus('PostgreSQL Connection', 'healthy', 'Connected successfully')

    // Check required tables
    const tableCheck = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' 
      LIMIT 1
    `)
    if (tableCheck.rows.length > 0) {
      logStatus('PostgreSQL Schema', 'healthy', `Found ${tableCheck.rows.length}+ tables`)
    } else {
      logStatus('PostgreSQL Schema', 'warning', 'No tables found - run migrations')
    }

    // Check UUID extension
    const uuidCheck = await pool.query(`
      SELECT EXISTS(
        SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp'
      )
    `)
    if (uuidCheck.rows[0].exists) {
      logStatus('PostgreSQL uuid-ossp', 'healthy', 'Extension installed')
    } else {
      logStatus('PostgreSQL uuid-ossp', 'warning', 'Extension not installed - may be needed')
    }

    await pool.end()
  } catch (error: any) {
    logStatus('PostgreSQL', 'error', error.message)
  }

  // 5. MongoDB Check
  console.log('\n🍃 MongoDB:')
  try {
    const mongoClient = new MongoClient(process.env.MONGODB_URI || '')
    await mongoClient.connect()
    const pingResult = await mongoClient.db('admin').command({ ping: 1 })
    if (pingResult.ok) {
      logStatus('MongoDB Connection', 'healthy', 'Connected successfully')
    }

    const db = mongoClient.db('clientforge')
    const collections = await db.listCollections().toArray()
    const collectionNames = collections.map((c) => c.name)

    const requiredCollections = ['app_logs', 'audit_logs', 'error_logs']
    const missing = requiredCollections.filter((c) => !collectionNames.includes(c))

    if (missing.length === 0) {
      logStatus('MongoDB Collections', 'healthy', `All required collections present (${collections.length})`)
    } else {
      logStatus('MongoDB Collections', 'warning', `Missing: ${missing.join(', ')}`)
    }

    await mongoClient.close()
  } catch (error: any) {
    logStatus('MongoDB', 'error', error.message)
  }

  // 6. Redis Check
  console.log('\n📍 Redis:')
  try {
    const redis = createClient({
      url: process.env.REDIS_URL,
    })
    await redis.connect()
    const pong = await redis.ping()
    logStatus('Redis Connection', 'healthy', `PING: ${pong}`)

    // Check maxmemory policy
    const config = await redis.configGet('maxmemory-policy')
    const policy = config[1]
    if (policy === 'noeviction') {
      logStatus('Redis Eviction Policy', 'healthy', 'maxmemory-policy=noeviction (correct for BullMQ)')
    } else {
      logStatus('Redis Eviction Policy', 'warning', `maxmemory-policy=${policy} (should be noeviction for BullMQ)`)
    }

    await redis.quit()
  } catch (error: any) {
    logStatus('Redis', 'error', error.message)
  }

  // 7. Elasticsearch Check
  console.log('\n🔍 Elasticsearch:')
  try {
    const esClient = new Client({
      node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    })
    const info = await esClient.info()
    logStatus('Elasticsearch Connection', 'healthy', `Version ${info.version.number}`)

    // Check indices
    const indices = await esClient.cat.indices({ format: 'json' })
    if (indices && indices.length > 0) {
      logStatus('Elasticsearch Indices', 'healthy', `${indices.length} indices present`)
    } else {
      logStatus('Elasticsearch Indices', 'warning', 'No indices - run initialization')
    }
  } catch (error: any) {
    logStatus('Elasticsearch', 'error', error.message)
  }

  // 8. API Server Check
  console.log('\n🌐 API Server:')
  try {
    const response = await axios.get('http://localhost:3000/api/v1/health', {
      timeout: 5000,
    })
    if (response.status === 200) {
      logStatus('API Health Endpoint', 'healthy', `Status: ${response.data.status}`)
    }
  } catch (error: any) {
    if (error.code === 'ECONNREFUSED') {
      logStatus('API Server', 'error', 'Connection refused - server not running on port 3000')
    } else {
      logStatus('API Server', 'error', error.message)
    }
  }

  // 9. Frontend Check
  console.log('\n⚛️ Frontend:')
  try {
    const viteConfig = fs.readFileSync('frontend/vite.config.ts', 'utf8')
    if (viteConfig.includes("proxy: {") && viteConfig.includes("/api")) {
      logStatus('Vite Proxy', 'healthy', 'Proxy configuration present')
    } else {
      logStatus('Vite Proxy', 'warning', 'Proxy configuration not found')
    }

    const apiConfig = fs.readFileSync('frontend/src/lib/api.ts', 'utf8')
    if (apiConfig.includes("baseURL: API_BASE_URL") || apiConfig.includes("baseURL =")) {
      logStatus('Axios Configuration', 'healthy', 'Proper baseURL setup')
    } else {
      logStatus('Axios Configuration', 'error', 'baseURL not properly configured')
    }
  } catch (error: any) {
    logStatus('Frontend Check', 'error', error.message)
  }

  // 10. Auth Script Check
  console.log('\n🔐 Authentication:')
  try {
    const seedScript = fs.readFileSync('scripts/seed/seed-admin.ts', 'utf8')
    if (seedScript.includes('seedMasterAdmin')) {
      logStatus('Seed Admin Script', 'healthy', 'Seed admin script present and valid')
    }
  } catch (error: any) {
    logStatus('Authentication', 'error', `Seed script check failed: ${error.message}`)
  }

  // Summary
  console.log('\n════════════════════════════════════════════════')
  console.log('  Health Check Summary')
  console.log('════════════════════════════════════════════════\n')

  const healthy = results.filter((r) => r.status === 'healthy').length
  const warning = results.filter((r) => r.status === 'warning').length
  const error = results.filter((r) => r.status === 'error').length

  console.log(`✅ Healthy: ${healthy}`)
  console.log(`⚠️  Warnings: ${warning}`)
  console.log(`❌ Errors: ${error}`)
  console.log(`📊 Total Checks: ${results.length}\n`)

  if (error > 0) {
    console.log('🚨 CRITICAL ISSUES FOUND:')
    results
      .filter((r) => r.status === 'error')
      .forEach((r) => console.log(`   - ${r.service}: ${r.details}`))
    console.log()
    process.exit(1)
  } else if (warning > 0) {
    console.log('⚠️  WARNINGS:')
    results
      .filter((r) => r.status === 'warning')
      .forEach((r) => console.log(`   - ${r.service}: ${r.details}`))
    console.log()
  }

  console.log('✅ Health check complete!\n')
  process.exit(0)
}

// Run health checks
runHealthChecks().catch((error) => {
  console.error('Fatal error:', error.message)
  process.exit(1)
})
