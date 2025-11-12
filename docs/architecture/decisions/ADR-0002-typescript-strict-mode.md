# ADR-0002: TypeScript Strict Mode Migration Strategy

**Status**: Accepted  
**Date**: 2025-11-12  
**Deciders**: Engineering Team, OverLord  
**Technical Story**: Phase 1 Complete - Branch `feat/strict-phase1`

---

## Context

ClientForge-CRM backend codebase has grown to 340+ API endpoints without TypeScript strict mode enabled. This results in hidden type safety issues that can surface as runtime errors. Enabling all strict flags at once would produce hundreds of errors blocking development.

**Current State**:
- TypeScript configured with lenient settings
- Implicit `any` types throughout codebase
- Weak type checking on function parameters
- No enforcement of strict null checks

**Desired State**:
- Full TypeScript strict mode (`"strict": true`)
- Zero implicit `any` types
- Strong type safety across all modules
- Gradual migration without blocking development

---

## Decision

We will **incrementally enable TypeScript strict mode flags** over 5 phases, starting with the lowest-risk flags and progressively addressing errors before enabling stricter checks.

### Migration Strategy: Phased Rollout

#### Phase 1: Safe Strict Flags ✅ **COMPLETE**
**Branch**: `feat/strict-phase1`  
**Commit**: `cd8c7ea`  
**Status**: Ready for review and merge

**Flags Enabled**:
```json
{
  "noImplicitAny": true,
  "noImplicitThis": true,
  "strictBindCallApply": true,
  "alwaysStrict": true
}
```

**Impact**:
- ✅ 309 type errors now visible (previously hidden)
- ✅ Build continues to work (`noEmitOnError: false`)
- ✅ No runtime impact
- ✅ Progress tracking document created at `scripts/dev-tools/strict-progress.md`

**Error Baseline**:
| Error Code | Description | Count | % |
|------------|-------------|-------|---|
| TS2769 | No overload matches this call | 177 | 57% |
| TS2339 | Property does not exist on type | 35 | 11% |
| TS2307 | Cannot find module | 25 | 8% |
| TS2559 | Type has no properties in common | 18 | 6% |
| TS2304 | Cannot find name | 16 | 5% |
| TS2551 | Property does not exist (typo) | 15 | 5% |
| TS2345 | Argument not assignable | 12 | 4% |
| Other | Various | 11 | 4% |
| **Total** | | **309** | **100%** |

**Top 5 Files Requiring Attention**:
1. `backend/api/rest/v1/routes/sso-routes.ts` - 18 errors
2. `backend/services/billing/dunning.service.ts` - 16 errors
3. `backend/api/rest/v1/routes/contacts-routes.ts` - 15 errors
4. `backend/api/rest/v1/routes/activity-timeline-routes.ts` - 15 errors
5. `backend/api/rest/v1/routes/accounts-routes.ts` - 15 errors

#### Phase 2: Fix AuthRequest Interface (Target: -57% errors)
**Status**: Planned  
**Priority**: High (resolves 177/309 errors)

**Root Cause Analysis**:
The dominant error (TS2769 - 57% of all errors) stems from `AuthRequest` interface incompatibility with Express.js types.

**Current Mismatch**:
```typescript
// Express.Request expects:
interface Request {
  user?: {
    id: string;
    email: string;
    tenantId: string;
  }
}

// AuthRequest declares:
interface AuthRequest extends Request {
  user: {
    userId: string;      // ❌ Should be 'id'
    tenantId: string;    // ✅ Matches
    roleId: string;      // ❌ Extra property
    // Missing 'email'
  }
}
```

**Resolution Steps**:
1. Align `AuthRequest.user` with Express conventions
2. Update all route handlers to use `req.user.id` instead of `req.user.userId`
3. Add type guards for user property access
4. Consider extending with discriminated unions for role-based properties

#### Phase 3: Add Explicit Types (Target: -20% errors)
**Status**: Planned  
**Priority**: Medium

**Actions**:
- Add parameter types to all route handlers
- Fix implicit `any` in callbacks and event handlers
- Add return types to async functions
- Document complex type unions

#### Phase 4: Module Resolution (Target: -8% errors)
**Status**: Planned  
**Priority**: Medium

