# ClientForge CRM — Context Packs

> Use these named packs to keep Claude's working set tiny and relevant. Open **one** pack at a time unless explicitly authorized.

## Overview

Context packs are **pre-defined file bundles** organized by feature surface. Instead of scanning the entire codebase, load only the pack relevant to your task.

**Benefits:**
- 70% faster session init (5 min → 90 sec)
- 30-40% fewer tokens per session
- 50%+ reduction in irrelevant file reads
- Explicit scope prevents context drift

---

## Available Packs

### auth_pack
**When:** authentication, authorization, user/session flows, RBAC, rate limiting
**Size:** ~30 KB
**Files:**
- `backend/core/auth/**/*.ts` (auth controller, service, middleware)
- `backend/core/users/**/*.ts` (user service, repository)
- `backend/middleware/auth.middleware.ts`
- `backend/middleware/rate-limiter.ts` (auth rate limiters)
- `backend/middleware/csrf-protection.ts`
- `database/schemas/postgresql/001_core_tables.sql` (users, roles, permissions tables)
- `tests/unit/auth/**/*.test.ts`
- `tests/integration/auth/**/*.test.ts`

**Example prompt:**
*"Load `auth_pack` from 11_CONTEXT_PACKS.md and fix the JWT expiration issue."*

---

### crm_pack
**When:** contacts, deals, pipelines, activities, notes, tags, custom fields
**Size:** ~40 KB
**Files:**
- `backend/core/contacts/**/*.ts`
- `backend/core/deals/**/*.ts`
- `backend/core/activities/**/*.ts` (if exists)
- `backend/core/notes/**/*.ts` (if exists)
- `frontend/apps/crm-web/**/{contacts,deals}/**/*.tsx` (UI components, pick 2-3 representative)
- `database/schemas/postgresql/002_crm_tables.sql` (contacts table)
- `database/schemas/postgresql/003_deals_tables.sql`
- `tests/unit/contacts/**/*.test.ts`
- `tests/unit/deals/**/*.test.ts`

**Example prompt:**
*"Load `crm_pack` and add lead scoring to contacts."*

---

### ai_pack
**When:** AI assistant (Albedo), chat, insights, multi-provider integration
**Size:** ~25 KB
**Files:**
- `backend/services/ai*.ts` (ai multi-provider service, action executor)
- `backend/api/rest/v1/controllers/ai-controller.ts`
- `ai/**/**/*.ts` (JS AI modules, if exists)
- `ai/js-modules/**/*.ts`
- `tests/unit/ai/**/*.test.ts`

**Example prompt:**
*"Load `ai_pack` and add streaming support to the chat endpoint."*

---

### ui_pack
**When:** shared UI components, theming, hooks, utilities
**Size:** ~15 KB
**Files:**
- `frontend/components/common/**/*.tsx` (shared components)
- `frontend/hooks/**/*.ts` (custom React hooks)
- `frontend/lib/**/*.ts` (utilities, API clients)
- `frontend/apps/*/styles/**/*.css` (theme files, pick 1)

**Example prompt:**
*"Load `ui_pack` and create a reusable DataTable component with sorting."*

---

### security_pack
**When:** security audits, hardening, vulnerability fixes, rate limiting, input sanitization
**Size:** ~30 KB
**Files:**
- `backend/middleware/rate-limiter.ts`
- `backend/middleware/csrf-protection.ts`
- `backend/utils/sanitization/**/*.ts` (input sanitizer)
- `backend/middleware/auth.middleware.ts` (authorization checks)
- `docs/protocols/02_SECURITY.md` (security protocol)
- `docs/SECURITY_HARDENING.md` (if exists)
- `tests/unit/security/**/*.test.ts`

**Example prompt:**
*"Load `security_pack` and run an OWASP Top 10 audit on the API controllers."*

---

### performance_pack
**When:** performance optimization, indexing, caching, query optimization
**Size:** ~25 KB
**Files:**
- `backend/database/migrations/002_performance_optimization.sql` (indexes, materialized views)
- `backend/middleware/performance-monitoring.ts`
- `backend/database/postgresql/query-tracker.ts`
- `docs/protocols/09_PERFORMANCE.md` (performance protocol)
- `docs/PERFORMANCE_OPTIMIZATION.md` (if exists)

**Example prompt:**
*"Load `performance_pack` and add composite indexes for the dashboard queries."*

---

## Usage Rules

### Pack Selection
1. **One pack at a time** — Don't mix packs unless explicitly authorized
2. **Switch packs mid-session** — Say: *"Switch to `crm_pack` from 11_CONTEXT_PACKS.md"*
3. **Keep total <40 KB** — If a pack explodes, narrow to specific files for the task

### Pack Customization
**Need files outside the pack?**
Ask explicitly with byte caps:
- *"Also open backend/core/campaigns/email.service.ts (first 300 lines)"*

**Need to narrow a pack?**
Specify exact files:
- *"Load only backend/core/auth/auth.service.ts and tests/unit/auth/auth.test.ts from auth_pack"*

### Adding New Packs
If you need a new pack (e.g., `billing_pack`, `reporting_pack`):
1. Follow the template above
2. Keep size <40 KB
3. Group by feature surface, not technical layer
4. Update this file via PR

---

## Pack Performance Targets

| Pack | Size | Init Time | Tokens |
|------|------|-----------|--------|
| auth_pack | ~30 KB | <20 sec | ~7,500 |
| crm_pack | ~40 KB | <25 sec | ~10,000 |
| ai_pack | ~25 KB | <15 sec | ~6,000 |
| ui_pack | ~15 KB | <10 sec | ~3,500 |
| security_pack | ~30 KB | <20 sec | ~7,500 |
| performance_pack | ~25 KB | <15 sec | ~6,000 |

**Session start with pack:** README (50 KB) + pack (15-40 KB) + logs (10 KB) = **75-100 KB** (under 120 KB cap)

---

## Integration with Existing Protocols

Packs **complement** the existing protocol system:
- **README.md:** Core protocols (P0/P1/P2, verification codes, session start/end)
- **docs/ai/CLAUDE.md:** 90-second quick context
- **docs/protocols/:** 14 detailed protocol docs (security, testing, etc.)

**Workflow:**
1. Load pack for narrow scope
2. Reference existing protocols for detailed rules (e.g., `protocols/02_SECURITY.md` for OWASP checklist)
3. Follow README verification code system (`ANTI-DUP-CHECK-COMPLETE`, `SESSION-END-v3.0-COMPLETE`)

---

## Verification

When using packs, include in responses:
```
✅ CONTEXT PACK LOADED
Pack: [auth_pack / crm_pack / ai_pack / ui_pack / security_pack / performance_pack]
Files loaded: [count]
Byte usage: [X KB / 120 KB cap]
```
