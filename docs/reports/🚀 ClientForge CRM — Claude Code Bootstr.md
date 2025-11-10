🧠 ClientForge CRM - Elite AI Bootstrap Protocol v3.1
You are Claude Code operating in ClientForge CRM - Enterprise AI-Powered CRM System
🚨 CRITICAL: WORKSPACE & ARCHITECTURE
interface ClientForgeContext {
  workspace: "D:\\clientforge-crm",  // ⚠️ MANDATORY - ALL work happens here
  restriction: "NEVER access files outside D: drive without explicit permission",

  architecture: {
    databases: {
      PostgreSQL: "Primary DB - 17 tables, port 5432 (clientforge-crm-postgres-1)",
      MongoDB: "Structured logs with TTL, port 27017 (clientforge-crm-mongodb-1)",
      Elasticsearch: "Full-text search 13-25x faster, port 9200 (clientforge-crm-elasticsearch-1)",
      Redis: "Sessions/cache, port 6379 (clientforge-crm-redis-1)"
    },

    logging: {
      primary: "MongoDB via Winston transport (app_logs collection)",
      backup: "File logs in logs/ (fallback only)",
      rules: [
        "Use logger.info/error/warn - NEVER console.log",
        "No emoji - use [OK], [ERROR], [WARNING]",
        "Mask sensitive data (passwords, tokens, emails)",
        "All logs queryable in MongoDB"
      ]
    },

    data_flow: [
      "1. Client → API endpoint",
      "2. PostgreSQL → Write/read data (source of truth)",
      "3. Elasticsearch → Index for search",
      "4. MongoDB → Write audit log",
      "5. Redis → Cache/invalidate",
      "6. Response → Client"
    ]
  },

  current_state: "90% complete - polyglot architecture implemented",
  remaining: "Add Elasticsearch sync hooks to CRM services (30 min)",
  status: "Production-ready, all 4 databases running in Docker Desktop"
}
⚡ ELITE BOOTSTRAP SEQUENCE (Execute in Order)
Phase 1: Core Context Load (≈70 KB)
# STEP 1: Read master documentation (MANDATORY)
Read D:\clientforge-crm\README.md
Read D:\clientforge-crm\CHANGELOG.md

# Purpose: Load 50+ protocols, database architecture, workspace policy, P0/P1/P2 hierarchy
# Expected: Understand all 4 databases, logging architecture, D: drive restriction
Phase 2: Pack System Load (≈20 KB)
# STEP 2: Load pack system
Read D:\clientforge-crm\docs\claude\11_CONTEXT_PACKS.md

# Purpose: Identify available context packs for focused work
Phase 3: Select ONE Pack (≈15-40 KB)
Default: crm_pack unless user specifies otherwise Available packs:
auth_pack (~30 KB) — Authentication, RBAC, sessions, rate-limiting
crm_pack (~40 KB) — Contacts, accounts, deals, pipelines ✅ DEFAULT
ai_pack (~25 KB) — AI assistant (Albedo), OpenAI/Claude integration
ui_pack (~15 KB) — React components, Zustand store, hooks
security_pack (~30 KB) — Security audits, OWASP compliance
performance_pack (~25 KB) — Optimization, database indexes, caching
search_pack (~20 KB) — Elasticsearch integration, search API
Load syntax:
Load crm_pack from docs/claude/11_CONTEXT_PACKS.md
Phase 4: Recent Session Context (≈10 KB)
# STEP 3: Read last 2 session logs for continuity
Read last 2 files in D:\clientforge-crm\logs\session-logs\ (sorted by date, newest first)

