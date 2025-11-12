# 🧪 Test System Modernization Blueprint (Task 30)

**Date**: 2025-11-12
**Status**: Analysis Complete - Ready for Task 31 Implementation
**Version**: 1.0.0

---

## 📊 Executive Summary

**Current State**:
- ✅ TypeScript errors: 0
- ✅ Test failures: 0
- ⚠️ Test coverage: **32%** (target: 85%+)
- ⚠️ **13 test suites skipped** with `TODO(phase5)` markers
- ⚠️ **21 empty test directories** (dead/unused structure)
- ⚠️ **Duplicate test locations** (tests/ + backend/__tests__/)
- ⚠️ **Minimal test infrastructure** (1 helper, 1 mock, 0 factories)

**Goal**: Modernize test system to production standards while maintaining 0/0 invariant.

---

## 🗺️ Test Inventory Map

### Test Files by Location

| Location | Test Files | Status |
|----------|-----------|---------|
| `tests/unit/` | 16 | ✅ Mix of passing + skipped |
| `tests/integration/` | 2 | ⚠️ Both skipped |
| `tests/e2e/` | 2 | ⚠️ Need Playwright setup |
| `tests/errors/` | 2 | ⚠️ Both skipped |
| `tests/security/` | 1 | ⚠️ Skipped (RLS) |
| `tests/lib/` | 1 | ⚠️ Duplicate |
| `backend/__tests__/` | 1 | ⚠️ ESLint error (TSConfig) |
| `backend/auth/providers/__tests__/` | 2 | ✅ Passing |
| `backend/lib/search/__tests__/` | 1 | ⚠️ Duplicate |
| **TOTAL** | **30 test files** | |

### Test Status Breakdown

```
✅ Passing: ~14 test suites
⏸️  Skipped: 13 test suites (TODO(phase5))
❌ Broken: 1 test suite (custom-field-service.test.ts - type errors)
🔄 Duplicates: 2 (ES adapter in tests/ + backend/)
```

---

## 🚨 Critical Issues

### 1. **Skipped Test Suites (13 files)**

All marked with `TODO(phase5)`:

**Unit Tests** (7 skipped):
1. `tests/unit/auth/password-service.test.ts` - bcrypt mocking issues
2. `tests/unit/metadata/custom-field-service.test.ts` - TypeScript errors
3. `tests/unit/security/input-sanitizer.test.ts` - Implementation incomplete
4. `tests/unit/security/rate-limiter.test.ts` - Implementation incomplete
5. `tests/unit/services/auth/sso-provider.service.test.ts` - Implementation incomplete
6. `tests/unit/services/elasticsearch-sync.test.ts` - Mocks needed
7. `tests/unit/services/queue.test.ts` - Mocks needed
8. `tests/unit/tasks/task-service.test.ts` - Implementation incomplete

**Integration Tests** (2 skipped):
1. `tests/integration/auth/auth-flow.test.ts` - Full server setup needed
2. `tests/integration/auth/tenant-guard.spec.ts` - Middleware incomplete

**Error Tests** (2 skipped):
1. `tests/errors/error-handler.integration.test.ts` - Express Response mock issue
2. `tests/errors/registry.contract.test.ts` - Registry groups incomplete

**Security Tests** (1 skipped):
1. `tests/security/rls-tests.spec.ts` - RLS implementation + DB setup needed

**E2E Tests** (1 skipped):
1. `tests/e2e/auth.spec.ts` - Infrastructure needed

---

### 2. **Empty/Dead Test Directories (21 dirs)**

These directories exist but contain **NO test files**:

**AI Testing** (3 dirs - future use):
- `tests/ai-testing/accuracy-testing/`
- `tests/ai-testing/bias-detection/`
- `tests/ai-testing/model-validation/`

**E2E Infrastructure** (3 dirs - not configured):
- `tests/e2e/cypress/`
- `tests/e2e/playwright/`
- `tests/e2e/scenarios/`

**Test Support** (4 dirs - empty infrastructure):
- `tests/fixtures/` ⚠️ **Should contain test data!**
- `tests/utils/` ⚠️ **Should contain test utilities!**
- `tests/mocks/` (has 1 file: pg.ts)
- `tests/helpers/` (has 1 file: request.ts)

