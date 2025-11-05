# 🤖 AI Assistant Quick Start Guide

**What AI Should Read First - 200 Lines**

---

## 30-Second Orientation

```typescript
interface QuickOrientation {
  project: "ClientForge CRM v3.0 - Enterprise AI-Powered CRM"
  stack: "React 18 + Node.js + PostgreSQL + MongoDB + Redis + AI/ML"
  structure: "413 directories, modular monolith → microservices ready"
  quality: "85%+ test coverage, zero-tolerance duplication, security-first"
  your_role: "Follow 50+ protocols automatically, document everything"
}
```

---

## What to Read (5-Minute Load)

### 1. ALWAYS Read First (Every Session)
```
✓ README.md (now streamlined: 1,500 lines, 20k tokens)
✓ docs/protocols/00_QUICK_REFERENCE.md (1-page cheat sheet)
✓ Last 2-3 session logs in logs/session-logs/
✓ CHANGELOG.md (recent changes only)
```

### 2. Task-Specific Reading

**Adding New Feature**:
- `docs/protocols/01_DEPENDENCY_CHAIN.md` - Don't break things
- `docs/protocols/03_TEST_COVERAGE.md` - Write tests
- `docs/protocols/02_SECURITY.md` - Security review

**Fixing Bug**:
- `docs/protocols/07_COMMON_MISTAKES.md` - Known issues
- `docs/protocols/01_DEPENDENCY_CHAIN.md` - Check impacts
- `docs/protocols/10_CODE_REVIEW.md` - Quality check

**Refactoring**:
- `docs/protocols/11_REFACTORING.md` - Safe patterns
- `docs/protocols/12_CONSISTENCY.md` - Keep patterns consistent
- `docs/protocols/13_TECHNICAL_DEBT.md` - Reduce debt

**Database Changes**:
- `docs/protocols/06_DATABASE_MIGRATIONS.md` - Safe migrations
- `docs/protocols/04_BREAKING_CHANGES.md` - Don't break APIs

---

## 5 Self-Awareness Questions

Before starting ANY task, answer these:

1. **Do I understand the project context?**
   - What was done in last session?
   - What is current project state?
   - What are active priorities?

2. **Do I understand THIS task?**
   - What exactly am I being asked to do?
   - What files will be affected?
   - What are the acceptance criteria?

3. **Do I have a clear implementation plan?**
   - Step 1, 2, 3... listed out?
   - Estimated time for each step?
   - Dependencies identified?

4. **Will my implementation meet ALL standards?**
   - Type safety? (zero 'any')
   - Security? (OWASP Top 10)
   - Tests? (85%+ coverage)
   - Performance? (< 200ms API)

5. **Have I reserved 10 minutes for documentation?**
   - Session log planned?
   - CHANGELOG update planned?
   - Time buffer reserved?

---

## Critical Protocols (P0) - NEVER Skip

### 1. File Organization
```
ROOT: Only README.md + config files
CODE: Deep folder structure (3-4 levels minimum)
      backend/[category]/[module]/[file].ts
      frontend/[category]/[Module]/[Component].tsx
DOCS: docs/[category]/[name].md
```

### 2. Anti-Duplication (2-3 min search MANDATORY)
```bash
# Before creating ANYTHING:
find . -name '*keyword*' -type f
grep -r 'keyword' --include='*.ts' --include='*.md'

# Decision Matrix:
90%+ similar → USE existing
80-89% similar → EXTEND existing
70-79% similar → REFACTOR to shared
<70% similar → OK to create (document why)
```

### 3. Dependency Chain
```bash
# Before modifying ANY file:
grep -r 'from.*filename' --include='*.ts'  # Find dependents
# Update ALL dependents immediately
# Run ALL affected tests
```

### 4. Session End (10 minutes MANDATORY)
```
✓ Update CHANGELOG.md
✓ Create session log in logs/session-logs/YYYY-MM-DD-task-name.md
✓ Update affected docs
✓ Document decisions and next steps
```

---

## Essential Protocols (P1) - Always Apply

### Security Auto-Check
On EVERY code change, verify:
```
✓ SQL injection → Parameterized queries?
✓ XSS → Sanitized inputs?
✓ Auth bypass → Permissions checked?
✓ Secrets → Never logged or committed?
✓ CSRF → Tokens on state changes?
```

### Test Coverage
```
Targets:
- Overall: 85%+
- Auth/Payment: 95%+
- Security: 90%+
- API: 85%+

Auto-generate:
1. Happy path
2. Edge cases
3. Error cases
4. Security cases
5. Performance cases
```

### Breaking Changes
```
HIGH RISK:
- Function signature changed
- Interface changed
- Export removed
- File moved
→ Update ALL dependents IMMEDIATELY

Check: grep -r 'import.*filename' --include='*.ts'
```

---

## Workflow for Every Task