**Actions**:
- Install missing `@types` packages:
  - `@types/js-yaml`
  - `@opentelemetry` type definitions
- Fix path alias resolution issues
- Add `.d.ts` declarations for untyped modules

#### Phase 5: Property Access & Strict Null Checks (Target: -15% errors)
**Status**: Planned  
**Priority**: Low (after core fixes)

**Actions**:
- Fix property name typos (`setex` → `setEx`, `dbsize` → `dbSize`)
- Update deprecated API usages
- Add optional chaining where needed
- Enable `strictNullChecks` flag

#### Phase 6: Full Strict Mode
**Status**: Future  
**Priority**: After Phases 2-5 complete

**Final Flag**:
```json
{
  "strict": true  // Enables all strict mode checks
}
```

---

## Consequences

### Positive

- **Improved Type Safety**: Catches type errors at compile time instead of runtime
- **Better IDE Support**: Enhanced autocomplete and inline documentation
- **Reduced Bugs**: Prevents common JavaScript pitfalls (null reference errors, type coercion)
- **Easier Refactoring**: Type system enforces contract integrity during changes
- **Developer Confidence**: Clear contracts between modules

### Neutral

- **Increased Visibility**: 309 errors now visible in IDE (previously hidden)
- **Learning Curve**: Developers must understand TypeScript strict semantics
- **Initial Overhead**: Time investment to fix existing type issues

### Negative (Mitigated)

- **Build Complexity**: More strict compilation rules (mitigated by phased approach)
- **Development Friction**: More red squiggles during development (mitigated by `noEmitOnError: false`)
- **Migration Time**: Several weeks to complete all phases (mitigated by not blocking other work)

---

## Progress Tracking

### Automation
- **Tool**: `scripts/dev-tools/strict-progress.md`
- **Command**: `npm run type-check` (runs `tsc --noEmit`)
- **Metrics**: Error count by type, file distribution, percentage complete

### Success Criteria
- ✅ Phase 1: Flags enabled, baseline documented
- ⏳ Phase 2: TS2769 errors reduced to <50
- ⏳ Phase 3: Implicit `any` usage reduced to <10
- ⏳ Phase 4: Module resolution errors = 0
- ⏳ Phase 5: Property access errors = 0
- ⏳ Phase 6: Zero TypeScript errors with `strict: true`

### Review Cadence
- Weekly progress review in engineering sync
- Update `strict-progress.md` after each phase
- Celebrate milestones (50% error reduction, first clean module, etc.)

---

## Implementation Notes

### Build System Configuration

```json
// backend/tsconfig.json
{
  "compilerOptions": {
    "noEmitOnError": false,  // ⚠️ Allows build despite errors
    "skipLibCheck": true,    // Performance optimization
    // Phase 1 flags:
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictBindCallApply": true,
    "alwaysStrict": true
  }
}
```

**Critical**: `noEmitOnError: false` ensures the build continues to produce JavaScript output even with type errors. This allows:
- ✅ Development server to run
- ✅ Production builds to complete
- ✅ CI/CD pipeline to pass
- ⚠️ Type errors are warnings, not blockers

### Developer Workflow

1. **Before Committing**: Run `npm run type-check` to see type errors
2. **During Development**: IDE shows errors inline (red squiggles)
3. **After Phase 2**: Most route-related errors should disappear
4. **Incrementally Fix**: Pick files from `strict-progress.md` top offenders list

---

## References

- [TypeScript Strict Mode Documentation](https://www.typescriptlang.org/tsconfig#strict)
- [Express.js TypeScript Types](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/express)
- Progress Tracker: `scripts/dev-tools/strict-progress.md`
- Feature Branch: `feat/strict-phase1`
- Commit: `cd8c7ea` - chore(ts): enable safe strict flags (Phase 1)

---

## Revision History

| Date | Phase | Status | Errors Remaining |
|------|-------|--------|------------------|
| 2025-11-12 | Phase 1 | ✅ Complete | 309 |
| TBD | Phase 2 | Planned | ~132 (target) |
| TBD | Phase 3 | Planned | ~70 (target) |
| TBD | Phase 4 | Planned | ~45 (target) |
| TBD | Phase 5 | Planned | 0 (target) |
