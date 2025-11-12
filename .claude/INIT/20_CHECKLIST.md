# Before You Write Code — Checklist

**Last Updated:** November 11, 2025

---

## Pre-Flight Checklist (Complete BEFORE Writing Code)

### ✅ 1. Context Loaded
- [ ] Read `.claude/INIT/00_INIT.md`
- [ ] Loaded relevant context pack (crm_pack, db_pack, or agents_pack)
- [ ] Checked INBOX signals (errors, mcp_status, lmstudio_status)

### ✅ 2. Requirements Clear
- [ ] User request is unambiguous
- [ ] Success criteria defined
- [ ] Edge cases identified

### ✅ 3. Anti-Duplication Check
- [ ] Searched for existing implementations
- [ ] Confirmed no duplicate logic
- [ ] Decision: **reuse | enhance | create new**

### ✅ 4. Dependency Chain Safe
- [ ] No circular dependencies introduced
- [ ] Import depth reasonable (<3 levels)
- [ ] No business logic in utils

### ✅ 5. Architecture Fit
- [ ] Placement: correct module/folder
- [ ] Naming: follows project conventions
- [ ] Responsibility: single, clear purpose

---

## During Development Checklist

### ✅ 6. Type Safety
- [ ] No `any` (or justified + documented)
- [ ] Interfaces/types defined
- [ ] Generics used where appropriate

### ✅ 7. Error Handling
- [ ] Uses AppError for known errors
- [ ] Try-catch for async operations
- [ ] User-friendly error messages

### ✅ 8. Security
- [ ] No SQL injection vulnerabilities
- [ ] Input validation (Zod schemas)
- [ ] No secrets in code

### ✅ 9. Performance
- [ ] No N+1 queries
- [ ] Pagination for large datasets
- [ ] Caching considered

### ✅ 10. Logging
- [ ] Structured logs with correlation IDs
- [ ] Appropriate log levels
- [ ] No sensitive data logged

---

## After Development Checklist

### ✅ 11. Tests Written
- [ ] Unit tests for functions
- [ ] Integration tests for API endpoints
- [ ] E2E tests for UI flows (if applicable)
- [ ] All tests passing

### ✅ 12. Documentation Updated
- [ ] JSDoc for public functions
- [ ] README updated (if public API changed)
- [ ] CHANGELOG.md entry (if user-facing)

### ✅ 13. Code Quality
- [ ] TypeScript check passes (`npm run typecheck`)
- [ ] ESLint passes (`npm run lint`)
- [ ] Prettier formatted (auto on save)
- [ ] No console.log left behind

### ✅ 14. Verification Suite
- [ ] Full suite passed:
  ```bash
  npm run typecheck && npm run lint && npm run test -- --runInBand && npm run errors:check
  ```

### ✅ 15. Git Hygiene
- [ ] Descriptive commit message
- [ ] Only relevant files committed
- [ ] No INBOX/*.json committed

---

## Output Confirmation

After completing checklist, output:

```
✅ PRE-FLIGHT-COMPLETE
Anti-dup: [checked/reused/justified]
Dep-chain: [safe/refactored]
Tests: [X unit, Y integration, Z e2e]
Verification: [typecheck ✓ | lint ✓ | tests ✓ | errors ✓]
Ready to proceed: yes
```

---

*Use this checklist for every significant code change to maintain quality.*