**Performance Testing** (3 dirs - future use):
- `tests/performance/load/`
- `tests/performance/spike/`
- `tests/performance/stress/`

**Security Testing** (3 dirs - future use):
- `tests/security/compliance/`
- `tests/security/penetration/`
- `tests/security/vulnerability-scans/`

**Integration** (3 dirs - empty):
- `tests/integration/api/`
- `tests/integration/database/`
- `tests/integration/services/`

**Unit** (2 dirs - empty):
- `tests/unit/ai/`
- `tests/unit/backend/`
- `tests/unit/frontend/`

---

### 3. **Duplicate Test Coverage**

**ES Adapter** - Tested in TWO locations:
- `tests/lib/search/es.adapter.spec.ts`
- `backend/lib/search/__tests__/es.adapter.spec.ts`

**Recommendation**: Consolidate to `tests/unit/lib/search/` and delete backend copy.

---

### 4. **Test Infrastructure Gaps**

**Current State**:
```
tests/helpers/request.ts  ✅ (supertest wrapper with tenant header)
tests/mocks/pg.ts         ✅ (realistic PostgreSQL mock)
tests/jest-setup.ts       ✅ (global mocks: firebase, redis, pg)
tests/fixtures/           ❌ EMPTY (no fixture data)
```

**Missing Infrastructure**:
1. ❌ **No data factories** (User, Account, Contact, Deal, etc.)
2. ❌ **No mock builders** (Express req/res, service mocks)
3. ❌ **No fixture data** (sample tenants, users, deals)
4. ❌ **No test database helpers** (seed, cleanup, reset)
5. ❌ **No API test helpers** (auth tokens, headers)
6. ❌ **No integration test containers** (Docker test dependencies)

---

### 5. **Jest Configuration Issues**

**Typo Found**:
```javascript
// jest.config.js line 62
coverageThresholds: { ... }  // ❌ Wrong key name
```

**Should be**:
```javascript
coverageThreshold: { ... }  // ✅ Correct Jest config key
```

**Impact**: Jest warns but doesn't fail. Not enforcing coverage thresholds.

---

### 6. **Test Location Inconsistency**

**Current structure mixes two patterns**:

Pattern A: **Centralized tests/ directory**
```
tests/
  unit/
  integration/
  e2e/
```

Pattern B: **Co-located __tests__/ directories**
```
backend/
  auth/providers/__tests__/
  lib/search/__tests__/
  __tests__/
```

**Recommendation**: Standardize on **Pattern A** (centralized) for consistency.

---

### 7. **Coverage Gaps**

| Category | Backend Files | Test Files | Gap |
|----------|---------------|-----------|-----|
| Services | 51 | 4 | **47 missing** |
| Controllers | 5 | 0 | **5 missing** |
| Middleware | ~10 | 0 | **~10 missing** |
| Utilities | ~20 | 2 | **~18 missing** |

**Current coverage: 32%**
**Target coverage: 85%+**
**Gap: 53 percentage points**

---

## 🏗️ Proposed Modern Test Structure

### New Directory Layout

