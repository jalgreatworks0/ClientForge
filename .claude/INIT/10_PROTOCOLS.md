# Development Protocols — ClientForge CRM

**Last Updated:** November 11, 2025

---

## P0: Critical Protocols (NEVER Skip)

### 1. Anti-Duplication Check
**Before writing ANY new function, component, or module:**

```
✅ ANTI-DUP-CHECK-COMPLETE
Searched: [keywords]
Found: [existing implementations or "none"]
Action: [reuse | enhance | create new + justification]
```

**Search locations:**
- `backend/modules/` — Core business logic
- `backend/utils/` — Utility functions
- `frontend/src/components/` — React components
- `frontend/src/hooks/` — Custom React hooks
- `agents/mcp/servers/` — MCP tools

**Common duplications to avoid:**
- Database connection helpers
- Authentication middleware
- Validation schemas
- Error formatters
- Logging utilities

### 2. Dependency Chain Verification
**Before adding ANY import:**

```
✅ DEP-CHAIN-CHECK-COMPLETE
New import: [module path]
Circular risk: [yes/no + explanation]
Depth: [direct | 1-level | 2-level deep]
Action: [safe | refactor needed]
```

**Forbidden patterns:**
- `backend/modules/A → modules/B → modules/A` (circular)
- `utils → modules` (utils should be pure, no business logic)
- `frontend → backend` (separate codebases)

**Safe patterns:**
- `modules → utils` ✅
- `routes → modules` ✅
- `components → hooks` ✅

### 3. Test Gate Protocol
**Before marking feature complete:**

```
✅ TEST-GATE-COMPLETE
Unit tests: [count] passing
Integration tests: [count] passing
E2E tests: [count if applicable]
Coverage: [X%] (target: >80%)
```

**Requirements:**
- **New functions:** Unit test required
- **New API endpoints:** Integration test required
- **New UI flows:** Playwright E2E test required
- **Bug fixes:** Regression test required

---

## P1: Important Protocols (Skip Only If Explicitly Requested)

### 4. Type Safety Protocol
**Default stance:** Strict TypeScript, no `any`

**Allowed exceptions:**
- Third-party library with no types (document with `// @ts-expect-error` + reason)
- Complex generics where inference fails (use `unknown` + type guard)
- Legacy code migration (add `// TODO: Remove any`)

**Output when using `any`:**
```
⚠️ TYPE-SAFETY-OVERRIDE
Location: [file:line]
Reason: [brief explanation]
Plan: [when/how to remove]
```

### 5. Error Handling Protocol
**Use RFC7807 Problem Details via AppError:**

```typescript
throw new AppError({
  statusCode: 400,
  errorId: "ERR_INVALID_INPUT",
  severity: "medium",
  message: "User-friendly message",
  problem: {
    type: "/problems/validation-error",
    title: "Validation Error",
    detail: "Specific field issue",
    instance: "/api/v1/endpoint",
    correlationId: req.correlationId
  }
});
```

**Never:**
- Throw raw strings
- Return error codes without context
- Swallow errors silently

### 6. Documentation Protocol
**Update these when behavior changes:**
- API docs (OpenAPI/Swagger)
- README if public API changes
- CHANGELOG.md for user-facing changes
- Inline JSDoc for public functions

---

## P2: Best Practice Protocols (Use When Practical)

### 7. Performance Protocol
**Consider for datasets >100 items:**
- Pagination (default page size: 20)
- Caching (Redis for frequent reads)
- Indexes (database query optimization)
- Lazy loading (React components)

### 8. Security Protocol (OWASP Top 10 Awareness)
- **SQL Injection:** Use parameterized queries
- **XSS:** Sanitize user input, use CSP headers
- **CSRF:** Token validation on state-changing ops
- **Auth:** JWT with short expiry + refresh tokens
- **Secrets:** Never commit to git, use env vars

### 9. Logging Protocol
**Structured logging with correlation IDs:**

```typescript
logger.info({
  message: "User action",
  userId: user.id,
  action: "create_project",
  correlationId: req.correlationId,
  duration: 142 // ms
});
```

**Log levels:**
- `error`: System failures, uncaught exceptions
- `warn`: Recoverable issues, deprecated usage
- `info`: Normal operations, user actions
- `debug`: Detailed traces (dev only)

---

## Verification Commands

After any significant change, run:

```bash
# Full verification suite
npm run typecheck && \
npm run lint && \
npm run test -- --runInBand && \
npm run errors:check

# Or use VS Code task: Ctrl+Shift+B (Project: Full Verify)
```

---

## Protocol Violation Response

If a protocol is violated:
1. **Acknowledge:** "Protocol [X] was not followed because [reason]"
2. **Assess risk:** Low/Medium/High
3. **Remediate:** Fix immediately (High), schedule fix (Medium), document (Low)
4. **Prevent:** Add guard/lint rule if possible

---

*These protocols ensure consistency, quality, and maintainability.*
