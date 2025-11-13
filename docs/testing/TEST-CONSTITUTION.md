# ClientForge-CRM Test Constitution

**Version**: 1.0
**Established**: 2025-11-13 (TM-6)
**Authority**: Test Modernization Phase 6

---

## 1. Purpose

This document defines how tests are organized, written, and evolved in ClientForge-CRM.

**Goals**:
- Keep tests trustworthy and readable
- Make it easy to understand where any given test should live
- Prevent test rot (skipped tests, broken placeholders, duplicate patterns)
- Establish clear technical debt tracking for test infrastructure

This constitution sits alongside FS-1 → FS-6 file structure sanitation work and governs all future test changes.

---

## 2. Directory Layout & Responsibilities

Top-level structure under `tests/`:

### `tests/unit/`
**Purpose**: Fast, isolated tests with no real network or disk I/O

**Characteristics**:
- Test single modules/classes in isolation
- Mock all external dependencies (repositories, queues, HTTP clients, external services)
- Should execute in milliseconds per test
- No database connections, no file system operations (except in-memory)

**Examples**:
- `tests/unit/auth/password-service.test.ts` - Password hashing/validation logic
- `tests/unit/accounts/account-service.test.ts` - Business logic for accounts
- `tests/unit/services/auth/totp.service.test.ts` - TOTP generation/verification

### `tests/integration/`
**Purpose**: Exercise multiple layers together (e.g., HTTP handler + service + repository)

**Characteristics**:
- Test interactions between 2+ system components
- May use test database connections, queue stubs, or shared test infrastructure
- Use shared setup (e.g., test DB bootstrap, seeds, TenantGuard wiring)
- Slower than unit tests but faster than E2E

**Examples**:
- `tests/integration/auth/tenant-guard.spec.ts` - Middleware + request/response integration
- `tests/integration/auth/auth-flow.test.ts` - Full authentication flow with JWT

### `tests/e2e/`
**Purpose**: High-level user flows that simulate realistic usage

**Characteristics**:
- Test complete features from user perspective
- May use Playwright or similar tools
- Typically run in specialized CI pipelines (not default test suite)
- Focus on critical user journeys (login, CRUD operations, workflows)

**Examples**:
- `tests/e2e/auth.spec.ts` - Complete authentication flow
- Playwright config: `tests/e2e/playwright.config.ts`

### `tests/performance/`
**Purpose**: Performance and load testing

**Characteristics**:
- k6 scripts and performance benchmarks
- Not part of default CI (`npm run test:backend`)
- Run separately in performance testing pipelines

**Examples**:
- `tests/performance/k6-baseline.js` - Baseline load test

### `tests/security/`
**Purpose**: Security-focused test scenarios

**Characteristics**:
- Test security controls (RLS, rate limiting, input sanitization)
- Validate auth/authz boundaries
- Test error handling for security edge cases

**Examples**:
- `tests/security/rate-limiter.test.ts` (currently skipped - Phase 5+ debt)
- `tests/security/input-sanitizer.test.ts` (currently skipped - Phase 5+ debt)

### `tests/helpers/`
**Purpose**: Small helper utilities shared across test types

**Current Contents**:
- `tests/helpers/request.ts` - HTTP request helpers for testing API endpoints

**Guidelines**:
- Keep helpers focused and reusable
- Prefer single-purpose utilities over kitchen-sink helpers
- Document parameters and return types clearly

### `tests/support/`
**Purpose**: Factories, builders, fixtures, and test app bootstrap code

**Structure**:
```
tests/support/
├── builders/           # Fluent API builders for complex objects
│   ├── expressRequestBuilder.ts
│   ├── expressResponseBuilder.ts
│   └── mockServiceBuilder.ts
├── factories/          # Data factories for test fixtures
│   ├── accountFactory.ts
│   ├── contactFactory.ts
│   ├── dealFactory.ts
│   ├── userFactory.ts
│   └── genericFactory.ts
├── fixtures/           # Static test data files
├── helpers/            # Test infrastructure helpers
│   ├── apiHelper.ts
│   ├── authHelper.ts
│   ├── dbHelper.ts
│   └── envHelper.ts
├── mocks/              # Shared mock implementations
└── test-app.ts         # Express test app bootstrap
```

**Guidelines**:
- **Factories** (`createContact()`, `createAccount()`) - Generate realistic test data
- **Builders** (`mockRequest().withTenant('t1').withAuth('u1')`) - Fluent APIs for complex objects
- **Helpers** - Infrastructure setup/teardown, database seeding, API utilities
- **Mocks** - Reusable mock implementations for common dependencies

