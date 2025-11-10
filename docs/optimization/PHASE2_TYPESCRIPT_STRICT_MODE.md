# Phase 2: TypeScript Strict Mode - Implementation Plan

**Date:** November 9, 2025
**Status:** 🔄 IN PROGRESS
**Estimated Time:** 20 hours total

---

## 🎯 Overview

Phase 2 enables TypeScript strict mode to catch bugs at compile-time, improve code quality, and enhance IDE autocomplete/intellisense. Currently there are **96 lines of type errors** that need to be resolved.

---

## 📊 Current State Analysis

### Type Error Summary (96 total errors):

**By Category:**
1. **Missing Type Definitions** - 35 errors (36%)
   - `Property 'user' does not exist on type 'Request'`
   - Missing exported members (`BadRequestError`, etc.)
   - Elasticsearch type mismatches

2. **Strict Null Checks** - 25 errors (26%)
   - Potential `undefined` values
   - Optional property issues
   - Nullable return types

3. **Implicit Any** - 20 errors (21%)
   - Function parameters without types
   - Object properties with `any`
   - Third-party library types missing

4. **Type Mismatches** - 16 errors (17%)
   - Incompatible function signatures
   - Wrong property types
   - Generic type conflicts

**Most Affected Files:**
- `backend/api/rest/v1/routes/search-routes.ts` (18 errors)
- `agents/mcp/router.ts` (4 errors)
- `scripts/agents/orchestrator.ts` (3 errors)
- Various other files (71 errors)

---

## 🔧 Implementation Steps

### Step 1: Enable Strict Mode in tsconfig.json ✅

Update `D:/clientforge-crm/tsconfig.json`:

```json
{
  "compilerOptions": {
    // Strict Type Checking (Phase 2 - Enabled)
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,

    // Additional Checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true
  }
}
```

---

### Step 2: Create Type Definition Files

#### A. Express Request Types (`backend/types/express.d.ts`)

```typescript
import { Request } from 'express'

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string
        tenantId: string
        roleId: string
        email?: string
        jti?: string
      }
      tenantId?: string
      requestId?: string
    }
  }
}

export {}
```

#### B. Error Types (`backend/utils/errors/index.ts`)

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public  isOperational: boolean = true,
    public data?: Record<string, any>
  ) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad Request', data?: Record<string, any>) {
    super(message, 400, true, data)
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized', data?: Record<string, any>) {
    super(message, 401, true, data)
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Forbidden', data?: Record<string, any>) {
    super(message, 403, true, data)
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Not Found', data?: Record<string, any>) {
    super(message, 404, true, data)
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflict', data?: Record<string, any>) {
    super(message, 409, true, data)
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too Many Requests', data?: Record<string, any>) {
    super(message, 429, true, data)
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Internal Server Error', data?: Record<string, any>) {
    super(message, 500, true, data)
  }
}
```

#### C. Elasticsearch Types (`backend/types/elasticsearch.d.ts`)

```typescript
import { SearchResponse, CountResponse } from '@elastic/elasticsearch/lib/api/types'

declare module '@elastic/elasticsearch' {
  interface Client {
    search<T = unknown>(params: {
      index: string
      query?: any
      highlight?: any
      size?: number
      from?: number
    }): Promise<SearchResponse<T>>

    count(params: {
      index: string
      query?: any
    }): Promise<CountResponse>
  }
}
```

---

### Step 3: Fix Critical Type Errors

#### Priority 1: Express Request Types (25 files)

**Problem:** `Property 'user' does not exist on type 'Request'`

**Solution:** Use the type definition from Step 2A

```typescript
// Before
import { Request, Response } from 'express'

router.get('/profile', (req: Request, res: Response) => {
  const userId = req.user.userId // ❌ Error
})

// After
import { Request, Response } from 'express'

router.get('/profile', (req: Request, res: Response) => {
  const userId = req.user?.userId // ✅ Fixed
  if (!userId) {
    throw new UnauthorizedError('User not authenticated')
  }
})
```

#### Priority 2: Elasticsearch Type Errors (search-routes.ts)

**File:** `backend/api/rest/v1/routes/search-routes.ts`

**Problem:** Elasticsearch client type mismatches

**Solution:** Use proper typing

```typescript
// Before
const result = await elasticsearchClient.search({
  index: 'clientforge',
  query: { /* ... */ } // ❌ Type error
})