```
tests/
├── unit/                          # Fast, isolated unit tests
│   ├── services/                  # Service layer tests
│   │   ├── auth/                  # Auth services
│   │   ├── crm/                   # CRM services (accounts, contacts, deals)
│   │   ├── ai/                    # AI services
│   │   ├── queue/                 # Queue services
│   │   └── search/                # Search services
│   ├── api/                       # API controller tests
│   │   ├── auth/
│   │   ├── accounts/
│   │   └── deals/
│   ├── middleware/                # Middleware tests
│   │   ├── auth/
│   │   ├── tenant/
│   │   └── security/
│   ├── lib/                       # Shared library tests
│   └── utils/                     # Utility function tests
│
├── integration/                   # Cross-module integration tests
│   ├── api/                       # Full API endpoint tests
│   ├── auth/                      # Auth flows
│   ├── database/                  # Database operations
│   ├── queue/                     # Queue workflows
│   └── search/                    # Search integration
│
├── e2e/                           # End-to-end tests
│   ├── auth/                      # Login, registration, SSO flows
│   ├── crm/                       # Full CRM workflows
│   └── api/                       # API contract tests
│
├── performance/                   # Performance tests (k6)
│   ├── load/                      # Load testing
│   ├── stress/                    # Stress testing
│   └── spike/                     # Spike testing
│
├── security/                      # Security tests
│   ├── rls.spec.ts                # Row-level security
│   ├── auth.spec.ts               # Authentication security
│   └── input-validation.spec.ts  # Input sanitization
│
├── support/                       # ⭐ NEW: Test infrastructure
│   ├── factories/                 # ⭐ Data factories
│   │   ├── user.factory.ts
│   │   ├── account.factory.ts
│   │   ├── contact.factory.ts
│   │   ├── deal.factory.ts
│   │   └── index.ts
│   ├── builders/                  # ⭐ Mock builders
│   │   ├── express.builder.ts     # Express req/res mocks
│   │   ├── service.builder.ts     # Service mocks
│   │   └── index.ts
│   ├── fixtures/                  # ⭐ Static test data
│   │   ├── tenants.json
│   │   ├── users.json
│   │   └── deals.json
│   ├── helpers/                   # ⭐ Test helpers
│   │   ├── auth.helper.ts         # JWT tokens, auth headers
│   │   ├── database.helper.ts     # DB seed/cleanup
│   │   ├── api.helper.ts          # API test utilities
│   │   └── request.ts             # Existing supertest wrapper
│   └── mocks/                     # Global mocks
│       ├── pg.ts                  # Existing PostgreSQL mock
│       ├── redis.mock.ts          # Redis mock
│       ├── elasticsearch.mock.ts  # Elasticsearch mock
│       └── index.ts
│
├── jest.config.js                 # Root Jest config
├── jest.config.unit.js            # ⭐ NEW: Unit test config
├── jest.config.integration.js     # ⭐ NEW: Integration config
├── jest-setup.ts                  # Global setup
├── global-setup.ts                # Test environment setup
└── global-teardown.ts             # Test environment cleanup
```

---

## 🛠️ Proposed Test Infrastructure

### 1. Data Factories

**Purpose**: Create realistic test data quickly.

**Example** (`tests/support/factories/user.factory.ts`):
```typescript
import { v4 as uuid } from 'uuid'

export interface UserFactoryOptions {
  tenantId?: string
  email?: string
  role?: 'admin' | 'user' | 'guest'
  isActive?: boolean
}

export function createUser(options: UserFactoryOptions = {}) {
  return {
    id: uuid(),
    tenantId: options.tenantId ?? 'test_tenant',
    email: options.email ?? `user_${Date.now()}@test.com`,
    role: options.role ?? 'user',
    isActive: options.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

export function createUsers(count: number, options: UserFactoryOptions = {}) {
  return Array.from({ length: count }, () => createUser(options))
}
```

**Needed Factories**:
- `user.factory.ts`
- `account.factory.ts`
- `contact.factory.ts`
- `deal.factory.ts`
- `task.factory.ts`
- `tenant.factory.ts`

---

### 2. Mock Builders

**Purpose**: Build complex mocks with fluent API.

**Example** (`tests/support/builders/express.builder.ts`):
```typescript
import { Request, Response } from 'express'

export class ExpressRequestBuilder {
  private req: Partial<Request> = {
    headers: {},
    body: {},
    query: {},
    params: {},
  }

  withTenant(tenantId: string) {
    this.req.headers = { ...this.req.headers, 'x-tenant-id': tenantId }
    return this
  }

  withAuth(userId: string, token?: string) {
    this.req.headers = {
      ...this.req.headers,
      authorization: `Bearer ${token ?? 'mock-token'}`,
    }
    this.req.user = { id: userId }
    return this
  }

  withBody(body: Record<string, unknown>) {
    this.req.body = body
    return this
  }

  build() {
    return this.req as Request
  }
}

export function mockRequest() {
  return new ExpressRequestBuilder()
}

export function mockResponse() {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  }
  return res as Response
}
```

---

### 3. Test Helpers

**Auth Helper** (`tests/support/helpers/auth.helper.ts`):
```typescript
import jwt from 'jsonwebtoken'

export function generateTestJWT(userId: string, tenantId: string) {
  return jwt.sign(
    { userId, tenantId, type: 'access' },
    process.env.JWT_SECRET ?? 'test-secret',
    { expiresIn: '1h' }
  )
}

export function createAuthHeaders(userId: string, tenantId: string) {
  return {
    'x-tenant-id': tenantId,
    authorization: `Bearer ${generateTestJWT(userId, tenantId)}`,
  }
}
```

