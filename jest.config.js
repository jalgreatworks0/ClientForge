/**
 * Jest Configuration
 * Comprehensive test configuration for unit, integration, and E2E tests
 */

module.exports = {
  // Use ts-jest preset for TypeScript support
  preset: 'ts-jest',

  // Test environment
  testEnvironment: 'node',

  // Root directory
  rootDir: '.',

  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],

  // Module paths
  modulePaths: ['<rootDir>'],

  // Path aliases (match tsconfig.json)
  moduleNameMapper: {
    '^@backend/(.*)$': '<rootDir>/backend/$1',
    '^@config/(.*)$': '<rootDir>/config/$1',
    '^@agents/(.*)$': '<rootDir>/agents/$1',
    '^@database/(.*)$': '<rootDir>/database/$1',
    '^@scripts/(.*)$': '<rootDir>/scripts/$1',
  },

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/jest-setup.ts'],

  // Coverage configuration
  collectCoverage: true,
  collectCoverageFrom: [
    'backend/**/*.ts',
    '!backend/**/*.test.ts',
    '!backend/**/*.spec.ts',
    '!backend/**/*.d.ts',
    '!backend/index.ts',
    '!backend/services/ai/experimental/**/*',
  ],

  coverageDirectory: '<rootDir>/coverage',

  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json',
  ],

  // Coverage thresholds (enforce 85%+ coverage)
  coverageThresholds: {
    global: {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85,
    },
    // Critical modules require 95%+ coverage
    './backend/core/auth/**/*.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './backend/middleware/authenticate.ts': {
      branches: 95,
      functions: 95,
      lines: 95,
      statements: 95,
    },
  },

  // Test timeout
  testTimeout: 10000,

  // Global setup/teardown
  globalSetup: '<rootDir>/tests/global-setup.ts',
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // Clear mocks between tests
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // Verbose output
  verbose: true,

  // Transform configuration
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '<rootDir>/agents/mcp/servers/vector-lms/',
    '<rootDir>/agents/.*/node_modules/',
    '<rootDir>/.*/dist/',
    '<rootDir>/.*/build/',
  ],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
}
