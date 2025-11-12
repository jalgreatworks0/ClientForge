# Session Start: ClientForge CRM (60 seconds)

**Last Updated:** November 11, 2025

## Quick Start Protocol

### 1. Read These Files (Order Matters)
1. **[README.md](../../README.md)** — Project overview & setup
2. **[docs/00_MAP.md](../../docs/00_MAP.md)** — Codebase map & architecture
3. **[docs/07_CHANGELOG.md](../../docs/07_CHANGELOG.md)** — Recent changes
4. **[.claude/CONTEXT/crm_pack.md](../CONTEXT/crm_pack.md)** — Default context pack

### 2. Load Live Signals (Always Fresh)
- **[.claude/INBOX/errors.json](../INBOX/errors.json)** — Recent error summaries
- **[.claude/INBOX/mcp_status.json](../INBOX/mcp_status.json)** — MCP router + servers health
- **[.claude/INBOX/lmstudio_status.json](../INBOX/lmstudio_status.json)** — LM Studio API status

### 3. Verify System Health
```bash
npm run typecheck && npm run lint && npm run test -- --runInBand && npm run errors:check
```

### 4. Confirm Initialization
Output this exact block after reading:

```
✅ INITIALIZATION COMPLETE
Packs: [crm_pack, db_pack, agents_pack]
Signals: [errors: X items, mcp: STATUS, lmstudio: STATUS]
Protocols: P0/P1/P2 active
Ready: yes
```

---

## Protocol Levels

### P0: Critical (NEVER Skip)
- **Anti-duplication:** Check existing implementations before writing new code
- **Dependency chain:** Verify imports/deps won't create cycles
- **Test gates:** New features require tests (unit + integration)

### P1: Important (Skip Only If User Explicitly Says So)
- **Type safety:** No `any` without explicit justification
- **Error handling:** Use AppError system (RFC7807)
- **Documentation:** Update relevant docs when changing behavior

### P2: Best Practice (Use When Practical)
- **Performance:** Consider caching, pagination for large datasets
- **Security:** OWASP Top 10 awareness
- **Logging:** Structured logs with correlation IDs

---

## Quick Reference

### Project Tech Stack
- **Backend:** Node.js + Express + TypeScript
- **Frontend:** React + TypeScript + Tailwind CSS
- **Database:** PostgreSQL + MongoDB + Redis
- **Search:** Elasticsearch
- **Queue:** RabbitMQ
- **Storage:** MinIO (S3-compatible)
- **Testing:** Jest + Playwright
- **AI/Agents:** MCP servers, LM Studio integration

### Key Directories
```
backend/          — Express API (modules, routes, middleware)
frontend/         — React SPA
agents/           — MCP servers & tools
docs/             — Architecture, guides, runbooks
scripts/          — Build, deploy, utility scripts
tests/            — Jest unit & integration tests
e2e/              — Playwright end-to-end tests
```

### Common Commands
```bash
npm run dev:backend      # Start backend dev server
npm run dev:frontend     # Start frontend dev server (in frontend/)
npm run docker:dev       # Start all services (Docker Compose)
npm run typecheck        # TypeScript check all
npm run lint             # ESLint check all
npm run test             # Jest tests
npm run errors:check     # Verify error system integrity
npm run mcp:all          # Start all MCP services
```

---

## Session End Protocol

Before completing any task:
1. Run verification suite (see #3 above)
2. Update CHANGELOG.md if public-facing changes
3. Commit with descriptive message
4. Output: `SESSION COMPLETE: [summary of changes]`

---

*This file is auto-read at session start. Keep it under 50KB.*
