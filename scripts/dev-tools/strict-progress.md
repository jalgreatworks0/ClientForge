# TypeScript Strict Mode Migration Progress

## Current Status: Pass 1 Complete ✅

**Phase**: 2/6 - AuthRequest Interface Alignment + Property Fixes  
**Branch**: `fix/strict-errors-pass1`  
**Commit**: `8722281`  
**Date**: 2025-11-12

---

## Error Reduction Progress

| Phase | Starting Errors | Ending Errors | Fixed | % Reduction | Status |
|-------|----------------|---------------|-------|-------------|--------|
| **Baseline** | 309 | 309 | 0 | 0% | ✅ Complete |
| **Phase 1** | 309 | 172 | 137 | 44% | ✅ Complete |
| **Pass 1** | 173 | 161 | 12 | 7% | ✅ Complete |
| **Total Progress** | 309 | 161 | 148 | **48%** | 🔄 In Progress |

---

## Pass 1 Fixes (12 Errors Fixed)

### 1. AuthRequest Type Enhancement ✅
**File**: `backend/middleware/auth.ts:14-22`  
**Problem**: Route handlers used `req.user.userId` but AuthRequest only had `id`  
**Solution**: Added `userId` field to support both naming conventions

```typescript
// Before
export interface AuthRequest extends Request {
  user?: {
    id: string;        // ❌ Only id field
    email: string;
    tenantId: string;
    role?: string;
    permissions?: string[];
  }
}

// After
export interface AuthRequest extends Request {
  user?: {
    id: string;          // ✅ Keep for Express compatibility
    userId: string;      // ✅ Add for legacy code
    email: string;
    tenantId: string;
    role?: string;
    permissions?: string[];
  }
}
```

**Errors Fixed**: All "Property 'userId' does not exist" errors (8 occurrences)

---

### 2. Authenticate Middleware Alignment ✅
**File**: `backend/middleware/authenticate.ts:43-49`  
**Problem**: Middleware populated fields not in AuthRequest type  
**Solution**: Aligned with AuthRequest interface, removed deprecated fields

```typescript
// Before
req.user = {
  id: user.id,
  userId: user.id,      // ❌ Not in type
  email: user.email,
  tenantId: user.tenantId,
  roleId: user.roleId,  // ❌ Deprecated
  jti: token.jti,       // ❌ Not in type
};

// After
req.user = {
  id: user.id,
  userId: user.id,      // ✅ Now in type
  email: user.email,
  tenantId: user.tenantId,
  role: user.role,      // ✅ Use role, not roleId
  permissions: user.permissions,
};
```

**Errors Fixed**: 2 occurrences (authenticate + optionalAuthenticate)

---

### 3. JWT Validator Middleware ✅
**File**: `backend/middleware/auth/jwt-validator.ts:340-346`  
**Problem**: User object creation misaligned with AuthRequest type  
**Solution**: Fixed property assignments

```typescript
// After
req.user = {
  id: payload.sub,
  userId: payload.sub,
  email: payload.email,
  tenantId: payload.tenant_id,
  role: payload.role,
  permissions: payload.permissions,
};
```

**Errors Fixed**: 1 occurrence

---

### 4. Tenant Filter Middleware ✅
**File**: `backend/middleware/search/tenant-filter.middleware.ts`  
**Problem**: Wrong property name used  
**Solution**: `tenant_id` → `tenantId`

```typescript
// Before
const tenantId = req.user?.tenant_id;  // ❌ Wrong property name

// After
const tenantId = req.user?.tenantId;   // ✅ Correct property name
```

**Errors Fixed**: 2 occurrences

---

### 5. Redis Cache Service ✅
**File**: `backend/utils/caching/cache-service.ts`  
**Problem**: IORedis method name typos  
**Solution**: Fixed method names to match IORedis API

```typescript
// Before
await redis.setex(key, ttl, value);  // ❌ Wrong method name
const size = await redis.dbsize();   // ❌ Wrong method name

// After
await redis.setEx(key, ttl, value);  // ✅ Correct (camelCase)
const size = await redis.dbSize();   // ✅ Correct (camelCase)
```

**Errors Fixed**: 4 occurrences (3 setex + 1 dbsize)

---

## Remaining Issues (161 Errors)

### Error Category Breakdown

| Category | Count | % of Total | Priority |
|----------|-------|-----------|----------|
| Dunning Service Template Strings | 12 | 7% | High 🔴 |
| OAuth Provider Unknown Properties | 20+ | 12% | Medium 🟡 |
| Missing Module Declarations | 15 | 9% | Medium 🟡 |
| Module Type Mismatches | 3 | 2% | Low 🟢 |
| Route Handler Type Issues | 80+ | 50% | High 🔴 |
| Misc Property/Type Errors | 31 | 19% | Medium 🟡 |

---

## Top Error Files (Remaining)

| File | Errors | Primary Issue |
|------|--------|---------------|
| `backend/services/billing/dunning.service.ts` | 12 | Undefined variables in template strings |
| `backend/services/auth/sso/google-oauth.provider.ts` | 10 | Unknown type properties |
| `backend/services/auth/sso/microsoft-oauth.provider.ts` | 10 | Unknown type properties |
| `backend/api/rest/v1/routes/sso-routes.ts` | 15 | Route handler types |
| `backend/api/rest/v1/routes/contacts-routes.ts` | 12 | Route handler types |
| `backend/api/rest/v1/routes/accounts-routes.ts` | 12 | Route handler types |
| `backend/api/rest/v1/routes/deals-routes.ts` | 11 | Route handler types |

---

## Detailed Error Analysis

### 🔴 High Priority: Dunning Service (12 errors)

**File**: `backend/services/billing/dunning.service.ts`

**Problem**: Template string variables not defined in scope