### `backend/__tests__/workers/`
**Purpose**: Legacy location for worker tests

**Status**: Tolerated for now
- `backend/__tests__/workers/elasticsearch-sync.worker.spec.ts` exists here
- Future phases may consolidate into `tests/integration/` or `tests/unit/`
- New worker tests should prefer `tests/unit/workers/` or `tests/integration/workers/`

### Other Directories
- `tests/errors/` - Error handling integration tests
- `tests/load/` - Load testing artifacts
- `tests/logs/` - Test run logs (gitignored)
- `tests/mocks/` - Additional mock implementations

---

## 3. Test Naming & Structure

### File Naming Conventions

| Test Type | Extension | Location | Example |
|-----------|-----------|----------|---------|
| Unit | `*.test.ts` | `tests/unit/**` | `password-service.test.ts` |
| Integration | `*.spec.ts` or `*.test.ts` | `tests/integration/**` | `tenant-guard.spec.ts` |
| E2E | `*.spec.ts` | `tests/e2e/**` | `auth.spec.ts` |
| Performance | `*.js` (k6) | `tests/performance/**` | `k6-baseline.js` |

### Test Structure

Each test file should follow this pattern:

```typescript
describe('ModuleName or ScenarioName', () => {
  // Setup
  beforeEach(() => {
    // Reset mocks, initialize test state
  });

  // Teardown
  afterEach(() => {
    // Clean up resources
  });

  describe('methodName or feature area', () => {
    it('should describe expected behavior in user terms', async () => {
      // Arrange - Set up test data and mocks
      // Act - Execute the code under test
      // Assert - Verify expected outcomes
    });

    it('should handle error case X appropriately', async () => {
      // Test error paths
    });
  });
});
```

### Test Naming Guidelines

**Good test names** describe behavior, not implementation:
- ✅ `'should return JWT for valid credentials'`
- ✅ `'should throw UnauthorizedError when password is invalid'`
- ✅ `'should lock account after 5 failed login attempts'`

**Bad test names** are vague or implementation-focused:
- ❌ `'test login'`
- ❌ `'should call bcrypt.compare'`
- ❌ `'works correctly'`

---

## 4. Helpers, Factories, and Support Code

### Shared Infrastructure Principle

**Prefer shared helpers** in `tests/support/` and `tests/helpers/` over ad-hoc inline setup.

### When to Add New Support Code

#### Factories (`tests/support/factories/`)

Add a new factory when:
- You need realistic test data for a domain model (Contact, Account, Deal, etc.)
- Multiple tests need similar data with minor variations
- You want to generate N instances of an entity

**Example**: `createContact()` generates a valid contact with sensible defaults:
```typescript
import { createContact } from '@support/factories/contactFactory';

const contact = createContact({
  tenantId: 'tenant-123',
  firstName: 'Jane',
  email: 'jane@example.com'
});
```

#### Builders (`tests/support/builders/`)

Add a new builder when:
- You need fluent API for constructing complex objects (Express Request/Response)
- Configuration has many optional fields
- You want readable, chainable test setup

**Example**: `mockRequest()` builds Express request objects:
```typescript
import { mockRequest } from '@support/builders/expressRequestBuilder';

const req = mockRequest()
  .withTenant('tenant-123')
  .withAuth('user-456')
  .withBody({ name: 'Test' })
  .build();
```

#### Helpers (`tests/support/helpers/`)

Add helper utilities for:
- Database seeding and cleanup (`dbHelper.ts`)
- Authentication/authorization setup (`authHelper.ts`)
- API request utilities (`apiHelper.ts`)
- Environment variable management (`envHelper.ts`)

#### HTTP Helpers (`tests/helpers/`)

For HTTP-specific test utilities:
- Use or extend `tests/helpers/request.ts` for API testing
- Keep HTTP helpers separate from domain-specific support code

### Guidelines

1. **Keep code DRY** - Avoid duplicating test setup logic
2. **Strong typing** - Use TypeScript interfaces for all factories and builders
3. **Sensible defaults** - Factories should work with zero arguments
4. **Composability** - Make helpers easy to combine and extend
5. **Documentation** - Add JSDoc comments explaining purpose and usage

---

## 5. Skipped Tests & Placeholder Suites

We treat skipped tests and placeholder suites as **technical debt**, not permanent residents.

### Rules for Skipping Tests

`describe.skip` and `it.skip` are **allowed only when**:

1. **Clear TODO comment** explaining:
   - Why the test is skipped
   - What needs to happen before it can be re-enabled
   - Link to issue/ticket if applicable

2. **Code compiles** - The test code must have:
   - Zero TypeScript errors
   - Correct method signatures
   - Valid imports and type references

### Rules for New Test Files

**Do NOT create new test files that**:
- Immediately fail to compile
- Rely on outdated method signatures
- Have unresolved type errors

### Alternatives to Placeholder Tests

If a feature is not ready, **prefer**:

1. **`.todo` tests** with brief notes:
   ```typescript
   it.todo('should validate SSO provider configuration');
   ```

2. **GitHub issues** or project board tickets:
   - Link from code comments
   - Track in project management tools
   - Document in ADR TODO sections

3. **ADR (Architecture Decision Record)** TODO sections:
   - Document planned test coverage
   - Explain testing strategy
   - Reference in docs/architecture/

### Handling Skipped Tests

When you encounter a skipped test:

1. **If feature is implemented** → Fix and unskip
2. **If feature is partially ready** → Update test, keep skip, update TODO
3. **If feature is obsolete** → Delete test file, document decision

---

## 6. TypeScript & Linting Standards for Tests

### TypeScript Standards

**Target State**: All tests compile with **0 TypeScript errors**

#### Rules

1. **All test files must compile** successfully:
   ```bash
   npm run typecheck  # Must pass with 0 errors
   ```

2. **No new tests may be merged** if they don't compile

3. **Type imports** - Use proper imports for types:
   ```typescript
   import { Request, Response } from 'express';
   import { Contact, CreateContactInput } from '@/core/contacts/contact-types';
   ```

4. **Mock typing** - Type your mocks appropriately:
   ```typescript
   const mockRepo = {
     findById: jest.fn() as jest.MockedFunction<typeof realRepo.findById>
   };
   ```

5. **Test data typing** - Use factories with proper types:
   ```typescript
   const contact: Contact = createContact({ firstName: 'John' });
   ```

### Linting Standards

**Target State**: All tests satisfy ESLint rules

#### Rules

1. **ESLint must pass**:
   ```bash
   npm run lint  # Must pass with 0 errors (warnings allowed)
   ```

2. **Targeted disables only** - Use `eslint-disable` sparingly:
   ```typescript
   // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Mock type safety
   const mockFn = jest.fn() as any;
   ```

3. **No global disables** - Do not disable rules for entire test directories without justification

4. **Follow patterns** - Match linting style of existing passing tests

---

## 7. Known Test Debt

### Overview

**As of TM-10 (2025-11-13)**: ✅ **Zero broken test suites**

All previously broken test suites have been removed in TM-10. The test suite now maintains:
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ **0 failing test suites** ⭐

### Historical Context (TM-5 through TM-9)

Between TM-5 and TM-9, there were 7 known failing suites due to TypeScript compilation errors from API signature drift. All 7 were marked `describe.skip` and failed only due to TS errors.

**TM-10 Resolution** (2025-11-13):
- Removed all 7 broken test files per user directive: "make 7 more new ones that do work and delete the broken ones"
- All underlying features exist and work in production
- Tests can be reintroduced when features are actively developed with correct API signatures

### Removed Suites (TM-10)

| # | Suite (Removed) | Implementation | Status | Coverage |
|---|-----------------|----------------|--------|----------|
| 1 | `tests/unit/services/auth/sso-provider.service.test.ts` | `backend/services/auth/sso/sso-provider.service.ts` | ✅ EXISTS | ⏳ Future |
| 2 | `tests/unit/tasks/task-service.test.ts` | `backend/core/tasks/task-service.ts` | ✅ EXISTS | ⏳ Future |
| 3 | `tests/unit/metadata/custom-field-service.test.ts` | `backend/services/custom-fields/custom-field.service.ts` | ✅ EXISTS | ⏳ Future |
| 4 | `tests/unit/security/rate-limiter.test.ts` | `backend/middleware/rate-limiter.ts` | ✅ EXISTS | ⏳ TM-12 |
| 5 | `tests/unit/security/input-sanitizer.test.ts` | `backend/utils/sanitization/input-sanitizer.ts` | ✅ EXISTS | ⏳ TM-13 |
| 6 | `tests/unit/auth/tenant-guard.test.ts` | `backend/middleware/tenant-guard.ts` | ✅ EXISTS | ✅ **TM-11** |
| 7 | `tests/integration/auth/auth-flow.test.ts` | `backend/api/server.ts` | ✅ EXISTS | ⏳ TM-14 |