```typescript
interface TaskWorkflow {
  step1_initialize: {
    read_readme: "5 min",
    read_relevant_protocols: "3-5 min",
    answer_5_questions: "2 min",
    reserve_docs_time: "10 min at end"
  },

  step2_search_before_create: {
    comprehensive_search: "2-3 min",
    check_duplicates: "Check 80%+ similarity",
    decision: "UPDATE > CREATE"
  },

  step3_implement: {
    check_dependencies: "Before modifying files",
    follow_conventions: "kebab-case, PascalCase, etc.",
    type_safety: "Zero 'any' types",
    security_review: "OWASP Top 10",
    error_handling: "try-catch everywhere"
  },

  step4_test: {
    write_tests: "85%+ coverage",
    run_tests: "All affected tests",
    verify_no_regressions: "E2E critical paths"
  },

  step5_document: {
    session_log: "What, why, how, decisions, next steps",
    changelog: "User-facing changes",
    code_comments: "Complex logic only",
    update_docs: "Affected documentation"
  }
}
```

---

## Code Quality Checklist

Before marking task complete, verify:

```
Type Safety:
✓ Zero 'any' types (use proper types or 'unknown')
✓ Explicit return types on functions
✓ Strict null checks

Error Handling:
✓ try-catch on all async operations
✓ Structured errors (AppError class)
✓ Never swallow errors

Security:
✓ Parameterized queries (no string interpolation)
✓ Input validation (zod schemas)
✓ Authentication/authorization checks
✓ No secrets in code or logs

Performance:
✓ No N+1 queries
✓ Pagination on list endpoints
✓ Database indexes on foreign keys
✓ Caching for hot data

Testing:
✓ 85%+ code coverage
✓ Tests actually test behavior
✓ Edge cases covered
✓ Error cases covered

Documentation:
✓ JSDoc on public functions
✓ Comments on complex logic
✓ README/docs updated
✓ Session log created
```

---

## Common Patterns

### TypeScript Strict Mode
```typescript
// ✅ ALWAYS
const user: User = { id: 1, name: 'John' }
function getUser(id: number): Promise<User | null>

// ❌ NEVER
const user: any = { id: 1, name: 'John' }
function getUser(id): Promise<any>
```

### API Endpoints
```typescript
// ✅ ALWAYS
GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PUT    /api/v1/users/:id
DELETE /api/v1/users/:id

// ❌ NEVER
GET /getUsers
POST /user/create
```

### Error Handling
```typescript
// ✅ ALWAYS
try {
  const result = await riskyOperation()
  return result
} catch (error) {
  logger.error('Operation failed', { error })
  throw new AppError('Operation failed', 500, { originalError: error })
}

// ❌ NEVER
try {
  return await riskyOperation()
} catch (error) {
  console.log(error) // Never console.log!
  return null // Never swallow errors!
}
```

---

## Time Management

### Simple Task (< 30 min)
- 70% Implementation
- 10% Testing
- 10% Documentation
- 10% Buffer

### Moderate Task (30-60 min)
- 50% Implementation
- 15% Testing
- 15% Documentation
- 20% Buffer

### Complex Task (60+ min)
- 40% Implementation
- 15% Testing
- 15% Documentation
- 10% Code review
- 20% Buffer

**ALWAYS reserve 10 minutes at end for session log**

---

## Quick Reference Links

**Critical Protocols**:
- [00_QUICK_REFERENCE.md](../protocols/00_QUICK_REFERENCE.md) - One-page cheat sheet
- [01_DEPENDENCY_CHAIN.md](../protocols/01_DEPENDENCY_CHAIN.md) - Prevent breaking changes
- [07_COMMON_MISTAKES.md](../protocols/07_COMMON_MISTAKES.md) - Top 50 mistakes

**Security & Quality**:
- [02_SECURITY.md](../protocols/02_SECURITY.md) - Security best practices
- [03_TEST_COVERAGE.md](../protocols/03_TEST_COVERAGE.md) - Testing strategies
- [10_CODE_REVIEW.md](../protocols/10_CODE_REVIEW.md) - Review checklists

**API & Database**:
- [04_BREAKING_CHANGES.md](../protocols/04_BREAKING_CHANGES.md) - API evolution
- [05_API_CONTRACTS.md](../protocols/05_API_CONTRACTS.md) - API patterns
- [06_DATABASE_MIGRATIONS.md](../protocols/06_DATABASE_MIGRATIONS.md) - Safe migrations

**Optimization**:
- [09_PERFORMANCE.md](../protocols/09_PERFORMANCE.md) - Performance budgets
- [11_REFACTORING.md](../protocols/11_REFACTORING.md) - Code improvement
- [13_TECHNICAL_DEBT.md](../protocols/13_TECHNICAL_DEBT.md) - Debt prevention

---

## Remember

1. **UPDATE > CREATE** - Always search 2-3 minutes first
2. **Document Everything** - 10 minutes reserved every session
3. **Quality > Speed** - 85%+ coverage, zero vulnerabilities
4. **Check Dependencies** - Before modifying ANY file
5. **Follow Conventions** - Consistency is critical

---

**Last Updated**: 2025-11-05
**For**: Claude Code, GitHub Copilot, All AI Assistants
**Maintained By**: Abstract Creatives LLC
