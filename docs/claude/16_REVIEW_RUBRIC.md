# ClientForge CRM — PR Review Rubric

> 8-dimension scorecard (0–5 scale) with evidence citations. Use **in addition** to the existing 9-point checklist in [docs/protocols/10_CODE_REVIEW.md](../protocols/10_CODE_REVIEW.md).

---

## Scoring Matrix

| # | Dimension        | 0 (Absent) | 1–2 (Weak) | 3 (Adequate) | 4 (Strong) | 5 (Elite) |
|---|------------------|------------|------------|--------------|------------|-----------|
| **1** | **Correctness**      | Broken     | Flaky/partial | Works        | Edge-safe   | Bulletproof |
| **2** | **Type-Safety**      | `any`-land | Mixed types   | Mostly typed | Strict-ish  | Fully strict |
| **3** | **Security**         | Vulns present | Weak checks | Basic checks | OWASP-ish   | Audited + RBAC |
| **4** | **Observability**    | None       | Console.log   | Logs present | Structured logs | Logs+Metrics+Trace |
| **5** | **DX/Ergonomics**    | Confusing  | Awkward       | Usable       | Intuitive   | Delightful |
| **6** | **Test Coverage**    | 0%         | <50%          | 50–79%       | 80–89%      | 90%+ |
| **7** | **Incrementality**   | Huge PR    | Large PR      | Medium PR    | Small PR    | Tiny PR (<150 LOC) |
| **8** | **Risk Control**     | No guard   | Minimal       | Some guard   | Good guard  | Feature-flagged |

---

## Review Template

Use this template for all PR reviews:

```markdown
# PR Review: [Title]

## Scores
| Dimension | Score | Evidence | Remediation |
|-----------|-------|----------|-------------|
| **Correctness** | X/5 | Works for happy path; handles null (file.ts:42) | Add test for empty array edge case |
| **Type-Safety** | X/5 | Zero `any`, explicit returns (file.ts:15-30) | None |
| **Security** | X/5 | No input validation on user input (controller.ts:58) | Add Zod schema validation |
| **Observability** | X/5 | Logs present but no error context (service.ts:120) | Add structured error attrs |
| **DX/Ergonomics** | X/5 | Clear naming, good JSDoc (file.ts:10-20) | None |
| **Test Coverage** | X/5 | 87% coverage (unit tests present) | Add edge case test for X |
| **Incrementality** | X/5 | 120 LOC, single feature | None |
| **Risk Control** | X/5 | No feature flag for breaking change | Add env var gate |
| **Total** | **N/40** | **Percentage: N%** | **M items** |

## Verdict
- [ ] **Approve** (≥36/40 = 90%+)
- [x] **Approve with comments** (30-35/40 = 75-89%)
- [ ] **Request changes** (<30/40 = <75%)

## Required Changes (Block Merge)
1. **Security:** Add Zod schema for input validation (backend/api/controllers/foo.ts:58)
2. **Tests:** Add edge case test for empty array (tests/unit/foo.test.ts)
3. **Observability:** Add error context to logs (backend/services/foo-service.ts:120)
4. **Risk Control:** Add env var feature gate `ENABLE_NEW_FEATURE` (backend/index.ts)

## Optional Suggestions (Nice-to-Have)
- Consider extracting helper function for DRY (backend/services/foo-service.ts:135-150)
- Add JSDoc to public method (backend/services/foo-service.ts:80)

## Rubric Justification
- **Correctness (4/5):** Works for all tested cases; handles null/undefined. Missing test for empty array edge case.
- **Type-Safety (5/5):** Zero `any` types, all function signatures have explicit return types.
- **Security (3/5):** Basic checks present (auth middleware), but no input validation on user-provided data at line 58. Add Zod schema to reach 5/5.
- **Observability (4/5):** Structured logs with Winston. Missing error context attributes (userId, tenantId, operation). Add to reach 5/5.
- **DX (5/5):** Clear naming (`getUserById` not `getU`), good JSDoc, consistent patterns.
- **Test Coverage (4/5):** 87% coverage. Happy path + error case tested. Missing edge case for empty array.
- **Incrementality (5/5):** 120 LOC, single feature, easy to review. No unrelated changes.
- **Risk Control (4/5):** Breaking change not behind feature flag. Add `ENABLE_NEW_FEATURE` env var to reach 5/5.

**Total: 34/40 = 85% → Approve with comments.**
```

---

## Dimension Details

### 1. Correctness (Does it work?)
- **5:** All paths tested; edge cases handled; deterministic; no race conditions
- **4:** Works for all common cases; handles nulls; missing 1-2 edge tests
- **3:** Works for happy path; basic error handling
- **2:** Flaky; partial implementation; known bugs
- **1:** Broken in obvious ways
- **0:** Doesn't compile or run

**Evidence to cite:** Test results, edge cases handled, error paths tested

---

### 2. Type-Safety (TypeScript strictness)
- **5:** Zero `any`; explicit return types; strict null checks; branded types where appropriate
- **4:** Mostly strict; 1-2 acceptable `any` with comments; explicit returns
- **3:** Mixed; some `any`; most returns typed
- **2:** Loose types; many `any`; implicit returns
- **1:** Mostly `any`
- **0:** No types

**Evidence to cite:** Presence of `any`, explicit return types (file:line)

---