**Database Helper** (`tests/support/helpers/database.helper.ts`):
```typescript
export async function seedTestDatabase() {
  // Seed test tenant, users, accounts
}

export async function cleanupTestDatabase() {
  // Delete all test data
}

export async function resetTestDatabase() {
  // Drop + recreate schema
}
```

---

## 📐 Modernization Plan (Task 31 Implementation)

### Phase 1: Infrastructure (No test changes yet)

**Objective**: Build test support infrastructure without touching existing tests.

**Tasks**:
1. ✅ Fix `coverageThresholds` → `coverageThreshold` typo in jest.config.js
2. ✅ Create `tests/support/` directory structure
3. ✅ Build 6 data factories (User, Account, Contact, Deal, Task, Tenant)
4. ✅ Build Express mock builders (Request, Response)
5. ✅ Build test helpers (auth, database, API)
6. ✅ Add mock index exports for easy imports
7. ✅ Create separate Jest configs (unit, integration)

**Success Criteria**:
- 0/0 invariant maintained
- All existing tests still pass
- New infrastructure ready to use

---

### Phase 2: Unskip Low-Hanging Fruit (3-4 test suites)

**Objective**: Fix easiest skipped tests to prove infrastructure works.

**Targets**:
1. `tests/unit/auth/password-service.test.ts` - Fix bcrypt mocking
2. `tests/unit/metadata/custom-field-service.test.ts` - Fix type errors
3. `tests/errors/error-handler.integration.test.ts` - Use new Express mocks

**Success Criteria**:
- 3 previously skipped suites now passing
- 0/0 invariant maintained
- Coverage increases ~2-3%

---

### Phase 3: Consolidate Duplicate Tests

**Objective**: Remove duplicate test coverage.

**Tasks**:
1. ✅ Move `backend/lib/search/__tests__/es.adapter.spec.ts` → `tests/unit/lib/search/`
2. ✅ Delete backend/__tests__/ copies
3. ✅ Update imports

**Success Criteria**:
- Single source of truth for each test
- No duplicate coverage
- 0/0 invariant maintained

---

### Phase 4: Fix ESLint Errors (157 errors)

**Objective**: Make lint a blocking CI check.

**Tasks**:
1. ✅ Fix unused variable errors (~50 errors)
2. ✅ Fix import ordering (~20 errors)
3. ✅ Fix no-explicit-any warnings (can stay as warnings)
4. ✅ Update `.github/workflows/ci.yml` to make lint blocking

**Success Criteria**:
- ESLint errors: 0 (warnings OK)
- CI lint check is blocking
- 0/0 invariant maintained

---

### Phase 5: Delete Empty Directories

**Objective**: Clean up repo structure.

**Tasks**:
1. ✅ Delete 21 empty test directories (keep parent dirs for future use)
2. ✅ Add `.gitkeep` to directories reserved for future (ai-testing, e2e/playwright)
3. ✅ Update `.gitignore` if needed

**Success Criteria**:
- Clean directory structure
- No orphaned folders
- 0/0 invariant maintained

---

### Phase 6: Unskip Remaining Tests (Incremental)

**Objective**: Gradually unskip remaining 10 test suites.

**Approach**: One suite at a time, fix → verify → commit.

**Targets** (prioritized):
1. `tests/unit/security/input-sanitizer.test.ts`
2. `tests/unit/security/rate-limiter.test.ts`
3. `tests/unit/services/elasticsearch-sync.test.ts` (use mock)
4. `tests/unit/services/queue.test.ts` (use mock)
5. `tests/unit/tasks/task-service.test.ts`
6. `tests/unit/services/auth/sso-provider.service.test.ts`
7. `tests/integration/auth/tenant-guard.spec.ts`
8. `tests/integration/auth/auth-flow.test.ts`
9. `tests/errors/registry.contract.test.ts`
10. `tests/security/rls-tests.spec.ts` (requires DB setup)

**Success Criteria** (per suite):
- Suite unskipped and passing
- 0/0 invariant maintained
- Coverage increases 1-2% per suite

---

### Phase 7: Coverage Target (Stretch Goal)

**Objective**: Reach 85%+ coverage.

