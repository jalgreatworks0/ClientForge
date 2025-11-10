/**
 * Jest Global Setup
 * Runs once before all test suites
 */

export default async function globalSetup() {
  console.log('\n🧪 Starting test suite...\n')

  // Set test environment
  process.env.NODE_ENV = 'test'

  // You can initialize test databases here if needed
  // For now, we'll use mocks for database connections
}
