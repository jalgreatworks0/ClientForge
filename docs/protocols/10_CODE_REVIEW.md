# ✅ Code Review Protocol - 9-Point Checklist

**P1 ESSENTIAL**: All code must pass 9-point quality check before merging

---

## Core Principle

**Code review is quality assurance.** Every PR must pass all 9 checks.

---

## 9-Point Quality Checklist

### 1. ✅ Functionality
**Question**: Does the code work as intended?

**Check**:
- [ ] Feature works in happy path scenarios
- [ ] Edge cases handled properly
- [ ] No obvious bugs or logic errors
- [ ] Meets acceptance criteria from ticket

**Red Flags**:
- ❌ Hardcoded values that should be configurable
- ❌ Logic errors (off-by-one, incorrect conditionals)
- ❌ Missing null/undefined checks

---

### 2. ✅ Security
**Question**: Is the code secure against OWASP Top 10 vulnerabilities?

**Check**:
- [ ] All routes have authentication middleware
- [ ] Authorization checks for protected resources
- [ ] Input validation with Zod schemas
- [ ] Parameterized queries (no SQL injection risk)
- [ ] No secrets hardcoded in code
- [ ] Error messages don't expose internal details

**Red Flags**:
- ❌ `await db.query(\`SELECT * FROM users WHERE email = '${email}'\`)` (SQL injection)
- ❌ Missing authentication: `router.get('/admin', adminController)` (no auth!)
- ❌ Secrets in code: `const API_KEY = 'sk_live_123abc'` (hardcoded!)

**Reference**: [02_SECURITY.md](./02_SECURITY.md)

---

### 3. ✅ Testing
**Question**: Is the code adequately tested?

**Check**:
- [ ] 85%+ test coverage (run `npm test -- --coverage`)
- [ ] Unit tests for business logic
- [ ] Integration tests for API endpoints
- [ ] Tests cover: happy path, edge cases, errors, security
- [ ] All tests pass locally

**Red Flags**:
- ❌ Coverage < 85%
- ❌ No tests for new feature
- ❌ Commented-out tests
- ❌ Flaky tests (randomly failing)

**Reference**: [03_TEST_COVERAGE.md](./03_TEST_COVERAGE.md)

---

### 4. ✅ Type Safety
**Question**: Is TypeScript used correctly with no 'any' types?

**Check**:
- [ ] No `any` types (use specific types)
- [ ] Explicit return types on functions
- [ ] Interfaces/types for all data structures
- [ ] No `@ts-ignore` or `@ts-expect-error` (fix the issue instead)

**Red Flags**:
- ❌ `function getUser(id: any): any`
- ❌ `const data: any = await api.fetch()`
- ❌ `// @ts-ignore` (hiding type errors)

**Good Example**:
```typescript
// ✅ Proper types
interface User {
  id: string
  email: string
  tenantId: string
}

async function getUser(id: string): Promise<User | null> {
  const result = await db.query('SELECT * FROM users WHERE id = $1', [id])
  return result.rows[0] || null
}
```

---

### 5. ✅ Error Handling
**Question**: Are errors handled gracefully?

**Check**:
- [ ] Try-catch on all async operations
- [ ] Custom error classes (AppError, NotFoundError, etc.)
- [ ] Errors logged with context
- [ ] No swallowed errors (`catch (e) {}`)
- [ ] User-friendly error messages (no stack traces to client)

**Red Flags**:
- ❌ `catch (error) {}` (swallowed error)
- ❌ `catch (error) { console.log(error) }` (only logging, not handling)
- ❌ `res.status(500).json({ error: error.stack })` (exposing internals)

**Good Example**:
```typescript
// ✅ Proper error handling
try {
  const user = await userService.getById(id)
  if (!user) {
    throw new NotFoundError('User not found')
  }
  return user
} catch (error) {
  logger.error('Error fetching user', { userId: id, error })
  throw new AppError('Unable to fetch user', 500, { originalError: error })
}
```

---

### 6. ✅ Performance
**Question**: Is the code performant?

**Check**:
- [ ] No N+1 queries (use JOINs or batch queries)
- [ ] Database indexes on frequently queried fields
- [ ] Pagination for large datasets
- [ ] Caching for expensive operations
- [ ] API responses < 200ms (check with tests)

**Red Flags**:
- ❌ Loop with database query inside (N+1 problem)
- ❌ Loading 10,000 records without pagination
- ❌ No indexes on foreign keys
- ❌ Synchronous operations blocking event loop

**N+1 Example**:
```typescript
// ❌ BAD: N+1 query problem
const contacts = await db.query('SELECT * FROM contacts')
for (const contact of contacts.rows) {
  const account = await db.query('SELECT * FROM accounts WHERE id = $1', [contact.account_id])
  contact.account = account.rows[0]
}

// ✅ GOOD: Single JOIN query
const contacts = await db.query(`
  SELECT c.*, a.name as account_name
  FROM contacts c
  LEFT JOIN accounts a ON c.account_id = a.id
`)
```

---

### 7. ✅ Code Quality
**Question**: Is the code clean, readable, and maintainable?

**Check**:
- [ ] Functions are small (< 50 lines)
- [ ] Descriptive variable/function names
- [ ] DRY principle (no duplicate code)
- [ ] Single Responsibility Principle (functions do one thing)
- [ ] Consistent formatting (Prettier)
- [ ] Meaningful comments for complex logic

**Red Flags**:
- ❌ 300-line function
- ❌ Variables named `x`, `temp`, `data`
- ❌ Copy-pasted code blocks
- ❌ Inconsistent indentation/formatting