# Purpose: Understand what was done previously, pending tasks
Phase 5: Budget Verification
Total context budget: <120 KB Breakdown:
README.md + CHANGELOG.md: ~70 KB
11_CONTEXT_PACKS.md: ~20 KB
Selected pack: ~15-40 KB
Session logs (2 files): ~10 KB
Total: ~115-140 KB
If >120 KB: Stop and ask user to narrow pack scope.
🛡️ OPERATING RULES (NON-NEGOTIABLE)
Hard Excludes (NEVER Read)
❌ node_modules/, .next/, dist/, .turbo/, coverage/, playwright-report/
❌ **/*.map, **/*.{png,jpg,jpeg,gif,svg,webp,mp4,avi}
❌ .env*, *.pem, secrets.*, credentials.*
❌ Raw logs >200 KB
❌ Database SQL dumps >100 KB (ask for specific path + byte cap)
Byte Caps
Initial session: <120 KB total context
Single file: <50 KB (use limit=300, offset=0 if needed)
Cumulative context >150 KB: STOP and ask: "Which narrower pack shall we load?"
When You Need More Context
Ask explicitly with byte cap:
"Open D:\clientforge-crm\backend\core\auth\user-service.ts (first 400 lines, ~15 KB)"
✅ STARTUP CONFIRMATION (REQUIRED RESPONSE)
After loading context, respond EXACTLY:
✅ ClientForge CRM Ready — Elite Bootstrap Complete

📦 Context Loaded:
   Pack: [auth_pack / crm_pack / ai_pack / ui_pack / security_pack / performance_pack / search_pack]
   Files Loaded: [count]
   Byte Usage: [X KB / 120 KB cap]

🗄️ Architecture Confirmed:
   PostgreSQL: ✅ Primary DB (port 5432)
   MongoDB: ✅ Structured logs (port 27017)
   Elasticsearch: ✅ Search engine (port 9200)
   Redis: ✅ Cache/sessions (port 6379)
   Workspace: D:\clientforge-crm (LOCKED)

📌 Current Phase: [from session logs]
📝 Last Session: [1-2 sentence summary from most recent log]
🎯 Next Step: [from session logs or "Awaiting instructions"]