```typescript
// Example error:
Cannot find name 'invoiceNumber'. Did you mean 'invoice'?
Cannot find name 'daysOverdue'.
Cannot find name 'amount'.
```

**Solution Needed**: Define variables before using in template strings or extract from objects

**Estimated Time**: 15 minutes

---

### 🟡 Medium Priority: OAuth Providers (20+ errors)

**Files**: 
- `backend/services/auth/sso/google-oauth.provider.ts`
- `backend/services/auth/sso/microsoft-oauth.provider.ts`

**Problem**: Unknown properties in OAuth response types

```typescript
// Example error:
Property 'given_name' does not exist on type 'OAuth2Client'.
Property 'family_name' does not exist on type 'Profile'.
```

**Solution Needed**: Create proper TypeScript interfaces for OAuth responses

```typescript
interface GoogleUserInfo {
  sub: string;
  email: string;
  given_name: string;
  family_name: string;
  picture?: string;
}
```

**Estimated Time**: 30 minutes

---

### 🟡 Medium Priority: Missing Module Declarations (15 errors)

**Problem**: TypeScript can't find type definitions

```typescript
// Example errors:
Cannot find module '@opentelemetry/api' or its corresponding type declarations.
Cannot find module '@sentry/node' or its corresponding type declarations.
```

**Solution Needed**: 
1. Install missing `@types/*` packages
2. Add module declarations in `backend/types/modules.d.ts`

```typescript
declare module '@opentelemetry/api' {
  // Add basic type definitions
}
```

**Estimated Time**: 20 minutes

---

### 🔴 High Priority: Route Handler Types (80+ errors)

**Problem**: Route handlers still have implicit `any` types or parameter mismatches

**Examples**:
- `sso-routes.ts`: 15 errors
- `contacts-routes.ts`: 12 errors
- `accounts-routes.ts`: 12 errors

**Solution Needed**: Add explicit types to all route handlers

```typescript
// Before
router.get('/api/contacts', async (req, res) => {  // ❌ Implicit any
  const contacts = await getContacts(req.user.tenantId);
  res.json(contacts);
});

// After
router.get('/api/contacts', async (req: AuthRequest, res: Response) => {  // ✅ Explicit types
  const contacts = await getContacts(req.user!.tenantId);
  res.json(contacts);
});
```

**Estimated Time**: 2-3 hours (many files)

---

## Next Pass Recommendations

### Option 1: Quick Wins 🎯 (Recommended)
**Target**: Fix dunning.service.ts + OAuth providers  
**Estimated Time**: 45 minutes  
**Expected Reduction**: ~32 errors → ~129 errors remaining

**Why**: These are isolated issues that don't cascade across codebase

---

### Option 2: Route Handler Marathon 🏃
**Target**: Fix all route handler type issues  
**Estimated Time**: 2-3 hours  
**Expected Reduction**: ~80 errors → ~81 errors remaining

**Why**: Addresses 50% of remaining errors in one focused effort

---

### Option 3: Module Declarations 📦
**Target**: Install missing types + add declarations  
**Estimated Time**: 20 minutes  
**Expected Reduction**: ~15 errors → ~146 errors remaining

**Why**: Quick wins that enable better IDE autocomplete

---

## Migration Phases Overview

| Phase | Focus | Target Errors | Status |
|-------|-------|---------------|--------|
| **Baseline** | Initial state | 309 | ✅ Complete |
| **Phase 1** | Safe flags enabled | 309 | ✅ Complete |
| **Phase 2 (Pass 1)** | AuthRequest alignment | 161 | ✅ Complete |
| **Phase 2 (Pass 2)** | Quick wins (dunning + OAuth) | ~129 | 📋 Next |
| **Phase 2 (Pass 3)** | Module declarations | ~114 | 📋 Planned |
| **Phase 3** | Route handler types | ~34 | 📋 Planned |
| **Phase 4** | Misc type fixes | 0 | 📋 Planned |
| **Phase 5** | Enable `strictNullChecks` | TBD | 📋 Future |
| **Phase 6** | Full strict mode | 0 | 🎯 Goal |

---

## Commands

### Check Current Error Count
```bash
npm run type-check 2>&1 | grep "Found" | tail -1
# Expected: Found 161 errors in XX files.
```

### View Errors by File
```bash
npm run type-check 2>&1 | grep "error TS" | cut -d: -f1 | sort | uniq -c | sort -rn | head -20
```

### Run CI Verification
```bash
npm run ci:verify
```

---

## Timeline Estimate

**Conservative**: 8-10 hours to zero errors  
**Optimistic**: 5-6 hours to zero errors  
**Realistic**: 6-8 hours spread over 3-4 days

---

## Success Metrics

- ✅ **Pass 1**: 161 errors (48% reduction from baseline)
- 🎯 **Pass 2 Target**: ~129 errors (58% reduction)
- 🎯 **Pass 3 Target**: ~114 errors (63% reduction)
- 🎯 **Pass 4 Target**: ~34 errors (89% reduction)
- 🎯 **Final Goal**: 0 errors (100% reduction)

---

## Related ADRs

- [ADR-0002: TypeScript Strict Mode Migration](/docs/architecture/decisions/ADR-0002-typescript-strict-mode.md)
- [ADR-0003: AuthRequest Interface Alignment](/docs/architecture/decisions/ADR-0003-authrequest-interface-alignment.md)
- [ADR-0010: Minimal CI/CD Pipeline](/docs/architecture/decisions/ADR-0010-minimal-ci-cd-pipeline.md)

---

## Notes

- All fixes maintain backward compatibility
- No runtime behavior changes
- Build continues to work with `noEmitOnError: false`
- CI pipeline catches regressions automatically
- Progress tracked in this file + Git commits
