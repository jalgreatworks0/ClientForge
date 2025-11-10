# ClientForge CRM — Claude Context Policy

## Hard Excludes (Never Load)
- `node_modules/`, `.next/`, `dist/`, `.turbo/`, `coverage/`, `playwright-report/`
- `**/*.map`, `**/*.{png,jpg,jpeg,gif,mp4,svg,webp}`
- Raw logs > 200 KB; binary dumps; screenshots; exported reports
- `.env*`, `*.pem`, `secrets.*`, private keys, credentials; use `.env.example` only
- Database SQL files > 100 KB (load selectively with offsets)

## Byte & Scope Caps
- **Initial session read target:** <120 KB total
- **Single file read cap:** <50 KB (use line/byte ranges)
- **Context threshold:** If cumulative context > 150 KB, STOP and propose a narrower **context pack** (see [11_CONTEXT_PACKS.md](11_CONTEXT_PACKS.md))

## PII/Secrets Handling
- NEVER load secrets. Redact tokens/passwords with `[REDACTED]` in logs
- Avoid pasting production URLs/IDs; prefer fixtures
- When reading logs, ask for sanitized versions

## Session Start Protocol (Fast Path)

**Traditional (5 min):**
1. Read `README.md` (1,210 lines, all protocols)
2. Read `docs/07_CHANGELOG.md` (recent changes)
3. Read last 2 `logs/session-logs/*` files

**Pack-based (90 sec):**
1. Read `README.md` **once** per session (core protocols loaded)
2. Load **one** pack from [11_CONTEXT_PACKS.md](11_CONTEXT_PACKS.md):
   - Auth work → `auth_pack` (~30 KB)
   - Contacts/deals → `crm_pack` (~40 KB)
   - AI assistant → `ai_pack` (~25 KB)
   - UI components → `ui_pack` (~15 KB)
   - Security audit → `security_pack` (~30 KB)
   - Performance → `performance_pack` (~25 KB)
3. Load last **two** `logs/session-logs/*` files (≤5 KB each)

**Total:** ~50 KB (README) + 15-40 KB (pack) + 10 KB (logs) = **75-100 KB** (under 120 KB cap)

## Asking for More Context
- When necessary, ask to open **exact paths** with **byte caps**
- Example: *"Open backend/core/auth/user.service.ts first 400 lines"*
- NEVER mass-read directories; always specify files or globs with limits

## Edit Rules
- Prefer **small, reversible diffs** (<300 LOC per PR)
- No dependency bumps unless a blocker is proven with evidence
- All changes must include: types, tests (as applicable), and brief docs snippet
- Follow existing protocols: UPDATE > CREATE, deep folders (3-4 levels), 85%+ coverage

## Verification
When following this policy, include in responses:
```
✅ CONTEXT POLICY COMPLIANT
Pack loaded: [auth_pack / crm_pack / ai_pack / ui_pack / security_pack / performance_pack]
Byte usage: [X KB / 120 KB cap]
Files opened: [count]
```

## Integration with Existing Protocols
This policy **complements** existing ClientForge protocols:
- README.md: Core protocols (P0/P1/P2 hierarchy)
- docs/ai/CLAUDE.md: 90-second quick context
- docs/protocols/00_QUICK_REFERENCE.md: One-page cheat sheet
- docs/protocols/: 14 detailed protocol docs

**Use packs to narrow initial context, then reference existing protocols for detailed rules.**
