/**
 * Global Test Setup
 * Runs once before all tests
 */

import { config } from 'dotenv'
import path from 'path'

export default async function globalSetup(): Promise<void> {
  console.log('\n🧪 Setting up test environment...\n')

  // Load test environment variables
  config({ path: path.resolve(__dirname, '../.env.test') })

  // Override environment for tests
  process.env.NODE_ENV = 'test'
  process.env.LOG_LEVEL = 'error' // Reduce log noise during tests

  // Set test database URLs
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test_user:test_password@localhost:5433/clientforge_crm_test'
  process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6380'
  process.env.MONGODB_URL = process.env.TEST_MONGODB_URL || 'mongodb://localhost:27018/clientforge_test'

  // JWT secrets for testing
  process.env.JWT_SECRET = 'test-jwt-secret-change-in-production'
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-change-in-production'

  // Set test-specific configuration
  process.env.BCRYPT_ROUNDS = '4' // Faster password hashing in tests
  process.env.DISABLE_RATE_LIMITING = 'true'
  process.env.ENABLE_QUERY_LOGGING = 'false'

  console.log('✅ Test environment configured\n')
}
