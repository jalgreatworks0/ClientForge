/**
 * Jest Setup After Environment
 * Runs before each test file
 */

// Stable NODE_ENV for tests
process.env.NODE_ENV = process.env.NODE_ENV || 'test'

// Increase timeout for integration tests
jest.setTimeout(10000)

// Mock firebase-admin to prevent external calls
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(() => ({})),
  credential: {
    applicationDefault: jest.fn(() => ({})),
    cert: jest.fn(() => ({})),
  },
  messaging: jest.fn(() => ({
    send: jest.fn(async () => ({ messageId: 'mock-message-id' })),
    sendMulticast: jest.fn(async () => ({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true, messageId: 'mock-message-id' }],
    })),
    subscribeToTopic: jest.fn(async () => ({ successCount: 1, failureCount: 0 })),
    unsubscribeFromTopic: jest.fn(async () => ({ successCount: 1, failureCount: 0 })),
  })),
  auth: jest.fn(() => ({
    verifyIdToken: jest.fn(async () => ({
      uid: 'mock-uid',
      email: 'mock@example.com',
    })),
  })),
}))

// Mock Redis client to prevent external calls
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    on: jest.fn(),
    connect: jest.fn(async () => {}),
    disconnect: jest.fn(async () => {}),
    quit: jest.fn(async () => {}),
    setEx: jest.fn(async () => 'OK'),
    get: jest.fn(async () => null),
    set: jest.fn(async () => 'OK'),
    del: jest.fn(async () => 1),
    keys: jest.fn(async () => []),
    expire: jest.fn(async () => 1),
    ttl: jest.fn(async () => -1),
    flushDb: jest.fn(async () => 'OK'),
    ping: jest.fn(async () => 'PONG'),
    isOpen: true,
    isReady: true,
  })),
}))

// Mock PostgreSQL (pg) — realistic SQL router
jest.mock('pg', () => require('./mocks/pg'))

// Mock console methods to reduce noise in test output
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  // Keep error for debugging
  error: console.error,
}

// Custom matchers
expect.extend({
  toBeValidUUID(received: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const pass = uuidRegex.test(received)

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
    }
  },

  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
    }
  },

  toBeValidDate(received: string | Date) {
    const date = new Date(received)
    const pass = !isNaN(date.getTime())

    return {
      pass,
      message: () =>
        pass
          ? `expected ${received} not to be a valid date`
          : `expected ${received} to be a valid date`,
    }
  },
})

// Declare global type extensions
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R
      toBeValidEmail(): R
      toBeValidDate(): R
    }
  }
}

// Make this file a module
export {}
