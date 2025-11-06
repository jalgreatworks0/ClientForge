# 🧪 Test Coverage Protocol - 85%+ Mandatory

**P1 ESSENTIAL**: 85%+ test coverage required for all code

---

## Core Principle

**Untested code is broken code.** Write tests immediately after (or before) implementation.

---

## Coverage Requirements

| Code Type | Minimum Coverage | Target Coverage |
|-----------|------------------|-----------------|
| **Business Logic** | 90% | 95%+ |
| **API Controllers** | 85% | 90%+ |
| **Services** | 90% | 95%+ |
| **Repositories** | 80% | 85%+ |
| **Utilities** | 95% | 100% |
| **React Components** | 70% | 80%+ |
| **Overall Project** | **85%** | **90%+** |

---

## Test Distribution (60/30/10 Rule)

```
Unit Tests:        60%  (Fast, isolated, focused)
Integration Tests: 30%  (API endpoints, database, services)
E2E Tests:         10%  (Critical user flows)
```

**Example**:
- 100 total tests
- 60 unit tests (individual functions, utilities, validation)
- 30 integration tests (API routes, service workflows)
- 10 E2E tests (login flow, create contact, complete deal)

---

## Test Types & Patterns

### 1. Unit Tests (60%)

**Purpose**: Test individual functions/methods in isolation.

**Pattern**:
```typescript
// backend/core/users/user-service.test.ts
import { UserService } from './user-service'
import { UserRepository } from './user-repository'

describe('UserService', () => {
  let userService: UserService
  let mockRepository: jest.Mocked<UserRepository>

  beforeEach(() => {
    mockRepository = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn()
    } as any
    userService = new UserService(mockRepository)
  })

  describe('createUser', () => {
    it('should create user with hashed password', async () => {
      const userData = { email: 'test@example.com', password: 'Test123!' }
      mockRepository.create.mockResolvedValue({ id: '1', email: userData.email })

      const result = await userService.createUser(userData)

      expect(result.id).toBe('1')
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: userData.email,
          password: expect.not.stringMatching(userData.password) // Hashed
        })
      )
    })

    it('should throw error if email already exists', async () => {
      mockRepository.findByEmail.mockResolvedValue({ id: '1' } as any)

      await expect(
        userService.createUser({ email: 'existing@example.com', password: 'Test123!' })
      ).rejects.toThrow('Email already in use')
    })
  })
})
```

**What to Test**:
- ✅ Happy path (success scenarios)
- ✅ Edge cases (empty strings, null, undefined)
- ✅ Error handling (invalid input, business rule violations)
- ✅ Validation logic
- ✅ Data transformations

---

### 2. Integration Tests (30%)

**Purpose**: Test how components work together (API + Service + Repository + Database).

**Pattern**:
```typescript
// tests/integration/contacts/contact-api.test.ts
import request from 'supertest'
import { app } from '../../../backend/api/server'
import { db } from '../../../backend/database/postgresql/pool'
import { generateToken } from '../../helpers/auth-helper'

describe('Contact API Integration', () => {
  let authToken: string
  let tenantId: string
  let userId: string

  beforeAll(async () => {
    // Setup test database
    await db.query('BEGIN')
    const tenant = await db.query('INSERT INTO tenants (name) VALUES ($1) RETURNING id', ['Test Tenant'])
    tenantId = tenant.rows[0].id
    const user = await db.query('INSERT INTO users (email, tenant_id) VALUES ($1, $2) RETURNING id', ['test@test.com', tenantId])
    userId = user.rows[0].id
    authToken = generateToken({ userId, tenantId })
  })

  afterAll(async () => {
    // Rollback all changes
    await db.query('ROLLBACK')
    await db.end()
  })

  describe('POST /api/v1/contacts', () => {
    it('should create contact and return 201', async () => {
      const contactData = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+1234567890'
      }

      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send(contactData)

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data).toMatchObject({
        firstName: contactData.firstName,
        lastName: contactData.lastName,
        email: contactData.email,
        tenantId // Verify tenant isolation
      })

      // Verify in database
      const dbContact = await db.query('SELECT * FROM contacts WHERE email = $1', [contactData.email])
      expect(dbContact.rows).toHaveLength(1)
    })

    it('should return 400 for invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ firstName: 'John', email: 'invalid-email' })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('email')
    })

    it('should return 401 without auth token', async () => {
      const res = await request(app)
        .post('/api/v1/contacts')
        .send({ firstName: 'John', email: 'john@example.com' })

      expect(res.status).toBe(401)
    })
  })
})
```

