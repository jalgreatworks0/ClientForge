/**
 * Setup After Environment
 * Runs before each test file
 */

// Extend Jest matchers (optional, can add custom matchers here)

// Set longer timeout for integration tests
jest.setTimeout(10000)

// Mock console methods to reduce noise (can be enabled per test)
global.console = {
  ...console,
  // Uncomment to suppress console output during tests
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: console.error, // Keep errors visible
}

// Mock date for consistent testing (optional)
// jest.useFakeTimers()
// jest.setSystemTime(new Date('2025-01-05'))

// Global test utilities
export {}