**Good Example**:
```typescript
// ✅ Clean, readable code
async function createContactWithAccount(
  contactData: CreateContactDTO,
  accountId: string,
  userId: string
): Promise<Contact> {
  validateContactData(contactData)
  const account = await verifyAccountExists(accountId)
  const contact = await contactRepository.create({
    ...contactData,
    accountId: account.id,
    createdBy: userId
  })
  await auditLogger.logContactCreation(contact, userId)
  return contact
}
```

---

### 8. ✅ Documentation
**Question**: Is the code properly documented?

**Check**:
- [ ] JSDoc comments on public functions
- [ ] README updated if file structure changed
- [ ] API documentation updated (if API changed)
- [ ] Complex logic explained with comments
- [ ] CHANGELOG updated with changes

**Red Flags**:
- ❌ No comments on complex algorithms
- ❌ Outdated documentation (says one thing, code does another)
- ❌ CHANGELOG not updated

**Good Example**:
```typescript
/**
 * Creates a new contact and associates it with an account.
 *
 * @param contactData - Contact information (name, email, phone, etc.)
 * @param accountId - ID of the account to associate with
 * @param userId - ID of the user creating the contact
 * @returns The created contact with account details
 * @throws NotFoundError if account doesn't exist
 * @throws ValidationError if contact data is invalid
 */
async function createContactWithAccount(
  contactData: CreateContactDTO,
  accountId: string,
  userId: string
): Promise<Contact> {
  // Implementation...
}
```

---

### 9. ✅ Breaking Changes
**Question**: Does this PR introduce breaking changes?

**Check**:
- [ ] No removed functions/endpoints (unless properly deprecated)
- [ ] No changed function signatures (unless v2 created)
- [ ] No removed/renamed fields in API responses
- [ ] Dependency chain verified (no broken imports)
- [ ] All affected files updated

**Red Flags**:
- ❌ Removed exported function without deprecation period
- ❌ Changed API response format without versioning
- ❌ Moved file without updating imports

**Reference**: [04_BREAKING_CHANGES.md](./04_BREAKING_CHANGES.md)

---

## Review Process

### For Code Authors
1. **Self-review first**: Go through this 9-point checklist yourself
2. **Run tests**: `npm test -- --coverage` (must be 85%+)
3. **Run type check**: `npm run type-check`
4. **Format code**: `npm run format`
5. **Create PR** with description explaining:
   - What changed and why
   - How to test it
   - Any breaking changes
   - Screenshots (if UI changed)

### For Reviewers
1. **Read PR description** to understand context
2. **Check out branch** and run locally
3. **Go through 9-point checklist** systematically
4. **Test manually** if UI changes
5. **Leave specific feedback**:
   - ✅ Approve if all 9 checks pass
   - 💬 Comment for minor issues (don't block merge)
   - ❌ Request changes for major issues (block merge)

---

## Review Comments Template

### Request Changes (Blocking)
```
**Security Issue**: SQL injection vulnerability

This query is vulnerable to SQL injection:
```typescript
await db.query(`SELECT * FROM users WHERE email = '${email}'`)
```

Use parameterized query instead:
```typescript
await db.query('SELECT * FROM users WHERE email = $1', [email])
```

Reference: docs/protocols/02_SECURITY.md#3-injection
```

### Suggestion (Non-Blocking)
```
**Code Quality Suggestion**: Consider extracting this logic

This function is getting long (85 lines). Consider extracting the validation logic into a separate function:

```typescript
function validateContactData(data: ContactData): void {
  // validation logic here
}
```

Not blocking - but would improve readability.
```

### Approval
```
**LGTM** ✅

All 9 checks passed:
✅ Functionality - Works as expected
✅ Security - Auth/validation in place
✅ Testing - 92% coverage
✅ Type Safety - No 'any' types
✅ Error Handling - Proper try-catch
✅ Performance - Queries optimized
✅ Code Quality - Clean and readable
✅ Documentation - JSDoc comments added
✅ Breaking Changes - None

Great work on the contact merge feature!
```

---

## Automated Checks (CI/CD)

Before manual review, automated checks should run:

```yaml
# .github/workflows/pr-checks.yml
- name: Type Check
  run: npm run type-check

- name: Lint
  run: npm run lint

- name: Tests with Coverage
  run: npm test -- --coverage --coverageThreshold='{"global":{"branches":85,"functions":85,"lines":85,"statements":85}}'

- name: Security Audit
  run: npm audit --production --audit-level=high
```

**All automated checks must pass before manual review begins.**

---

## Common Review Mistakes

### ❌ Nitpicking Style
Don't waste time on formatting issues - use Prettier.

### ❌ Rubber Stamping
Don't approve without actually reading the code.

### ❌ Personal Preferences
Stick to the 9 objective criteria, not personal coding style.

### ❌ Not Testing Locally
Always pull the branch and test critical features.

---

## Quick Reference

```bash
# Before requesting review
npm run type-check          # Type safety check
npm test -- --coverage      # Test coverage (must be 85%+)
npm run lint                # Code style check
npm run format              # Auto-format code
npm audit                   # Security vulnerabilities

# Review checklist
1. ✅ Functionality
2. ✅ Security (OWASP Top 10)
3. ✅ Testing (85%+ coverage)
4. ✅ Type Safety (no 'any')
5. ✅ Error Handling
6. ✅ Performance
7. ✅ Code Quality
8. ✅ Documentation
9. ✅ Breaking Changes
```

---

## Remember

**Quality > Speed**

It's better to spend 30 minutes on a thorough review than to merge buggy/insecure code.
