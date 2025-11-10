/**
 * Test script to check if AI services can be imported without crashing
 * Run with: node backend/test-ai-import.js
 */

// Load environment first
require('dotenv').config({ path: '.env' })

console.log('[TEST] Testing AI service imports...\n')

// Test 1: Check environment variables
console.log('1. Environment Variables:')
console.log('   ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? `SET (${process.env.ANTHROPIC_API_KEY.substring(0, 10)}...)` : '[NOT SET]')
console.log('   DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : '[NOT SET]')
console.log()

// Test 2: Try importing Anthropic SDK
console.log('2. Testing Anthropic SDK import...')
try {
  const Anthropic = require('@anthropic-ai/sdk')
  console.log('   [OK] Anthropic SDK imported successfully')

  const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY })
  console.log('   [OK] Anthropic client created successfully')
} catch (error) {
  console.log('   [ERROR] Error:', error.message)
}
console.log()

// Test 3: Try importing database utilities
console.log('3. Testing database utilities import...')
try {
  // This will try to connect to PostgreSQL
  const { getPool } = require('./database/postgresql/pool')
  console.log('   [OK] Database pool imported')

  getPool()
  console.log('   [OK] Database pool initialized')
} catch (error) {
  console.log('   [ERROR] Error:', error.message)
}
console.log()

console.log('[OK] Import test complete!')
console.log('\nIf you see errors above, that\'s what\'s crashing the backend server.')
