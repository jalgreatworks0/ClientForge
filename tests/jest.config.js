/**
 * Jest Configuration - UPDATED FOR BABEL
 * Testing framework setup for ClientForge CRM
 * 
 * CHANGE LOG:
 * - Switched from ts-jest to babel-jest for better TypeScript parsing
 * - Added support for optional chaining and nullish coalescing
 * - Configured for ES2020 syntax support
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Root directories
  roots: ['<rootDir>/unit', '<rootDir>/integration'],

  // Exclude e2e tests (they use Playwright, not Jest) and integration tests (missing dependencies)
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/integration/'],

  // Use babel-jest for better TypeScript parsing
  transform: {
    '^.+\\.(ts|tsx)$': ['babel-jest', {
      configFile: '../babel.config.js',
    }],
  },

  // Don't transform node_modules
  transformIgnorePatterns: ['<rootDir>/node_modules/'],

  // Module path aliases (match tsconfig.json)
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/../backend/$1',
    '^@config/(.*)$': '<rootDir>/../config/$1',
    '^@tests/(.*)$': '<rootDir>/$1',
  },

  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    '../backend/**/*.{ts,tsx}',
    '!../backend/**/*.d.ts',
    '!../backend/**/*.interface.ts',
    '!../backend/**/*.type.ts',
    '!../backend/**/index.ts',
  ],

  coverageDirectory: '<rootDir>/coverage',

  coverageThresholds: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    './backend/core/auth/': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './backend/core/permissions/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90,
    },
  },

  // Setup/Teardown
  globalSetup: '<rootDir>/setup.ts',
  globalTeardown: '<rootDir>/teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/setup-after-env.ts'],

  // Timeouts
  testTimeout: 10000,

  // Coverage reporters
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Detect open handles (memory leaks)
  detectOpenHandles: true,

  // Force exit after tests complete
  forceExit: true,

  // Max workers (parallel tests)
  maxWorkers: '50%',
}