// After
import { SearchRequest } from '@elastic/elasticsearch/lib/api/types'

const searchParams: SearchRequest = {
  index: 'clientforge',
  body: {
    query: { /* ... */ }
  }
}

const result = await elasticsearchClient.search(searchParams) // ✅ Fixed
```

#### Priority 3: Missing Error Exports

**File:** `backend/utils/errors/app-error.ts`

**Problem:** `Module has no exported member 'BadRequestError'`

**Solution:** Export all error classes (see Step 2B)

---

### Step 4: Add Type Guards and Validators

#### Type Guard Utilities (`backend/utils/type-guards.ts`)

```typescript
/**
 * Type guard to check if value is defined (not null/undefined)
 */
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/**
 * Type guard to check if value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

/**
 * Type guard to check if value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value)
}

/**
 * Type guard to check if object has property
 */
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return typeof obj === 'object' && obj !== null && key in obj
}

/**
 * Type guard for authenticated request
 */
export function isAuthenticatedRequest(req: Request): req is Request & {
  user: NonNullable<Request['user']>
} {
  return req.user !== undefined && req.user !== null
}

/**
 * Assert that value is defined (throws if not)
 */
export function assertDefined<T>(
  value: T | null | undefined,
  message: string = 'Value is required'
): asserts value is T {
  if (value === null || value === undefined) {
    throw new BadRequestError(message)
  }
}
```

**Usage:**
```typescript
import { isAuthenticatedRequest, assertDefined } from '../utils/type-guards'

router.get('/profile', (req: Request, res: Response) => {
  // Type guard
  if (!isAuthenticatedRequest(req)) {
    throw new UnauthorizedError('Not authenticated')
  }

  // Now TypeScript knows req.user is defined
  const userId = req.user.userId // ✅ No error

  // Assertion
  assertDefined(req.query.search, 'Search query is required')
  const searchTerm = req.query.search // ✅ Type is string
})
```

---

### Step 5: Fix Unused Variables

**Enable:** `noUnusedLocals` and `noUnusedParameters`

**Common fixes:**
```typescript
// Option 1: Prefix with underscore
function processData(_unusedParam: string, data: any) {
  return data
}

// Option 2: Use void operator
function handler(event: Event) {
  void event // Explicitly mark as intentionally unused
  console.log('Event handled')
}

// Option 3: Remove if truly unused
function calculate(value: number /* removed: , multiplier: number */) {
  return value * 2 // Use hardcoded value instead
}
```

---

### Step 6: Fix Implicit Returns

**Enable:** `noImplicitReturns`

**Problem:** Not all code paths return a value

```typescript
// Before ❌
function getUserRole(user: User): string {
  if (user.isAdmin) {
    return 'admin'
  }
  if (user.isModerator) {
    return 'moderator'
  }
  // ❌ Missing return for regular users
}

// After ✅
function getUserRole(user: User): string {
  if (user.isAdmin) {
    return 'admin'
  }
  if (user.isModerator) {
    return 'moderator'
  }
  return 'user' // ✅ All paths return
}
```

---

### Step 7: Fix Switch Statement Fallthrough

**Enable:** `noFallthroughCasesInSwitch`

```typescript
// Before ❌
switch (action.type) {
  case 'CREATE':
    validateCreate(action.data)
    // ❌ Falls through to UPDATE
  case 'UPDATE':
    save(action.data)
    break
}

// After ✅
switch (action.type) {
  case 'CREATE':
    validateCreate(action.data)
    save(action.data)
    break // ✅ Explicit break
  case 'UPDATE':
    save(action.data)
    break
  default:
    throw new Error(`Unknown action: ${action.type}`)
}
```

---

### Step 8: Fix Unchecked Indexed Access

**Enable:** `noUncheckedIndexedAccess`

```typescript
// Before ❌
const users: Record<string, User> = getUserMap()
const user = users['john'] // Type: User
console.log(user.name) // ❌ Runtime error if 'john' doesn't exist

