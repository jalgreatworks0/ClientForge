# ClientForge CRM - Testing Suite

## Overview

Comprehensive testing infrastructure for ClientForge CRM with 85%+ coverage target.

## Test Structure

```
tests/
├── unit/               # Unit tests (60% of total tests)
│   ├── auth/          # Authentication service tests
│   ├── utils/         # Utility function tests
│   └── ...
├── integration/        # Integration tests (30% of total tests)
│   ├── auth/          # Auth flow tests
│   ├── setup-test-db.ts
│   └── ...
├── e2e/               # End-to-end tests (10% of total tests)
│   ├── auth/          # Login/logout flows
│   ├── playwright.config.ts
│   └── ...
├── jest.config.js     # Jest configuration
├── setup.ts           # Global test setup
├── teardown.ts        # Global test teardown
└── setup-after-env.ts # Per-file setup
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### E2E Tests Only
```bash
npm run test:e2e
```

### With Coverage
```bash
npm run test:coverage
```

### Watch Mode (Development)
```bash
npm run test:watch
```

### Single Test File
```bash
npm test -- auth-service.test.ts
```

## Test Environment Setup

### Prerequisites

1. **PostgreSQL Test Database**
   ```bash
   docker run -d \
     --name clientforge-test-postgres \
     -e POSTGRES_DB=clientforge_crm_test \
     -e POSTGRES_USER=test_user \
     -e POSTGRES_PASSWORD=test_password \
     -p 5433:5432 \
     postgres:15-alpine
   ```

2. **Redis Test Instance**
   ```bash
   docker run -d \
     --name clientforge-test-redis \
     -p 6380:6379 \
     redis:7-alpine
   ```

3. **MongoDB Test Instance**
   ```bash
   docker run -d \
     --name clientforge-test-mongodb \
     -p 27018:27017 \
     mongo:6
   ```

4. **Install Playwright Browsers**
   ```bash
   npx playwright install
   ```

### Environment Variables

Copy `.env.test` to your test environment or set the following variables:

```env
NODE_ENV=test
TEST_DATABASE_URL=postgresql://test_user:test_password@localhost:5433/clientforge_crm_test
TEST_REDIS_URL=redis://localhost:6380
TEST_MONGODB_URL=mongodb://localhost:27018/clientforge_test
JWT_SECRET=test-jwt-secret
JWT_REFRESH_SECRET=test-refresh-secret
BCRYPT_ROUNDS=4
```

## Writing Tests

### Unit Test Example

```typescript
// tests/unit/services/example-service.test.ts
import { ExampleService } from '../../../backend/services/example-service'

describe('ExampleService', () => {
  let service: ExampleService

  beforeEach(() => {
    service = new ExampleService()
  })

  it('should perform expected operation', () => {
    const result = service.doSomething()
    expect(result).toBe(expectedValue)
  })
})
```

### Integration Test Example

```typescript
// tests/integration/api/example-api.test.ts
import request from 'supertest'
import { app } from '../../../backend/api/app'

describe('Example API', () => {
  it('should return 200 OK', async () => {
    const response = await request(app)
      .get('/api/v1/example')
      .expect(200)

    expect(response.body.success).toBe(true)
  })
})
```

### E2E Test Example

```typescript
// tests/e2e/features/example.spec.ts
import { test, expect } from '@playwright/test'

test('should complete user flow', async ({ page }) => {
  await page.goto('/')
  await page.click('button#start')
  await expect(page).toHaveURL('/next-step')
})
```

## Coverage Targets

| Category | Target | Current |
|----------|--------|---------|
| Overall  | 85%+   | TBD     |
| Auth     | 95%+   | TBD     |
| Security | 90%+   | TBD     |
| API      | 85%+   | TBD     |

## Test Types

### 1. Happy Path Tests
Test expected functionality with valid inputs.

### 2. Edge Case Tests
Test boundary conditions and unusual but valid inputs.

### 3. Error Case Tests
Test error handling and validation.

### 4. Security Tests
Test SQL injection, XSS, authentication bypass, etc.

### 5. Performance Tests
Test response times and resource usage.

## Mocking

### Database Mocking
Use in-memory database or test database instance.

### External API Mocking
```typescript
jest.mock('../../../backend/services/external-api')
```

### Time Mocking
```typescript
jest.useFakeTimers()
jest.setSystemTime(new Date('2025-01-05'))
```

## Best Practices

1. **Isolation**: Each test should be independent
2. **Cleanup**: Always clean up after tests
3. **Naming**: Use descriptive test names
4. **Assertions**: One logical assertion per test
5. **Speed**: Keep unit tests fast (<1s each)
6. **Coverage**: Aim for 85%+ overall coverage
7. **Documentation**: Comment complex test setups

## Troubleshooting

### Tests Failing Locally

1. Check database connections
2. Verify environment variables
3. Clear test database: `npm run test:db:reset`
4. Check for port conflicts

### Slow Tests

1. Use `test.only()` to run single test
2. Check for N+1 queries
3. Reduce test timeout if appropriate
4. Use faster bcrypt rounds (BCRYPT_ROUNDS=4)

### Flaky Tests

1. Check for race conditions
2. Add proper waits (avoid fixed timeouts)
3. Ensure proper test isolation
4. Check for shared state

## CI/CD Integration

Tests run automatically on:
- Every commit to feature branches
- Pull requests to main/develop
- Before deployments

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Testing Best Practices](../../docs/protocols/03_TEST_COVERAGE.md)

## Support

For testing issues, contact the development team or check:
- `docs/08_TROUBLESHOOTING.md`
- `docs/protocols/03_TEST_COVERAGE.md`
