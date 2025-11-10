/**
 * Jest Global Teardown
 * Runs once after all test suites
 */

export default async function globalTeardown() {
  console.log('\n✅ Test suite completed\n')

  // Clean up test databases if needed
  // Close any open connections
}