**Approach**:
- Add tests for untested services (47 services have no tests)
- Add tests for controllers (5 controllers, 0 tests)
- Add tests for middleware (~10 modules, 0 tests)

**Success Criteria**:
- Coverage: 85%+
- 0/0 invariant maintained
- All critical paths tested

---

## 📋 Task 31 Checklist (Implementation)

### Branch Setup
- [ ] Create branch: `test/modernize-infrastructure`

### Phase 1: Infrastructure
- [ ] Fix `coverageThresholds` → `coverageThreshold` in jest.config.js
- [ ] Create `tests/support/` directory structure
- [ ] Create 6 data factories
- [ ] Create Express mock builders
- [ ] Create auth helper
- [ ] Create database helper
- [ ] Create API helper
- [ ] Create mock index exports
- [ ] Create `jest.config.unit.js`
- [ ] Create `jest.config.integration.js`
- [ ] Run tests → verify 0/0 maintained

### Phase 2: Unskip Easy Tests
- [ ] Fix `password-service.test.ts`
- [ ] Fix `custom-field-service.test.ts`
- [ ] Fix `error-handler.integration.test.ts`
- [ ] Run tests → verify all pass

### Phase 3: Consolidate Duplicates
- [ ] Move ES adapter test to tests/unit/lib/search/
- [ ] Delete backend/__tests__/ copies
- [ ] Run tests → verify no regressions

### Phase 4: Fix ESLint
- [ ] Fix all 157 ESLint errors
- [ ] Update CI workflow (remove continue-on-error from lint job)
- [ ] Run lint → verify 0 errors

### Phase 5: Clean Up
- [ ] Delete 21 empty test directories
- [ ] Add .gitkeep to future-use dirs
- [ ] Commit cleanup

### Phase 6: Unskip Remaining (Incremental)
- [ ] Unskip test suite 1 → commit
- [ ] Unskip test suite 2 → commit
- [ ] ... (repeat for all 10)

### Final Verification
- [ ] Run `npm run typecheck` → 0 errors
- [ ] Run `npm run lint` → 0 errors
- [ ] Run `npm test` → 0 failures
- [ ] Check coverage → report percentage
- [ ] Commit and push
- [ ] Create PR

---

## 📈 Expected Outcomes

### Before Task 31
- Test coverage: 32%
- Skipped suites: 13
- Empty directories: 21
- ESLint errors: 157
- Lint: Non-blocking in CI
- Test infrastructure: Minimal

### After Task 31 (Minimum)
- Test coverage: **40-45%** (↑8-13%)
- Skipped suites: **<5** (↓8+)
- Empty directories: **0** (↓21)
- ESLint errors: **0** (↓157)
- Lint: **Blocking in CI** ✅
- Test infrastructure: **Production-grade** ✅

### After Task 31 (Stretch)
- Test coverage: **85%+** (↑53%)
- Skipped suites: **0** (↓13)
- All services tested ✅
- All controllers tested ✅
- All middleware tested ✅

---

## 🎯 Success Criteria

1. ✅ **0/0 Invariant Maintained**
   - TypeScript errors: 0
   - Test failures: 0

2. ✅ **Lint Becomes Blocking**
   - ESLint errors: 0
   - CI blocks merges on lint failure

3. ✅ **Test Infrastructure Complete**
   - 6+ data factories
   - Express mock builders
   - Auth/DB/API helpers
   - Separate unit/integration configs

4. ✅ **Reduced Skipped Tests**
   - Target: <5 skipped (from 13)
   - Minimum: 3 unskipped

5. ✅ **Clean Repository Structure**
   - 0 empty directories
   - 0 duplicate test files
   - Consistent test organization

6. ✅ **Coverage Improvement**
   - Minimum: 40%+ (↑8%)
   - Target: 85%+ (↑53%)

---

## 🔗 Related Documents

- [CI Hard Gate (Task 29)](../.github/workflows/ci.yml)
- [Jest Configuration](../jest.config.js)
- [Current Test Directory](../tests/)

---

## 📝 Notes

- **Priority**: Test infrastructure first, then unskip tests
- **Safety**: Commit after each phase to preserve progress
- **Coverage**: Incremental improvement, don't block on 85%
- **Timeline**: Phase 1-5 are critical, Phase 6-7 are iterative

---

**Next Step**: Execute **Task 31** using this blueprint.