**What to Test**:
- ✅ API endpoints (status codes, response format)
- ✅ Authentication/authorization
- ✅ Database interactions (create, read, update, delete)
- ✅ Service workflows (multi-step processes)
- ✅ Tenant isolation (multi-tenant apps)

---

### 3. E2E Tests (10%)

**Purpose**: Test critical user flows end-to-end (browser automation).

**Pattern**:
```typescript
// tests/e2e/login-flow.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('should login successfully and redirect to dashboard', async ({ page }) => {
    await page.goto('http://localhost:3001')

    // Fill login form
    await page.fill('input[name="email"]', 'admin@clientforge.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')

    // Wait for redirect
    await page.waitForURL('**/dashboard')

    // Verify dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard')
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible()
  })

  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:3001')

    await page.fill('input[name="email"]', 'wrong@example.com')
    await page.fill('input[name="password"]', 'wrongpass')
    await page.click('button[type="submit"]')

    // Error message should appear
    await expect(page.locator('[role="alert"]')).toContainText('Invalid credentials')
  })
})
```

**What to Test**:
- ✅ Critical user flows (login, checkout, contact creation)
- ✅ Cross-browser compatibility
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Accessibility (keyboard navigation, screen readers)

---

## 5 Test Categories (Every Feature)

For EVERY feature, write tests in these 5 categories:

### 1. Happy Path Tests
**Definition**: Tests where everything works as expected.

```typescript
it('should create contact successfully', async () => {
  const contact = await contactService.create(validContactData)
  expect(contact.id).toBeDefined()
})
```

### 2. Edge Case Tests
**Definition**: Boundary values, unusual inputs.

```typescript
it('should handle very long names (255 chars)', async () => {
  const longName = 'a'.repeat(255)
  const contact = await contactService.create({ firstName: longName })
  expect(contact.firstName).toBe(longName)
})

it('should handle empty optional fields', async () => {
  const contact = await contactService.create({ firstName: 'John' }) // No email, phone, etc.
  expect(contact.firstName).toBe('John')
})
```

### 3. Error Handling Tests
**Definition**: Invalid input, business rule violations.

```typescript
it('should throw error for duplicate email', async () => {
  await contactService.create({ email: 'test@example.com' })
  await expect(
    contactService.create({ email: 'test@example.com' })
  ).rejects.toThrow('Email already exists')
})

it('should throw error for missing required field', async () => {
  await expect(
    contactService.create({} as any)
  ).rejects.toThrow('firstName is required')
})
```

### 4. Security Tests
**Definition**: Authentication, authorization, injection attacks.

```typescript
it('should prevent SQL injection in search', async () => {
  const maliciousQuery = "'; DROP TABLE contacts; --"
  const results = await contactService.search(maliciousQuery)
  // Should not crash, should treat as literal string
  expect(results).toEqual([])
})

it('should reject access from different tenant', async () => {
  const contact = await contactService.create({ tenantId: 'tenant1' })
  await expect(
    contactService.getById(contact.id, 'tenant2') // Different tenant
  ).rejects.toThrow('Not found')
})
```

### 5. Performance Tests
**Definition**: Response time, scalability.

```typescript
it('should return search results in under 100ms', async () => {
  const start = Date.now()
  await contactService.search('John')
  const duration = Date.now() - start
  expect(duration).toBeLessThan(100)
})

it('should handle 1000 contacts without timeout', async () => {
  const contacts = Array.from({ length: 1000 }, (_, i) => ({
    firstName: `User${i}`,
    email: `user${i}@example.com`
  }))
  await Promise.all(contacts.map(c => contactService.create(c)))
  const results = await contactService.list()
  expect(results.length).toBeGreaterThanOrEqual(1000)
}, 10000) // 10 second timeout
```

---

## Test Organization

```
tests/
├── unit/                      # 60% of tests
│   ├── services/
│   │   ├── contact-service.test.ts
│   │   ├── deal-service.test.ts
│   │   └── user-service.test.ts
│   ├── repositories/
│   │   └── contact-repository.test.ts
│   ├── validators/
│   │   └── contact-validators.test.ts
│   └── utils/
│       ├── email-utils.test.ts
│       └── date-utils.test.ts
├── integration/               # 30% of tests
│   ├── api/
│   │   ├── contacts-api.test.ts
│   │   ├── deals-api.test.ts
│   │   └── auth-api.test.ts
│   └── workflows/
│       ├── deal-pipeline.test.ts
│       └── email-campaign.test.ts
├── e2e/                       # 10% of tests
│   ├── login-flow.spec.ts
│   ├── create-contact.spec.ts
│   └── complete-deal.spec.ts
└── helpers/
    ├── auth-helper.ts
    ├── db-helper.ts
    └── test-data.ts
```