Verification: README-v3.0-SESSION-INIT-COMPLETE
Keep summary ≤200 words.
🎯 PROTOCOL INTEGRATION
Existing ClientForge Protocols (ACTIVE)
✅ README.md v3.0.1: P0/P1/P2 protocols, verification codes, database architecture, logging rules ✅ docs/ai/CLAUDE.md: 90-second quick context compression ✅ docs/protocols/: 14 protocol docs (security, testing, dependencies, breaking changes, etc.) ✅ Verification codes: ANTI-DUP-CHECK-COMPLETE, DEP-CHAIN-CHECK-COMPLETE, SESSION-END-v3.0-COMPLETE
Pack System Additions
✅ docs/claude/10_CONTEXT_POLICY.md: Byte caps, PII/secrets exclusion rules ✅ docs/claude/11_CONTEXT_PACKS.md: Named file bundles for focused work ✅ docs/claude/16_REVIEW_RUBRIC.md: 8-dimension PR review scorecard (0-5 scale)
Core Protocol Reminders
UPDATE > CREATE: Search 2-3 minutes before creating any file
D: Drive Only: Never access files outside D:\clientforge-crm\ without permission
MongoDB Logging: Use logger.info/error/warn, never console.log, no emoji
Database Flow: PostgreSQL → Elasticsearch → MongoDB → Redis (in that order)
85%+ Test Coverage: Required for all new code
Zero 'any' Types: Explicit typing mandatory
Deep Folders: 3-4 levels minimum (never shallow placement)
🔍 QUALITY GATE (8-Dimension Rubric)
When reviewing code, apply docs/claude/16_REVIEW_RUBRIC.md:
Correctness (0-5): Logic, business rules, edge cases
Type-Safety (0-5): No any, explicit types, strict null checks
Security (0-5): OWASP compliance, input validation, auth checks
Observability (0-5): Structured logging, error handling, monitoring
DX/Ergonomics (0-5): Clear APIs, good naming, documentation
Test Coverage (0-5): 85%+ coverage, unit + integration + e2e
Incrementality (0-5): Small PRs, feature flags, rollback safety
Risk Control (0-5): Dependency checks, breaking change detection
Scoring thresholds:
36-40/40 (90%+): ✅ Approve
30-35/40 (75-89%): ✅ Approve with comments
<30/40 (<75%): ❌ Request changes
Always cite evidence: file.ts:line
🔄 MID-SESSION PACK SWITCHING
When switching context packs:
Switch to performance_pack from docs/claude/11_CONTEXT_PACKS.md
Claude will:
Drop current pack files from context
Load new pack (~15-40 KB)
Confirm with verification code:
✅ PACK SWITCHED
Previous: crm_pack
New: performance_pack
Files Loaded: [count]
Byte Usage: [X KB / 120 KB cap]
Verification: PACK-SWITCH-COMPLETE
📋 EXAMPLE BOOTSTRAP (COPY-PASTE READY)
For instant initialization, paste this:
Read README.md and CHANGELOG.md. Then load crm_pack from docs/claude/11_CONTEXT_PACKS.md. Then read the last 2 files in logs/session-logs/. Confirm all 4 databases (PostgreSQL, MongoDB, Elasticsearch, Redis) are understood. Workspace is D:\clientforge-crm only.
Expected outcome:
✅ 90-second bootstrap (vs ~5 min traditional)
✅ <120 KB context loaded
✅ All 4 databases understood
✅ D: drive workspace locked
✅ Logging architecture clear (MongoDB primary, files backup)
✅ Ready to build features
🚀 VERIFICATION CODES (Include in Responses)
Session Initialization
✅ INITIALIZATION COMPLETE
Verification Code: README-v3.0-SESSION-INIT-COMPLETE
Pack Loaded: [pack_name]
Byte Usage: [X KB / 120 KB cap]
Workspace: D:\clientforge-crm (LOCKED)
Databases: PostgreSQL + MongoDB + Elasticsearch + Redis (ALL CONFIRMED)
Logging: MongoDB primary, files backup (UNDERSTOOD)
File Creation
File Creation Authorized: [filename]
Search Duration: 2-3 minutes
Similar Files Found: [none or list]
Reason: [explanation]
Verification: ANTI-DUP-CHECK-COMPLETE
File Modification
Modification Check:
- Dependencies checked: yes
- Breaking change risk: [HIGH/MEDIUM/LOW]
- Downstream files affected: [count]
- Tests updated: yes
Verification: DEP-CHAIN-CHECK-COMPLETE
Session End
✅ SESSION END PROTOCOL COMPLETE
CHANGELOG Updated: yes
Session Log Created: logs/session-logs/YYYY-MM-DD-task-name.md
Files Created: [count] - [list]
Files Modified: [count] - [list]
Tests Added: [count]
Verification: SESSION-END-v3.0-COMPLETE
💡 ELITE FEATURES (What Makes This v3.1)
1. Zero-Confusion Database Architecture
All 4 databases documented with ports, roles, Docker container names
Clear data flow: PostgreSQL → Elasticsearch → MongoDB → Redis
Understand search is 13-25x faster than PostgreSQL LIKE queries
2. Crystal-Clear Logging
MongoDB primary (app_logs collection via Winston)
File logs are backup only
No emoji, no console.log, mask sensitive data
TTL: 7 days (app), 30 days (error), 90 days (audit)
3. D: Drive Workspace Lock
All work in D:\clientforge-crm\
C: drive READ-ONLY
Other drives require explicit permission
4. Context Budget Mastery
<120 KB initial load
Pack system for focused work
Byte caps on all reads
5. Quality Gate Integration
8-dimension rubric (0-5 scale)
90%+ threshold for approval
Evidence-based reviews with file:line citations
🎯 READY STATE CHECKLIST
Before starting any task, verify:
✅ README.md read (database architecture, logging, workspace policy)
✅ CHANGELOG.md read (recent changes, current state)
✅ Pack loaded (crm_pack default or user-specified)
✅ Last 2 session logs read (continuity)
✅ Byte budget <120 KB
✅ All 4 databases understood (PostgreSQL, MongoDB, Elasticsearch, Redis)
✅ Logging architecture clear (MongoDB primary, files backup)
✅ D: drive workspace locked
✅ Verification code ready
If ALL checked: Respond with startup confirmation and await instructions. If ANY missing: Complete initialization first.
Built with ❤️ by Abstract Creatives LLC Version: 3.1.0 (Elite Bootstrap Edition) Last Updated: 2025-11-07 🚀 90-second bootstrap - Zero confusion - Production ready! 🚀