### 3. Security (OWASP Top 10)
- **5:** Full OWASP compliance; input validated (Zod); RBAC enforced; rate limited; audit logged; secrets safe; no SSRF
- **4:** Most checks present; missing 1-2 items (e.g., no rate limit)
- **3:** Basic security (auth middleware, parameterized queries)
- **2:** Weak security (missing auth or validation)
- **1:** Known vulns (SQL injection, XSS)
- **0:** No security consideration

**Evidence to cite:** Input validation (Zod schemas), auth checks, rate limits, audit logs (file:line)

---

### 4. Observability (Logs, metrics, traces)
- **5:** Structured logs + metrics + traces; error context (userId, tenantId, operation); latency tracking
- **4:** Structured logs with some context; missing 1-2 attrs
- **3:** Logs present; basic context
- **2:** Console.log or minimal logs
- **1:** No logging
- **0:** Silent failures

**Evidence to cite:** Log statements, structured context, error handling (file:line)

---

### 5. DX/Ergonomics (Developer experience)
- **5:** Delightful to use; clear naming; good JSDoc; consistent patterns; easy to extend
- **4:** Intuitive; good naming; some docs
- **3:** Usable; acceptable naming
- **2:** Awkward; unclear naming; missing docs
- **1:** Confusing; inconsistent
- **0:** Unusable

**Evidence to cite:** Function/variable naming, JSDoc, code clarity (file:line)

---

### 6. Test Coverage (Quantity + quality)
- **5:** 90%+ coverage; happy/edge/error/security/performance tests; deterministic; no flaky tests
- **4:** 80-89%; happy/edge/error tests
- **3:** 50-79%; happy path + basic error
- **2:** <50%; minimal tests
- **1:** 1-2 tests only
- **0:** No tests

**Evidence to cite:** Coverage %, test types (unit/integration/e2e), edge cases covered

---

### 7. Incrementality (PR size)
- **5:** Tiny PR (<150 LOC); single feature; atomic change
- **4:** Small PR (150-300 LOC); focused
- **3:** Medium PR (300-500 LOC); mostly focused
- **2:** Large PR (500-1000 LOC); mixed concerns
- **1:** Huge PR (1000+ LOC); hard to review
- **0:** Massive PR (2000+ LOC); impossible to review

**Evidence to cite:** Total LOC changed, number of files, focus

---

### 8. Risk Control (Rollout safety)
- **5:** Feature-flagged; canary deploy plan; rollback plan; metrics dashboard; kill-switch
- **4:** Good guards (env var flag, rollback plan, monitoring)
- **3:** Some guards (rollback plan or monitoring)
- **2:** Minimal guards (manual rollback possible)
- **1:** No guards (deploy and pray)
- **0:** Breaking change with no mitigation

**Evidence to cite:** Feature flags, rollback plan, monitoring, env vars (file:line)

---

## Integration with Existing Protocols

This rubric **complements** the existing 9-point checklist in [docs/protocols/10_CODE_REVIEW.md](../protocols/10_CODE_REVIEW.md):

**Existing 9-point checklist (qualitative):**
1. Type Safety
2. Error Handling
3. Security
4. Performance
5. Testing
6. Documentation
7. Naming
8. DRY
9. SOLID

**New 8-dimension rubric (quantitative with evidence):**
1. Correctness
2. Type-Safety
3. Security
4. Observability
5. DX/Ergonomics
6. Test Coverage
7. Incrementality
8. Risk Control

**Use both:**
- **9-point checklist:** Quick sanity check during development
- **8-dimension rubric:** Formal PR review with scoring and evidence

---

## Scoring Guidelines

| Total Score | Percentage | Verdict | Action |
|-------------|------------|---------|--------|
| **36-40** | **90-100%** | **Approve** | Merge immediately; celebrate excellence |
| **30-35** | **75-89%** | **Approve with comments** | Merge after addressing required changes |
| **24-29** | **60-74%** | **Request changes** | Block merge until fixed |
| **<24** | **<60%** | **Reject** | Major rework needed |

---

## Example Review (Abbreviated)

```markdown
# PR Review: Add JWT Refresh Token Support

## Scores
| Dimension | Score | Evidence |
|-----------|-------|----------|
| Correctness | 5/5 | All paths tested; handles expiration |
| Type-Safety | 5/5 | Zero `any`; explicit types (auth.service.ts:42-80) |
| Security | 5/5 | Refresh tokens in httpOnly cookies; rotation on use; rate limited |
| Observability | 4/5 | Logs present; missing userId in error context |
| DX | 5/5 | Clear naming (`refreshAccessToken`); good JSDoc |
| Tests | 5/5 | 95% coverage; happy/edge/error/security tests |
| Incrementality | 5/5 | 145 LOC; single feature |
| Risk Control | 4/5 | No feature flag for breaking change |
| **Total** | **38/40** | **95%** |

## Verdict: ✅ Approve with comments

## Required Changes: 2
1. Add userId to error logs (auth.service.ts:120)
2. Add `ENABLE_REFRESH_TOKENS` feature flag (backend/index.ts)

## Optional: None

**Excellent work! Merge after addressing 2 required changes.**
```

---

## Verification

When using this rubric, include in PR comments:
```
✅ REVIEW RUBRIC APPLIED
Total Score: N/40 (N%)
Verdict: [Approve / Approve with comments / Request changes / Reject]
Required Changes: [count]
Evidence: [file:line citations present]
```