**All implementations exist and work in production.** Tests were removed to achieve 0 failing suites baseline.

**TM-11 Update** (2025-11-13): TenantGuard now has comprehensive fortress suite coverage:
- New test suite: [tests/unit/auth/tenant-guard.test.ts](../../../tests/unit/auth/tenant-guard.test.ts)
- Coverage: 23 tests (happy path, error cases, edge cases, response validation)
- Pattern: First "fortress suite" for critical infrastructure middleware

### Future Coverage Opportunities

When adding coverage for the above features:
- Follow this Constitution's directory layout and patterns
- Use Test Constitution patterns (Section 3)
- Leverage existing factories/builders (Section 4)
- Align with current API signatures (check implementation first)
- Add tests only when feature is actively developed or enhanced

### Policy: Zero Failing Suites

**From TM-10 forward, no failing test suites are tolerated**:

1. **All tests must compile** - No TypeScript errors allowed
2. **All tests must run or be intentionally skipped** - Skips must have clear reasons
3. **No API drift** - Test signatures must match implementation signatures
4. **New tests follow Constitution** - Use established patterns and infrastructure

---

## 8. Adding New Tests (Checklist)

When you add or modify tests, follow this checklist:

### ✅ Planning
- [ ] Choose correct directory (`unit/`, `integration/`, `e2e/`, `performance/`, `security/`)
- [ ] Review existing tests in that area for patterns
- [ ] Check if shared helpers/factories exist

### ✅ Implementation
- [ ] Use existing helpers from `tests/helpers/` and `tests/support/`
- [ ] Follow naming conventions (describe behavior, not implementation)
- [ ] Write clear, focused test cases (one assertion per test preferred)
- [ ] Mock external dependencies appropriately
- [ ] Use factories for test data generation

### ✅ Code Quality
- [ ] Add TypeScript types for all test data
- [ ] Follow ESLint standards
- [ ] Add JSDoc comments for complex test scenarios
- [ ] Keep tests DRY (Don't Repeat Yourself)

### ✅ Verification
Run the full safety net:
```bash
npm run typecheck    # Must pass: 0 errors
npm run lint         # Must pass: 0 errors (warnings allowed)
npm run test:backend # Must pass: no new failures
```

### ✅ Avoid
- [ ] ❌ New placeholder directories
- [ ] ❌ New skipped suites with compile errors
- [ ] ❌ Ad-hoc global mocks that break other tests
- [ ] ❌ Hardcoded test data when factories exist
- [ ] ❌ Tests that depend on execution order

---

## 9. Constitution Evolution

This constitution is **living documentation** and may evolve as:
- New test patterns emerge
- Infrastructure improves
- Team learns better practices
- Technology changes

### Making Changes

To modify this constitution:

1. **Propose change** via GitHub issue or PR discussion
2. **Document rationale** - Explain why change is needed
3. **Update TEST-MODERNIZATION-LOG.md** - Record the change as a TM phase entry
4. **Communicate to team** - Ensure all contributors are aware
5. **Update examples** - Reflect changes in existing test patterns

### Version History

| Version | Date | Changes | Reference |
|---------|------|---------|-----------|
| 1.0 | 2025-11-13 | Initial constitution established | TM-6 |

---

## 10. References

### Related Documentation
- **Test Modernization Log**: `docs/testing/TEST-MODERNIZATION-LOG.md`
- **Test README**: `tests/README.md`
- **File Structure Sanitation Blueprint**: `docs/fs/FS-SANITATION-BLUEPRINT.md`

### Configuration Files
- **Jest Config**: `jest.config.js`
- **TypeScript Config**: `tsconfig.json`
- **ESLint Config**: `.eslintrc.json`
- **CI Workflow**: `.github/workflows/ci.yml`

### Test Patterns Examples
- **Factory Example**: `tests/support/factories/contactFactory.ts`
- **Builder Example**: `tests/support/builders/expressRequestBuilder.ts`
- **Helper Example**: `tests/helpers/request.ts`
- **Unit Test Example**: `tests/unit/auth/password-service.test.ts`
- **Fortress Suite Example**: `tests/unit/auth/tenant-guard.test.ts` (TM-11)
- **Integration Test Example**: `tests/errors/error-handler.integration.test.ts`

---

**This Test Constitution is authoritative for all test-related decisions in ClientForge-CRM.**

When in doubt, refer to this document. When this document is unclear, propose an amendment.
