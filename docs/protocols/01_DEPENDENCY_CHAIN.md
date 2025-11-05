# 🔗 Dependency Chain Awareness Protocol

**P1 ESSENTIAL**: Prevent Breaking Changes

---

## Core Principle

**Every file change can break other files. Check FIRST.**

Before modifying ANY file, trace its dependency chain and update all dependents.

---

## 4-Step Protocol

### Step 1: Find Downstream Dependencies (30 seconds)

**Question**: Who imports/uses this file?

```bash
# Find all files that import this file
grep -r 'from.*[filename]' --include='*.ts' --include='*.tsx'
grep -r 'import.*[filename]' --include='*.ts' --include='*.tsx'
grep -r 'require.*[filename]' --include='*.js'
```

**Action**: List all files that will be affected by your changes

### Step 2: Find Upstream Dependencies (10 seconds)

**Question**: What does this file import/use?

```bash
# Check imports at top of file
head -n 50 [filename] | grep -E '^import|^from'
```

**Action**: List all dependencies this file has

### Step 3: Assess Breaking Change Risk (20 seconds)

#### HIGH RISK Changes:
- Function signature changed (parameters/return type)
- Interface/type definition changed
- Export removed or renamed
- File moved to different location

**Action**: Update ALL downstream files immediately

#### MEDIUM RISK Changes:
- Function implementation changed (same signature)
- New required parameter added
- Default behavior changed

**Action**: Update affected files, add deprecation notice

#### LOW RISK Changes:
- Internal function changed (not exported)
- Comments/documentation updated
- Optional parameter added

**Action**: Verify no side effects, run smoke tests

### Step 4: Update All Dependents (5-30 minutes)

#### For HIGH RISK Changes:
1. Update ALL downstream files immediately
2. Run ALL affected tests
3. Update documentation
4. Create migration guide if public API

#### For MEDIUM RISK Changes:
1. Update affected files
2. Run related tests
3. Add deprecation notice if needed

#### For LOW RISK Changes:
1. Verify no side effects
2. Run basic smoke tests

---

## Breaking Change Detection Examples

### Example 1: Function Signature Change

**BEFORE:**
```typescript
function calculateDiscount(price: number): number {
  return price * 0.1
}
```

**AFTER:**
```typescript
function calculateDiscount(price: number, percentage: number): number {
  return price * (percentage / 100)
}
```

**Breaking**: YES - new required parameter

**Actions Required:**
```bash
# Find all callers
grep -r 'calculateDiscount' --include='*.ts'

# Update each caller with new parameter
# OR make parameter optional with default value:
function calculateDiscount(price: number, percentage: number = 10): number
```

---

### Example 2: Interface Change

**BEFORE:**
```typescript
interface User {
  id: string
  name: string
}
```

**AFTER:**
```typescript
interface User {
  id: string
  name: string
  email: string
}
```

**Breaking**: YES if email is required

**Actions Required:**
```bash
# Find all implementations
grep -r 'implements User' --include='*.ts'

# Find all usages
grep -r ': User' --include='*.ts'

# Update all instances OR make email optional
interface User {
  id: string
  name: string
  email?: string
}
```

---

### Example 3: Export Removed

**BEFORE:**
```typescript
export { calculateDiscount, applyTax }
```

**AFTER:**
```typescript
export { calculateDiscount }
```

**Breaking**: YES - applyTax no longer available

**Actions Required:**
```bash
# Find all imports
grep -r 'import.*applyTax' --include='*.ts'

# Options:
# 1. Restore export
# 2. Provide alternative function
# 3. Update all imports to use alternative
```

---

### Example 4: File Moved

**BEFORE:**
```typescript
// utils/math.ts
```

**AFTER:**
```typescript
// utils/calculations/math.ts
```

**Breaking**: YES - import paths broken

**Actions Required:**
```bash
# Find all imports
grep -r "from.*utils/math" --include='*.ts'

# Update all import paths
find . -name '*.ts' -exec sed -i 's|utils/math|utils/calculations/math|g' {} \;

# Update barrel exports (index.ts)
# Update MAP.md documentation
```

