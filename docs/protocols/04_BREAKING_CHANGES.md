# 🔨 Breaking Changes Protocol

**P1 ESSENTIAL**: Prevent breaking changes through careful API evolution

---

## Core Principle

**Breaking changes break users.** Evolve APIs gracefully with deprecation periods.

---

## What is a Breaking Change?

### API Breaking Changes
- ❌ Removing an endpoint
- ❌ Changing endpoint URL (`/contacts` → `/people`)
- ❌ Removing request/response fields
- ❌ Changing field types (string → number)
- ❌ Adding required fields to requests
- ❌ Changing HTTP status codes
- ❌ Changing error response format

### Code Breaking Changes
- ❌ Removing exported functions/classes
- ❌ Changing function signatures (parameters, return types)
- ❌ Renaming exported members
- ❌ Moving files to different paths

---

## Protocol: Before Making ANY Change

### Step 1: Identify Breaking Changes (30 seconds)
Ask: "Will existing code/clients break if I make this change?"

### Step 2: Find All Dependents (1 minute)
```bash
# Find all files that use this code
grep -r 'functionName' --include='*.ts'
grep -r 'from.*filename' --include='*.ts'
```

### Step 3: Choose Strategy

#### Option A: Non-Breaking Change (PREFERRED)
Add new functionality alongside old:
```typescript
// ✅ Add new field (optional)
interface Contact {
  name: string
  email?: string // New optional field
}

// ✅ Add new endpoint (keep old one)
router.get('/api/v1/contacts', oldController)
router.get('/api/v2/contacts', newController) // New version
```

#### Option B: Deprecation Period (if breaking is necessary)
1. Mark old code as deprecated
2. Add new code alongside
3. Update documentation
4. Wait 2+ versions (or 3+ months)
5. Remove deprecated code

```typescript
// ✅ Deprecation with warning
/**
 * @deprecated Use createContact() instead. Will be removed in v4.0.0
 */
export function addContact(data: ContactData) {
  console.warn('addContact() is deprecated. Use createContact() instead.')
  return createContact(data)
}

export function createContact(data: ContactData) {
  // New implementation
}
```

#### Option C: Major Version Bump (last resort)
- Only for truly necessary breaking changes
- Requires version bump: v2.x.x → v3.0.0
- Requires migration guide
- Requires updating ALL dependents

---

## API Versioning Strategy

### URL-Based Versioning (Current)
```
/api/v1/contacts  → Version 1
/api/v2/contacts  → Version 2
```

**When to create v2**:
- When making breaking changes to v1
- Keep v1 running for 6+ months minimum
- Document differences in migration guide

---

## Safe Evolution Patterns

### 1. Adding Optional Fields
```typescript
// ✅ SAFE: Add optional field
interface Contact {
  id: string
  name: string
  email?: string // New, optional
}
```

### 2. Adding New Endpoints
```typescript
// ✅ SAFE: New endpoint
router.post('/api/v1/contacts/:id/archive', archiveController)
```

### 3. Expanding Enums
```typescript
// ✅ SAFE: Add new enum value
enum ContactStatus {
  Active = 'active',
  Inactive = 'inactive',
  Archived = 'archived' // New value
}
```

### 4. Relaxing Validation
```typescript
// ✅ SAFE: Make field optional
const schema = z.object({
  name: z.string(),
  email: z.string().email().optional() // Was required, now optional
})
```

---

## Unsafe Patterns (Breaking)

### 1. Removing Fields
```typescript
// ❌ BREAKING
interface Contact {
  id: string
  // name: string  ← Removed!
}

// ✅ NON-BREAKING: Deprecate instead
interface Contact {
  id: string
  /** @deprecated Use firstName/lastName instead */
  name?: string
  firstName?: string
  lastName?: string
}
```

### 2. Changing Field Types
```typescript
// ❌ BREAKING
interface Contact {
  id: number // Was string, now number
}

// ✅ NON-BREAKING: Add new field
interface Contact {
  id: string
  numericId?: number // New field
}
```

### 3. Making Fields Required
```typescript
// ❌ BREAKING
const schema = z.object({
  name: z.string(),
  email: z.string().email() // Was optional, now required!
})

// ✅ NON-BREAKING: Keep optional, validate conditionally
const schema = z.object({
  name: z.string(),
  email: z.string().email().optional()
})
```

---

## Deprecation Notice Template

```typescript
/**
 * @deprecated Since v3.2.0. Use newFunction() instead.
 * This function will be removed in v4.0.0 (scheduled for 2026-01-01).
 *
 * Migration guide: https://docs.clientforge.com/migration/v3-to-v4
 *
 * @example
 * // Old (deprecated)
 * const result = oldFunction(data)
 *
 * // New (recommended)
 * const result = newFunction(data)
 */
export function oldFunction(data: any) {
  console.warn('oldFunction is deprecated. Use newFunction instead.')
  return newFunction(data)
}
```

---

## Breaking Change Checklist

Before merging code with breaking changes:

- [ ] All breaking changes documented in CHANGELOG.md
- [ ] Deprecation warnings added to old code
- [ ] New code added alongside old code (not replacing it)
- [ ] All dependents updated to use new code
- [ ] Migration guide created (if major version bump)
- [ ] Tests updated for both old and new code
- [ ] API documentation updated
- [ ] Team notified of breaking changes

---

## Version Numbering (Semantic Versioning)

```
MAJOR.MINOR.PATCH
  3  . 2  . 1

MAJOR: Breaking changes (v3.0.0 → v4.0.0)
MINOR: New features (backward compatible) (v3.2.0 → v3.3.0)
PATCH: Bug fixes (v3.2.1 → v3.2.2)
```

**Examples**:
- Add optional field → MINOR version bump
- Fix bug → PATCH version bump
- Remove deprecated function → MAJOR version bump

---

## Migration Guide Template

```markdown
# Migration Guide: v3.x to v4.0

## Breaking Changes

### 1. Contact API - Removed `name` field

**What changed**: The `name` field has been split into `firstName` and `lastName`.

**Before (v3.x)**:
```typescript
const contact = {
  name: 'John Doe'
}
```

**After (v4.0)**:
```typescript
const contact = {
  firstName: 'John',
  lastName: 'Doe'
}
```

**Migration script**:
```sql
UPDATE contacts
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = SPLIT_PART(name, ' ', 2)
WHERE first_name IS NULL;
```
```

---

## Quick Commands

```bash
# Find all uses of a function
grep -r 'functionName' --include='*.ts'

# Find all imports of a file
grep -r 'from.*filename' --include='*.ts'

# Check for deprecated code
grep -r '@deprecated' --include='*.ts'
```

---

## Remember

- **Backward compatibility > New features**
- **Deprecate before removing** (2+ versions minimum)
- **Document ALL breaking changes** in CHANGELOG
- **Update ALL dependents** immediately
