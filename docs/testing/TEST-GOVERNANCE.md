# Test Governance & Best Practices

## Overview

This document establishes standards, patterns, and guidelines for writing and maintaining tests in the ClientForge-CRM codebase. Following these guidelines ensures consistency, maintainability, and alignment with our 85%+ coverage goal.

**Last Updated**: 2025-11-12
**Applies To**: All test code in `tests/` directory

---

## Table of Contents
1. [Test Infrastructure](#test-infrastructure)
2. [Test Organization](#test-organization)
3. [Naming Conventions](#naming-conventions)
4. [Test Patterns](#test-patterns)
5. [Mocking Strategy](#mocking-strategy)
6. [Coverage Requirements](#coverage-requirements)
7. [CI/CD Integration](#cicd-integration)
8. [Common Pitfalls](#common-pitfalls)

---

## Test Infrastructure

### Phase 1 Infrastructure (USE THIS!)

**Location**: `tests/support/`

All test infrastructure is centralized in `tests/support/` for easy discovery and reuse. **DO NOT** create co-located test utilities - always use or extend the centralized infrastructure.

#### 1. Factories
**Location**: `tests/support/factories/`

Use factories to generate realistic test data with sensible defaults.

```typescript
import { createUser, createTenant, createAccount } from '@tests/support/factories'

// Generate with defaults
const user = createUser()

// Override specific fields
const admin = createAdminUser({ email: 'admin@example.com', tenantId: 'tenant-123' })

// Generate multiple entities
const users = createUsers(10) // 10 unique users
```

**Available Factories**:
- `userFactory.ts` - Users (regular, admin, test users)
- `tenantFactory.ts` - Tenants with subscription/billing info
- `accountFactory.ts` - Accounts/companies
- `contactFactory.ts` - Contacts
- `dealFactory.ts` - Deals/opportunities
- `genericFactory.ts` - Low-level utilities (IDs, timestamps, sequences)

**When to Create New Factories**:
- ✅ When adding tests for a new core entity (Task, Invoice, etc.)
- ✅ When multiple tests need the same complex entity setup
- ❌ For one-off test data (just inline it in the test)
- ❌ For simple objects (use plain JavaScript objects)

#### 2. Builders
**Location**: `tests/support/builders/`

Use builders for fluent, chainable mock construction.

```typescript
import { ExpressRequestBuilder, ExpressResponseBuilder } from '@tests/support/builders'

// Build Express Request mock
const req = new ExpressRequestBuilder()
  .withTenant('tenant-123')
  .withAuth('user-456', 'jwt-token')
  .withBody({ name: 'Test Account' })
  .withMethod('POST')
  .withPath('/api/v1/accounts')
  .build()

// Build Express Response mock
const res = new ExpressResponseBuilder().build()

// Call middleware/controller
await accountController.create(req, res, next)

// Assertions
expect(res.status).toHaveBeenCalledWith(201)
expect(res.json).toHaveBeenCalledWith({ id: expect.any(String), name: 'Test Account' })
```

**Available Builders**:
- `ExpressRequestBuilder` - Express Request mocks
- `ExpressResponseBuilder` - Express Response mocks (with status, json, headers, etc.)
- `MockServiceBuilder` - Generic service mock pattern

**When to Create New Builders**:
- ✅ For complex objects with many optional properties
- ✅ When the fluent API improves test readability
- ❌ For simple objects (just use factories or plain objects)

#### 3. Helpers
**Location**: `tests/support/helpers/`

Use helpers for common test operations.

```typescript
import {
  generateTestJWT,
  createAuthHeaders,
  apiGet,
  apiPost,
} from '@tests/support/helpers'

// Auth helpers
const token = generateTestJWT({ userId: 'user-123', tenantId: 'tenant-123' })
const headers = createAuthHeaders('user-123', 'tenant-123')

// API helpers (supertest wrappers)
const response = await apiGet(app, '/api/v1/accounts', 'tenant-123', token)
expect(response.status).toBe(200)

// Database helpers
import { seedDatabase, clearDatabase } from '@tests/support/helpers'
await seedDatabase('tenants', tenants)
await clearDatabase('accounts')
```

**Available Helpers**:
- `authHelper.ts` - JWT generation, auth headers
- `apiHelper.ts` - Supertest wrappers for API testing
- `dbHelper.ts` - Database seeding/cleanup
- `envHelper.ts` - Environment variable management
- `snapshotHelper.ts` - Snapshot sanitization (remove UUIDs/timestamps)

#### 4. Fixtures
**Location**: `tests/support/fixtures/`

Use fixtures for static test data that doesn't need generation logic.

```typescript
import tenants from '@tests/support/fixtures/tenants.json'
import users from '@tests/support/fixtures/users.json'

// Use in tests
const testTenant = tenants[0]
expect(testTenant.id).toBe('test_tenant')
```

**Available Fixtures**:
- `tenants.json` - Sample tenants
- `users.json` - Pre-configured test users
- `accounts.json` - Sample accounts
- `empty.json` - Empty array for negative tests

---

## Test Organization

### Directory Structure

```
tests/
├── unit/                          # Unit tests (isolated, fast)
│   ├── auth/                      # Auth-related units
│   ├── services/                  # Service layer tests
│   ├── utils/                     # Utility function tests
│   └── ...
├── integration/                   # Integration tests (multiple components)
│   ├── api/                       # API endpoint tests
│   ├── auth/                      # Auth flow tests
│   └── ...
├── e2e/                          # End-to-end tests (full stack)
│   └── playwright/               # Playwright browser tests
├── errors/                       # Error handling tests
├── support/                      # Test infrastructure (factories, builders, helpers)
│   ├── factories/
│   ├── builders/
│   ├── helpers/
│   └── fixtures/
├── mocks/                        # Global mocks (pg, redis, etc.)
├── jest-setup.ts                 # Jest global setup
├── global-setup.ts               # Test environment setup
└── global-teardown.ts            # Test environment cleanup
```

### Test File Naming

| Test Type | Pattern | Example |
|-----------|---------|---------|
| Unit Tests | `{module-name}.test.ts` | `password-service.test.ts` |
| Integration Tests | `{feature-name}.spec.ts` or `.test.ts` | `auth-flow.test.ts` |
| E2E Tests | `{user-flow}.e2e.ts` | `signup-flow.e2e.ts` |

**Location Rules**:
- Unit tests: `tests/unit/{domain}/{file}.test.ts`
- Integration tests: `tests/integration/{feature}/{file}.spec.ts`
- E2E tests: `tests/e2e/{flow}.e2e.ts`

---

## Naming Conventions

### Test Suite Names

```typescript
// ✅ Good: Clear, specific, matches implementation
describe('PasswordService', () => {
  describe('hash', () => {
    it('should hash password with bcrypt using configured salt rounds', async () => {
      // ...
    })
  })
})

// ❌ Bad: Vague, not descriptive
describe('Tests', () => {
  it('works', () => {
    // ...
  })
})
```

### Test Case Names

Use the **"should"** pattern:
- ✅ `it('should return 401 when credentials are invalid', ...)`
- ✅ `it('should create user with valid email and password', ...)`
- ✅ `it('should throw ValidationError when email format is invalid', ...)`

**Pattern**: `it('should {expected behavior} when {condition}', ...)`

### Variable Names

```typescript
// ✅ Good: Descriptive, clear purpose
const validPassword = 'SecurePassword123!'
const invalidEmail = 'not-an-email'
const mockUserRepository = createMockRepository()

// ❌ Bad: Abbreviations, unclear
const pwd = 'test'
const usr = {}
const repo = mock()
```

---

## Test Patterns

### AAA Pattern (Arrange-Act-Assert)

Always structure tests using the AAA pattern:

```typescript
it('should create account with valid data', async () => {
  // 🔹 Arrange: Set up test data and mocks
  const input = {
    name: 'Acme Corp',
    industry: 'Technology',
  }
  const mockAccount = { id: 'account-123', ...input }
  mockRepository.create.mockResolvedValue(mockAccount)

  // 🔹 Act: Execute the code under test
  const result = await accountService.create('tenant-123', input)

  // 🔹 Assert: Verify the outcome
  expect(result).toEqual(mockAccount)
  expect(mockRepository.create).toHaveBeenCalledWith('tenant-123', input)
})
```

### Positive and Negative Test Cases

Always test both success and failure paths:

```typescript
describe('createAccount', () => {
  // ✅ Positive: Success path
  it('should create account with valid data', async () => {
    // ...
  })

  // ✅ Negative: Validation errors
  it('should throw ValidationError when name is missing', async () => {
    await expect(
      accountService.create('tenant-123', { name: '' })
    ).rejects.toThrow(ValidationError)
  })

  // ✅ Negative: Not found errors
  it('should throw NotFoundError when tenant does not exist', async () => {
    mockTenantRepo.findById.mockResolvedValue(null)
    await expect(
      accountService.create('invalid-tenant', { name: 'Acme' })
    ).rejects.toThrow(NotFoundError)
  })
})
```

### Edge Cases

Test boundary conditions and edge cases:

```typescript
describe('validatePassword', () => {
  it('should accept password with exactly 8 characters', () => {
    const result = validatePassword('Pass123!')
    expect(result.valid).toBe(true)
  })

  it('should reject password with 7 characters', () => {
    const result = validatePassword('Pass12!')
    expect(result.valid).toBe(false)
  })

  it('should accept password with 128 characters', () => {
    const password = 'A'.repeat(120) + '1!aB'
    const result = validatePassword(password)
    expect(result.valid).toBe(true)
  })

  it('should reject password with 129 characters', () => {
    const password = 'A'.repeat(121) + '1!aB'
    const result = validatePassword(password)
    expect(result.valid).toBe(false)
  })
})
```

---

## Mocking Strategy

### When to Mock

| Dependency Type | Mock? | Reason |
|----------------|-------|--------|
| External Services (Firebase, OpenAI, Stripe) | ✅ Yes | Avoid network calls, costs, flakiness |
| Databases (PostgreSQL, MongoDB, Redis) | ✅ Yes | Avoid DB setup, speed up tests |
| File System | ✅ Yes | Avoid side effects |
| Date/Time | ⚠️ Sometimes | Only if testing time-sensitive logic |
| Pure Functions | ❌ No | Fast and deterministic |
| In-process Services | ⚠️ Sometimes | Only for unit tests; use real in integration tests |

### Manual Mock Factories (Recommended)

For libraries with complex type systems (bcrypt, firebase-admin, etc.), use manual mock factories:

```typescript
// ✅ Good: Manual mock factory
const mockHash = jest.fn()
const mockCompare = jest.fn()

jest.mock('bcrypt', () => ({
  hash: mockHash,
  compare: mockCompare,
  getRounds: jest.fn(),
}))

// Then in tests:
mockHash.mockResolvedValue('$2b$12$hashedpassword')
```

**Why?** Avoids TypeScript type errors from `jest.Mocked<typeof library>` returning `never` types.

### Automatic Mocking (Use Sparingly)

For simple mocks, automatic mocking works:

```typescript
// ✅ OK for simple cases
jest.mock('../../../backend/repositories/user-repository')
import { userRepository } from '../../../backend/repositories/user-repository'

(userRepository.findById as jest.Mock).mockResolvedValue(mockUser)
```

**Caveat**: May require type assertions (`as jest.Mock`) and can break with complex overloads.

### Mock Configuration Best Practices

```typescript
describe('PasswordService', () => {
  beforeEach(() => {
    // ✅ Reset mocks before each test
    jest.clearAllMocks()

    // ✅ Set up default mock behavior
    mockHash.mockResolvedValue('default-hash')
  })

  it('should hash password', async () => {
    // ✅ Override mock for specific test
    mockHash.mockResolvedValue('specific-hash')

    const result = await passwordService.hash('password')

    expect(result).toBe('specific-hash')
    expect(mockHash).toHaveBeenCalledWith('password', 12)
  })
})
```

---

## Coverage Requirements

### Jest Configuration

Coverage thresholds are enforced via `jest.config.js`:

```javascript
coverageThreshold: {
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
}
```

**Note**: Fixed typo from `coverageThresholds` (plural) to `coverageThreshold` (singular) in Phase 1.

### Coverage Exclusions

Exclude from coverage:
- Test files (`**/*.test.ts`, `**/*.spec.ts`)
- Type definitions (`**/*.d.ts`)
- Entry points (`backend/index.ts`)
- Experimental code (`backend/services/ai/experimental/**/*`)

```javascript
collectCoverageFrom: [
  'backend/**/*.ts',
  '!backend/**/*.test.ts',
  '!backend/**/*.spec.ts',
  '!backend/**/*.d.ts',
  '!backend/index.ts',
  '!backend/services/ai/experimental/**/*',
]
```

### Current Coverage Status

| Module | Current | Target | Status |
|--------|---------|--------|--------|
| **Global** | 34% | 85% | 🔴 Below Target |
| **Auth Services** | 60% | 95% | 🟡 Needs Improvement |
| **Middleware** | 25% | 95% | 🔴 Critical Gap |
| **API Controllers** | 15% | 85% | 🔴 Critical Gap |

**See**: `docs/TEST_MODERNIZATION_BLUEPRINT.md` for detailed coverage analysis.

---

## CI/CD Integration

### GitHub Actions Workflow

**File**: `.github/workflows/ci.yml`

```yaml
jobs:
  typecheck:
    name: TypeScript Type Check
    runs-on: ubuntu-latest
    steps:
      - run: npm run typecheck  # ✅ BLOCKING (no || true)

  test:
    name: Jest Tests (Unit + Integration)
    runs-on: ubuntu-latest
    steps:
      - run: npm run test:backend  # ✅ BLOCKING (no || true)

  lint:
    name: ESLint Code Quality (informational)
    runs-on: ubuntu-latest
    continue-on-error: true  # ⚠️ NON-BLOCKING (157 errors to fix in Phase 4)
    steps:
      - run: npm run lint
```

### Pre-commit Hooks

**Recommended** (not yet configured):

```bash
# .husky/pre-commit
#!/bin/sh
npm run typecheck
npm run lint:backend
npm run test:backend
```

---

## Common Pitfalls

### 1. ❌ Forgetting to Reset Mocks

```typescript
// ❌ Bad: Mock state persists across tests
describe('UserService', () => {
  it('test 1', () => {
    mockRepo.findById.mockResolvedValue(user1)
    // ...
  })

  it('test 2', () => {
    // 🐛 Bug: Mock still returns user1 from test 1!
    const result = await userService.get('user-2')
    expect(result).toBe(user2) // ❌ Fails!
  })
})

// ✅ Good: Reset mocks in beforeEach
describe('UserService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('test 1', () => {
    mockRepo.findById.mockResolvedValue(user1)
    // ...
  })

  it('test 2', () => {
    mockRepo.findById.mockResolvedValue(user2) // ✅ Fresh mock
    // ...
  })
})
```

### 2. ❌ Testing Implementation Details

```typescript
// ❌ Bad: Tests internal implementation
it('should call bcrypt.hash with salt rounds', async () => {
  await passwordService.hash('password')
  expect(bcrypt.hash).toHaveBeenCalledWith('password', 12)
})

// ✅ Good: Tests behavior
it('should return hashed password', async () => {
  const hashedPassword = await passwordService.hash('password')
  expect(hashedPassword).toMatch(/^\$2b\$12\$/)
  expect(hashedPassword).not.toBe('password') // Verify it's actually hashed
})
```

### 3. ❌ Overly Specific Assertions

```typescript
// ❌ Bad: Brittle, fails when unrelated fields change
expect(user).toEqual({
  id: 'user-123',
  email: 'test@example.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  lastLoginAt: null,
  // ... 20 more fields
})

// ✅ Good: Only assert what matters for this test
expect(user).toMatchObject({
  id: 'user-123',
  email: 'test@example.com',
})
expect(user.createdAt).toBeDefined()
```

### 4. ❌ Async/Await Errors

```typescript
// ❌ Bad: Forgot await, test passes even if it should fail
it('should throw error', () => {
  expect(userService.create(invalidData)).rejects.toThrow()
  // 🐛 Bug: No await! Test always passes
})

// ✅ Good: Always await async tests
it('should throw error', async () => {
  await expect(userService.create(invalidData)).rejects.toThrow(ValidationError)
})
```

### 5. ❌ Not Reading Implementation Before Fixing Tests

```typescript
// ❌ Bad: Assumed error handler returns this format
expect(responseData).toEqual({
  error: { id: 'AUTH-001', name: 'InvalidCredentials' }
})
// 🐛 Bug: Actual format is RFC 7807 Problem Details!

// ✅ Good: Read implementation, update test expectations
expect(responseData).toEqual({
  type: 'https://clientforge.com/errors/AUTH-001',
  title: 'InvalidCredentials',
  status: 401,
  errorId: 'AUTH-001',
})
```

---

## Approval and Enforcement

### Review Checklist

When reviewing test code, ensure:

- ✅ Uses Phase 1 infrastructure (factories, builders, helpers)
- ✅ Follows AAA pattern (Arrange-Act-Assert)
- ✅ Tests both positive and negative cases
- ✅ Mocks reset in `beforeEach()`
- ✅ No implementation detail testing
- ✅ Async functions use `await`
- ✅ Descriptive test names using "should" pattern
- ✅ No magic numbers or hardcoded values (use constants/factories)

### Governance Enforcement

- **CI/CD**: Enforced via GitHub Actions (typecheck and test jobs are blocking)
- **Coverage**: Enforced via Jest `coverageThreshold` configuration
- **Code Review**: Manual review required for all test code changes

---

## References

- **Test Modernization Log**: `docs/testing/TEST-MODERNIZATION-LOG.md`
- **Test Blueprint**: `docs/TEST_MODERNIZATION_BLUEPRINT.md`
- **Jest Configuration**: `jest.config.js`
- **CI Configuration**: `.github/workflows/ci.yml`
- **Jest Documentation**: https://jestjs.io/docs/getting-started
- **RFC 7807 (Problem Details)**: https://datatracker.ietf.org/doc/html/rfc7807

---

**Last Updated**: 2025-11-12
**Maintained By**: Engineering Team
**Next Review**: After Phase 3 completion