---

## Update Strategies

### Strategy 1: Find and Replace

**Use when**: Simple import path update or rename

```bash
find . -name '*.ts' -exec sed -i 's/old-import/new-import/g' {} \;
```

**Verify**: Run TypeScript compiler to catch errors

```bash
npm run type-check
```

---

### Strategy 2: Manual Update

**Use when**: Complex logic changes or signature changes

**Process**:
1. List all affected files
2. Update each file individually
3. Test each update
4. Commit incrementally

---

### Strategy 3: Deprecation Path

**Use when**: Public API that others depend on

**Process**:
1. Keep old function with `@deprecated` tag
2. Add `console.warn('Use newFunction instead')`
3. Create new function with improved signature
4. Provide migration guide
5. Set removal date (e.g., 3 months)

**Example**:
```typescript
/**
 * @deprecated Use calculateDiscountWithPercentage instead
 * This function will be removed in v4.0.0
 */
export function calculateDiscount(price: number): number {
  console.warn('calculateDiscount is deprecated. Use calculateDiscountWithPercentage instead.')
  return calculateDiscountWithPercentage(price, 10)
}

export function calculateDiscountWithPercentage(
  price: number,
  percentage: number = 10
): number {
  return price * (percentage / 100)
}
```

---

## Test Impact Analysis

After updating dependencies, you MUST run:

### Small Changes (5 minutes)
- Unit tests for modified file
- Unit tests for direct dependents
- Smoke tests

### Medium Changes (15 minutes)
- Unit tests for modified file
- Unit tests for all dependent files
- Integration tests for affected features
- Regression tests

### Large Changes (30+ minutes)
- Unit tests for modified file
- Unit tests for all dependent files
- Integration tests for affected features
- E2E tests for critical paths
- Performance tests
- Security tests

---

## Complete Workflow Example

### Scenario: Modifying user-service.ts

```typescript
// STEP 1: Find who uses this file (30 seconds)
// Command: grep -r "from.*user-service" --include="*.ts"
const downstreamFiles = [
  "backend/api/controllers/user-controller.ts",
  "backend/api/routes/user-routes.ts",
  "tests/unit/services/user-service.test.ts",
  "backend/services/auth/auth-service.ts"
]

// STEP 2: Find what this file imports (10 seconds)
const upstreamDependencies = [
  "backend/repositories/user/user-repository.ts",
  "backend/lib/validators/user-validator.ts",
  "backend/lib/utils/hash-utils.ts"
]

// STEP 3: Assess breaking change risk (20 seconds)
const change = {
  type: "Function signature change",
  before: "async getUser(id: string): Promise<User>",
  after: "async getUser(id: string, includeDeleted: boolean = false): Promise<User>",
  risk: "MEDIUM - new optional parameter (backward compatible)"
}

// STEP 4: Update strategy (5 minutes)
const updateStrategy = {
  breaking: false, // Optional parameter = not breaking
  action: "No updates needed (backward compatible)",
  tests_to_run: [
    "tests/unit/services/user-service.test.ts",
    "tests/integration/api/users.test.ts"
  ],
  documentation: [
    "Update docs/03_API.md with new parameter",
    "Update user-service.ts JSDoc"
  ]
}
```

---

## Quick Checklist

Before modifying ANY file:

- [ ] Found all downstream dependencies (30 sec)
- [ ] Found all upstream dependencies (10 sec)
- [ ] Assessed breaking change risk (20 sec)
- [ ] Determined update strategy
- [ ] Updated all dependent files (if breaking)
- [ ] Ran all affected tests
- [ ] Updated documentation
- [ ] Created migration guide (if public API)
- [ ] Added deprecation warnings (if needed)
- [ ] Verified no regressions

---

**Protocol Version**: 3.0.0
**Last Updated**: 2025-11-05
**See Also**: [04_BREAKING_CHANGES.md](./04_BREAKING_CHANGES.md), [05_API_CONTRACTS.md](./05_API_CONTRACTS.md)