---

## Running Tests

```bash
# Run all tests with coverage
npm test -- --coverage

# Run only unit tests
npm test -- tests/unit

# Run specific test file
npm test -- contact-service.test.ts

# Run in watch mode (during development)
npm test -- --watch

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html
# Open coverage/index.html in browser
```

---

## Coverage Verification

```bash
# Check coverage thresholds
npm test -- --coverage --coverageThreshold='{"global":{"branches":85,"functions":85,"lines":85,"statements":85}}'

# Coverage gates in CI/CD
# Add to package.json:
"jest": {
  "coverageThreshold": {
    "global": {
      "branches": 85,
      "functions": 85,
      "lines": 85,
      "statements": 85
    }
  }
}
```

**CI/CD Integration**: Tests must pass with 85%+ coverage before merging to main.

---

## Testing Best Practices

### DO ✅
- Write tests immediately after implementation
- Test behavior, not implementation details
- Use descriptive test names (`it('should reject invalid email format')`)
- Mock external dependencies (APIs, databases in unit tests)
- Clean up test data after each test
- Use factories/builders for test data
- Group related tests with `describe` blocks

### DON'T ❌
- Skip tests ("I'll add them later" - you won't!)
- Test implementation details (private methods, internal state)
- Write flaky tests (tests that randomly fail)
- Share state between tests (use `beforeEach` for setup)
- Commit code with failing tests
- Have tests with side effects

---

## Test Data Helpers

```typescript
// tests/helpers/test-data.ts
export const testDataFactory = {
  contact: (overrides = {}) => ({
    firstName: 'John',
    lastName: 'Doe',
    email: `john.doe.${Date.now()}@example.com`, // Unique email
    phone: '+1234567890',
    ...overrides
  }),

  user: (overrides = {}) => ({
    email: `user.${Date.now()}@example.com`,
    password: 'Test123!',
    tenantId: 'test-tenant',
    ...overrides
  }),

  deal: (overrides = {}) => ({
    title: 'Test Deal',
    value: 10000,
    stage: 'qualification',
    ...overrides
  })
}

// Usage:
const contact = testDataFactory.contact({ firstName: 'Jane' })
```

---

## React Component Testing

```typescript
// frontend/components/ContactCard/ContactCard.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { ContactCard } from './ContactCard'

describe('ContactCard', () => {
  const mockContact = {
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com'
  }

  it('should render contact details', () => {
    render(<ContactCard contact={mockContact} />)

    expect(screen.getByText('John Doe')).toBeInTheDocument()
    expect(screen.getByText('john@example.com')).toBeInTheDocument()
  })

  it('should call onDelete when delete button clicked', () => {
    const onDelete = jest.fn()
    render(<ContactCard contact={mockContact} onDelete={onDelete} />)

    fireEvent.click(screen.getByRole('button', { name: /delete/i }))

    expect(onDelete).toHaveBeenCalledWith(mockContact.id)
  })
})
```

---

## Coverage Report Interpretation

```
File                    | % Stmts | % Branch | % Funcs | % Lines |
------------------------|---------|----------|---------|---------|
contact-service.ts      |   95.00 |    90.00 |   95.00 |   95.00 |
deal-service.ts         |   88.00 |    85.00 |   90.00 |   88.00 |
user-service.ts         |   92.00 |    87.00 |   93.00 |   92.00 |
------------------------|---------|----------|---------|---------|
All files               |   91.67 |    87.33 |   92.67 |   91.67 |
```

**What to Look For**:
- **% Stmts (Statements)**: Percentage of code statements executed
- **% Branch**: Percentage of if/else branches tested
- **% Funcs (Functions)**: Percentage of functions called
- **% Lines**: Percentage of code lines executed

**Low branch coverage** often indicates missing edge case tests.

---

## Quick Commands

```bash
# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- contact-service.test.ts

# Update snapshots
npm test -- -u

# Run tests matching pattern
npm test -- --testNamePattern="should create"
```

---

## Remember

**85%+ coverage is mandatory. No exceptions.**

- Write tests BEFORE merging
- Tests are documentation (they show how code works)
- Fast tests = fast feedback = better code quality
- Coverage reports don't lie - use them to find gaps