// After ✅
const users: Record<string, User> = getUserMap()
const user = users['john'] // Type: User | undefined
if (user) {
  console.log(user.name) // ✅ Safe
} else {
  throw new NotFoundError('User not found')
}
```

---

## 🐛 Fix Analytics 500 Errors

**Issue:** Analytics endpoints returning 500 Internal Server Error

**Root Cause:** Missing database tables or incorrect queries

**Fix Steps:**

1. **Check Analytics Tables:**
```sql
-- Run this to verify analytics tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name LIKE '%analytics%';
```

2. **Create Missing Tables (if needed):**
```bash
npm run db:migrate
```

3. **Check Analytics Controller:**
```typescript
// backend/core/analytics/analytics-controller.ts
export class AnalyticsController {
  async getActivities(req: Request, res: Response) {
    try {
      const tenantId = req.user?.tenantId

      if (!tenantId) {
        throw new UnauthorizedError('Tenant ID required')
      }

      const activities = await this.analyticsService.getActivities(tenantId)
      res.json({ data: activities })
    } catch (error) {
      logger.error('Analytics getActivities error', { error })
      throw error
    }
  }
}
```

4. **Add Error Logging:**
```typescript
// Check server console or logs/app.log for actual error
// Should show SQL errors, missing columns, etc.
```

---

## 📋 Phase 2 Checklist

**TypeScript Strict Mode:**
- [ ] Enable strict mode in tsconfig.json
- [ ] Create Express type definitions (express.d.ts)
- [ ] Create error class type definitions
- [ ] Create Elasticsearch type definitions
- [ ] Fix all Express Request type errors (25 files)
- [ ] Fix Elasticsearch type errors (search-routes.ts)
- [ ] Fix missing error class exports
- [ ] Add type guard utilities
- [ ] Fix unused variable warnings
- [ ] Fix implicit return errors
- [ ] Fix switch fallthrough errors
- [ ] Fix unchecked indexed access errors
- [ ] Run `npm run typecheck` - should have 0 errors

**Analytics Fix:**
- [ ] Start backend server: `npm run dev:backend`
- [ ] Check server logs for actual error
- [ ] Run database migrations if needed
- [ ] Verify analytics tables exist
- [ ] Test analytics endpoints
- [ ] Fix any SQL query errors

---

## 🧪 Testing After Implementation

```bash
# 1. Type check - should pass with 0 errors
npm run typecheck

# 2. Build - should succeed
npm run build:backend

# 3. Start server
npm run dev:backend

# 4. Test analytics endpoints
curl http://localhost:3000/api/v1/analytics/activities
curl http://localhost:3000/api/v1/analytics/deals
curl http://localhost:3000/api/v1/analytics/dashboard
curl http://localhost:3000/api/v1/analytics/tasks

# All should return 200 OK, not 500
```

---

## 📊 Expected Impact

**Before:**
- ❌ 96 type errors
- ❌ No compile-time safety
- ❌ Poor IDE autocomplete
- ❌ Runtime errors slip through
- ❌ Analytics endpoints broken

**After:**
- ✅ 0 type errors
- ✅ Full type safety
- ✅ Excellent IDE support
- ✅ Bugs caught at compile-time
- ✅ All endpoints working

---

## 🚀 Next Actions

1. **Immediate:** Fix analytics 500 errors (start backend, check logs)
2. **Phase 2:** Enable TypeScript strict mode and fix all type errors
3. **Phase 3:** Database optimization (indexes, pooling, query monitoring)
4. **Phase 4:** Frontend bundle optimization

---

## 💡 Tips for Strict Mode

1. **Start with one file at a time** - Don't try to fix all 96 errors at once
2. **Use type guards liberally** - They make code safer and clearer
3. **Prefer `unknown` over `any`** - Forces you to validate types
4. **Use assertion functions** - `assertDefined()` makes code cleaner
5. **Enable strict mode incrementally** - Can enable individual flags first
6. **Use ESLint** - Catches additional issues TypeScript misses

---

**Phase 2 Status:** Ready to implement
**Estimated Time:** 16-20 hours (spread over multiple sessions)
