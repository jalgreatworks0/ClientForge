# 🧠 ClientForge CRM v3.0 - Enterprise AI Development System

**META**: Ultimate AI-Assisted Development Platform | 50+ Intelligence Protocols | Production-Grade
**FOR**: Claude Code, All AI Coding Assistants
**PROJECT**: ClientForge CRM v3.0 - Abstract Creatives LLC
**VERSION**: 3.0.1 (Production-Ready Edition)
**LAST UPDATED**: 2025-11-10

---

## 🚨 WORKSPACE RESTRICTIONS (CRITICAL)

**D: DRIVE WORKSPACE POLICY - MANDATORY**

```typescript
interface WorkspacePolicy {
  authorized_drives: ["D:"],
  workspace_root: "D:\\clientforge-crm",

  rules: {
    D_drive: "FULL ACCESS - All work happens here",
    C_drive: "READ-ONLY - System files, require permission to modify",
    other_drives: "NO ACCESS - Must ask user permission first"
  },

  violations: {
    working_outside_D: "STOP and ask user permission",
    creating_files_on_C: "STOP and ask user permission",
    accessing_other_drives: "STOP and ask user permission"
  }
}
```

**AI: Before accessing ANY file outside `D:\\clientforge-crm\\`, you MUST ask user permission.**

**Examples:**
- ✅ `D:\\clientforge-crm\\backend\\services\\user-service.ts` - OK
- ✅ `D:\\clientforge-crm\\docs\\protocols\\00_QUICK_REFERENCE.md` - OK
- ❌ `C:\\Users\\...\\file.txt` - STOP, ask permission
- ❌ `E:\\other-project\\file.ts` - STOP, ask permission

---

## 🚀 SESSION BOOTSTRAP (COPY-PASTE)

**Paste this phrase at the start of each session for instant initialization:**

> Read `README.md` once, then load one pack from `docs/claude/11_CONTEXT_PACKS.md` (default `crm_pack`), then read the last two files in `logs/session-logs/`. Do not open any other files unless you ask with a byte cap (<50 KB per file). Use `docs/claude/16_REVIEW_RUBRIC.md` for reviews.

**Verification:** `README-v3.0-SESSION-INIT-COMPLETE`

---

## 🚨 CRITICAL: AI INITIALIZATION CHECKPOINT

**STOP! Before proceeding, AI assistants MUST complete this initialization:**

### Initialization Verification Protocol

**If you are an AI assistant and this is your first interaction in this session:**

1. **IMMEDIATELY** respond to the user with: "I need to initialize properly. Give me 2 minutes to read the required documentation files."

2. **THEN read these files IN ORDER** (use the Read tool for each):
   - `docs/ai/CLAUDE.md` - READ FIRST (90 seconds)
   - `README.md` (this file) - Project overview
   - `docs/ai/QUICK_START_AI.md` - AI quick start
   - `docs/protocols/00_QUICK_REFERENCE.md` - Protocol cheat sheet
   - `docs/07_CHANGELOG.md` - Recent changes
   - `docs/00_MAP.md` - Project structure

3. **AFTER reading all files**, respond with the Session Initialization Report (template in Section: "Session Start Protocol")

4. **ONLY THEN** proceed with the user's request

### Initialization Verification Code

**When you complete initialization, include this verification code in your response:**

```
✅ INITIALIZATION COMPLETE
Verification Code: README-v3.0-SESSION-INIT-COMPLETE
Files Read: [list the files you actually read]
Protocols Active: P0 (5), P1 (10), P2 (15)
Ready for Task: [yes/no]
```

**If you skip initialization:**
- You WILL create duplicate files
- You WILL violate file organization rules
- You WILL break existing functionality
- You WILL waste user's time with rework

---

## ⚡ AI QUICK LOAD (30-SECOND SCAN)

```typescript
interface QuickContextComprehension {
  // PROJECT IDENTITY
  name: "ClientForge CRM v3.0",
  owner: "Abstract Creatives LLC",
  purpose: "Enterprise AI-powered CRM with multi-database architecture",

  // WORKSPACE (CRITICAL)
  workspace: "D:\\clientforge-crm",
  restriction: "ONLY work in D: drive - ask permission for other drives",

  // ARCHITECTURE
  stack: {
    frontend: "React 18 + TypeScript + Vite + Zustand + Tailwind",
    backend: "Node.js 18 + Express + TypeScript + MODULAR PLUGIN ARCHITECTURE ✨",
    databases: {
      PostgreSQL: "Primary DB - 17 tables, transactional data (port 5432)",
      MongoDB: "Structured logs with TTL (port 27017)",
      Elasticsearch: "Full-text search, fuzzy matching (port 9200)",
      Redis: "Sessions, cache, rate limiting (port 6379)"
    },
    docker: "All 4 databases visible in Docker Desktop",
    modules: "Plugin system - add/remove modules with 1 line change (NEW!)"
  },

  // LOGGING (CRITICAL - NO CONFUSION)
  logging: {
    primary: "MongoDB via Winston transport (app_logs collection)",
    backup: "File logs in logs/ directory (fallback only)",
    rules: [
      "Use logger.info/error/warn (never console.log)",
      "No emoji in logs (use [OK], [ERROR], [WARNING])",
      "Mask sensitive data (passwords, tokens, emails)",
      "All logs queryable in MongoDB"
    ]
  },

  // DATA FLOW
  typical_request: [
    "1. Client → API endpoint",
    "2. PostgreSQL → Write/read data",
    "3. Elasticsearch → Index for search",
    "4. MongoDB → Write audit log",
    "5. Redis → Cache/invalidate",
    "6. Response → Client"
  ],

  // QUALITY REQUIREMENTS
  quality: {
    test_coverage: "85%+ required",
    search_before_create: "2-3 minutes mandatory",
    folder_depth: "3-4 levels minimum",
    type_safety: "Zero 'any' types",
    protocols: "50+ P0/P1/P2 protocols active"
  },

  // STATE
  current_state: "Core CRM complete, Email Integration 85%, MODULAR PLUGIN ARCHITECTURE ✅",
  completed_sessions: [
    "Session 1-3: Core CRM + Email + Analytics",
    "Session 4: Modular Plugin Architecture (MAJOR UPGRADE)"
  ],
  remaining: "Email Integration UI (15%), Extract individual modules (optional), New features as modules",
  status: "Production-ready + Plugin architecture - Add modules with 1 line!"
}

// ⚠️ AI: DO NOT scan and start building immediately
// ⚠️ AI: You MUST read 6 required files first (see CRITICAL section above)
// ⚠️ AI: You MUST include verification codes in your responses
// ⚠️ AI: Skipping initialization = duplicate files + broken functionality + wasted time
// ⚠️ AI: ONLY work in D:\\clientforge-crm\\ - ask permission for other drives
```

### 🎯 Quick Protocol Reminder (After You've Initialized)

**If you haven't read all 6 required files, STOP and go back to the CRITICAL section above.**

**If you HAVE properly initialized, remember these core rules:**

1. **SEARCH 2-3 MIN** before creating ANY file → Include `ANTI-DUP-CHECK-COMPLETE` code
2. **CHECK DEPENDENCIES** before modifying ANY file → Include `DEP-CHAIN-CHECK-COMPLETE` code
3. **DEEP FOLDERS** (3-4 levels) → Never shallow placement
4. **85%+ TEST COVERAGE** → Always write tests
5. **10 MIN SESSION END** → Update CHANGELOG + Create session log + Include `SESSION-END-v3.0-COMPLETE` code

**Verification codes are NOT optional. They prove you followed the protocol.**

---

## 📑 TABLE OF CONTENTS

### 🔥 CRITICAL (Read Every Session)
- [🚀 Session Start Protocol](#-session-start-protocol-mandatory) - 5-minute initialization
- [📁 File Organization Rules](#-file-organization-rules-ironclad) - Zero tolerance policy
- [🎯 Anti-Duplication System](#-anti-duplication-system-p0-critical) - UPDATE > CREATE
- [🔗 Dependency Chain Awareness](#-dependency-chain-awareness-p1-essential) - Prevent breaks
- [⏰ Session End Protocol](#-session-end-protocol-mandatory) - 10-minute documentation

### ⭐ ESSENTIAL PROTOCOLS
- [🛡️ Security Implication Check](#️-security-implication-check-p1-essential) - Auto security review
- [🧪 Test Coverage Requirements](#-test-coverage-requirements-p1-essential) - 85%+ coverage
- [💥 Breaking Change Detection](#-breaking-change-detection-p0-critical) - API safety
- [📊 Code Quality Enforcement](#-code-quality-enforcement-p1-essential) - 9-point check

### 📚 PROJECT INFORMATION
- [🌟 Project Overview](#-project-overview) - Identity, stack, features
- [🏗️ Architecture & Structure](#️-architecture--structure) - 413 directories
- [🎨 Conventions & Patterns](#-conventions--patterns) - Naming, structure
- [🔗 Quick Reference Links](#-quick-reference-links) - All protocol docs

---

## 🚀 QUICK START FOR DEVELOPERS

**Want to run the app immediately?**

```bash
# One-command startup (starts everything)
.\start-clientforge.bat
```

This will:
- ✅ Start all Docker services (PostgreSQL, MongoDB, Redis, Elasticsearch)
- ✅ Launch backend API on http://localhost:3000
- ✅ Launch frontend UI on http://localhost:3001
- ✅ Automatically open your browser to the login page

**For detailed setup instructions, troubleshooting, and database management, see [STARTUP-GUIDE.md](STARTUP-GUIDE.md).**

---

## 🌟 PROJECT OVERVIEW

### Identity

**ClientForge CRM v3.0** - Enterprise-grade, AI-powered Customer Relationship Management system by **Abstract Creatives LLC**. Built to scale from startup to enterprise with cutting-edge AI integration at every layer.

### Technology Stack

**Frontend**: React 18, TypeScript 5.3, Vite, Tailwind CSS, Zustand, shadcn/ui, @dnd-kit (drag-and-drop)
**Backend**: Node.js 18+, Express, TypeScript 5.3, **Modular Plugin Architecture** ✨ (NEW!)
**Databases**: PostgreSQL 15+ (primary), MongoDB 6 (logs), Elasticsearch 8.11.0 (search), Redis 7 (cache/sessions)
**Queue System**: BullMQ v3.15.8 (migrated from Bull) - 5 workers with DLQ, Prometheus metrics
**Email Integration**: googleapis (Gmail OAuth2), @microsoft/microsoft-graph-client (Outlook)
**AI/ML**: OpenAI GPT-4, Anthropic Claude 3.5, Custom ML pipeline
**DevOps**: Docker Desktop, Docker Compose, GitHub
**Testing**: Jest, Supertest, Playwright (target 85%+ coverage)

### 🧩 Modular Plugin Architecture (NEW!)

**ClientForge now uses a plugin-based architecture where modules can be added/removed with ZERO core changes:**

```typescript
// Add a new module = add 1 line
import { reportingModule } from './modules/reporting/module';
moduleRegistry.register(reportingModule);  // ← That's it!

// Remove a module = comment out 1 line
// moduleRegistry.register(reportingModule);  // ← Disabled
```

**Key Features**:
- ✅ **Zero Core Changes**: Add/remove modules without touching server.ts or routes.ts
- ✅ **Event-Driven**: Modules communicate via event bus (fully decoupled)
- ✅ **Feature Flags**: Safe rollout with percentage-based targeting
- ✅ **Graceful Degradation**: Failed modules don't crash the server
- ✅ **100% Backward Compatible**: All existing routes wrapped in core module

**New API Endpoints**:
- `GET /api/v1/modules` - List all registered modules
- `GET /api/v1/health` - Per-module health status
- `GET /api/v1/events/stats` - Event bus statistics

**Documentation**:
- [Complete Module System Guide](docs/MODULE_SYSTEM.md) - 650+ lines
- [Migration Checklist](MIGRATION_CHECKLIST.md) - Implementation guide

**Performance**: +50ms startup, 0ms runtime overhead

### Database Architecture (Polyglot Persistence)

**ClientForge uses a 4-database polyglot architecture - each optimized for specific workloads:**

```typescript
interface DatabaseArchitecture {
  PostgreSQL: {
    role: "Primary Database - Source of Truth",
    port: 5432,
    usage: [
      "Users, Contacts, Accounts, Deals (17 tables)",
      "Transactional data with ACID compliance",
      "Relational data with foreign keys",
      "Multi-tenant isolation via tenant_id"
    ],
    location: "docker: clientforge-crm-postgres-1",
    connection: "DATABASE_URL in .env"
  },

  MongoDB: {
    role: "Structured Logging & Time-Series Data",
    port: 27017,
    usage: [
      "Application logs (Winston MongoDB transport)",
      "Audit logs (90-day TTL)",
      "Error logs (30-day TTL)",
      "Event logs (30-day TTL)"
    ],
    location: "docker: clientforge-crm-mongodb-1",
    connection: "MONGODB_URI in .env (authSource=admin)",
    features: "Auto-expiring data via TTL indexes"
  },

  Elasticsearch: {
    role: "Full-Text Search Engine",
    port: 9200,
    version: "8.11.0",
    usage: [
      "Unified search across contacts/accounts/deals",
      "Fuzzy matching with typo tolerance",
      "Autocomplete suggestions",
      "13-25x faster than PostgreSQL LIKE queries"
    ],
    location: "docker: clientforge-crm-elasticsearch-1",
    connection: "ELASTICSEARCH_URL in .env",
    indexes: ["contacts", "accounts", "deals"]
  },

  Redis: {
    role: "In-Memory Cache, Sessions & Queue Backend",
    port: 6379,
    usage: [
      "Session storage (7-day TTL)",
      "BullMQ job queue storage (noeviction policy)",
      "Rate limiting (distributed)",
      "Cache layer (sub-millisecond lookups)",
      "Temporary data with auto-expiry"
    ],
    location: "docker: clientforge-crm-redis-1",
    connection: "REDIS_URL in .env",
    configuration: "maxmemory-policy noeviction (critical for BullMQ)"
  },

  BullMQ: {
    role: "Background Job Queue System",
    version: "3.15.8",
    usage: [
      "Email synchronization (every 5 minutes)",
      "Elasticsearch indexing (data-sync queue)",
      "File processing (virus scanning, uploads)",
      "AI embedding generation (rate-limited)",
      "User notifications (high concurrency)"
    ],
    features: [
      "Dead Letter Queue (DLQ) for failed jobs",
      "Automatic retry with exponential backoff",
      "Prometheus metrics integration",
      "Graceful shutdown handlers",
      "5 workers with optimized concurrency"
    ],
    configuration: "config/queue/bullmq.config.ts",
    workers: "backend/workers/queue-workers.ts"
  }
}

```

**Data Flow Example - Creating a Contact:**
```
1. User → POST /api/v1/contacts
2. PostgreSQL → INSERT contact (source of truth)
3. Elasticsearch → Index contact for search
4. MongoDB → Write audit log
5. Redis → Clear cache (if exists)
6. User ← 201 Created response
```

**Search Flow Example - Finding "John Smith":**
```
1. User → GET /api/v1/search?q=John Smith
2. Elasticsearch → Multi-match fuzzy query across all indexes
3. Results → Ranked by relevance with highlights
4. Response time: ~15ms (vs ~200ms with PostgreSQL)
```

**See Complete Documentation:**
- [DATA_STORAGE_AUDIT.md](docs/DATA_STORAGE_AUDIT.md) - Architecture analysis
- [IMPLEMENTATION_COMPLETE.md](IMPLEMENTATION_COMPLETE.md) - Setup guide
- [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Current status

### Core Features

#### ✅ Fully Implemented (100%)
- **Contact Management** - Advanced CRM with custom fields, tags, segmentation, full CRUD operations
- **Deal Pipeline** - Drag-and-drop Kanban board (@dnd-kit), multi-pipeline support, 6-stage default pipeline (Lead → Qualification → Proposal → Negotiation → Won/Lost), probability tracking (0-100%), weighted revenue forecasting, stage history tracking, bulk operations
- **Email Integration** - 100% Complete: Gmail & Outlook OAuth2 integration, bidirectional sync (every 5 minutes), full inbox UI, compose/reply, CRM linking (contacts/deals), background job processing with Bull queue
- **Reporting & Analytics Dashboard** - 100% Complete: 6 REST API endpoints with PostgreSQL aggregations, interactive charts (revenue trend, sales funnel, lead sources), team performance metrics, date range filters, CSV/PDF export functionality
- **AI-Powered Features** - 100% Complete: Lead Scoring with ML (0-100 scores, A-F grades, hot/warm/cold priority), Next Action Suggestions (analyzes deal context, suggests calls/emails/meetings with timing), AI Email Composition (purpose-driven, tone-adjustable, personalized), Pattern Recognition (identifies at-risk deals, upsell/cross-sell opportunities, expansion readiness), Sentiment Analysis (email emotion detection, urgency levels, trend tracking)

#### 🟡 In Progress (Partial Implementation)
- **AI Companion (Albedo)** - Natural language interface, chat functionality, action execution
- **User Management** - Authentication, authorization, role-based access control implemented

#### 📋 Planned Features
- **Campaign Management** - Multi-channel (email, SMS, social), A/B testing
- **Workflow Automation** - Visual builder, triggers, actions, AI-driven routing
- **Advanced Analytics** - ML-powered insights, predictive analytics, forecasting with AI
- **Document Management** - Secure storage, versioning, OCR, auto-categorization

### Project Structure (D: Drive - Organized Folders)

```
D:/clientforge-crm/                    # PRIMARY WORKSPACE - All work happens here
├── backend/                           # Backend services (100+ files)
│   ├── api/                          # API routes, controllers, middleware
│   │   ├── rest/v1/routes/          # RESTful API endpoints
│   │   │   ├── auth-routes.ts       # Authentication endpoints
│   │   │   ├── contacts-routes.ts   # Contact management ✅
│   │   │   ├── deals-routes.ts      # Deal management ✅
│   │   │   ├── pipelines-routes.ts  # Pipeline CRUD ✅
│   │   │   ├── deal-stages-routes.ts # Deal stages ✅
│   │   │   └── email-routes.ts      # Email integration (OAuth, sync, send) ✅
│   │   └── server.ts                # Express app configuration (async service init) ✅
├── backend/services/auth/            # Authentication and SSO services (NEW - THIS IMPLEMENTATION)
│   ├── sso/                          # Single Sign-On implementations
│   │   ├── sso-provider.service.ts    # Main SSO provider manager
│   │   ├── google-oauth.provider.ts   # Google OAuth 2.0 implementation  
│   │   ├── microsoft-oauth.provider.ts # Microsoft Azure AD implementation
│   │   └── saml.provider.ts           # SAML 2.0 implementation
│   ├── mfa/                          # Multi-Factor Authentication services  
│   │   ├── totp.service.ts            # TOTP (Time-based One-Time Password) implementation
│   │   └── backup-codes.service.ts    # Backup codes management
├── backend/api/rest/v1/routes/      # API routes including new SSO/MFA endpoints
│   └── sso-routes.ts                # New SSO and MFA routes (NEW - THIS IMPLEMENTATION)
├── frontend/components/Auth/        # Authentication UI components (NEW - THIS IMPLEMENTATION)
│   ├── SSO/                         # Single Sign-On components  
│   │   └── SSOLoginButton.tsx       # SSO login buttons for providers
│   └── MFA/                         # Multi-Factor Authentication components
│       ├── MFASetup.tsx             # MFA setup flow with QR code and backup codes
│       └── TOTPVerification.tsx     # TOTP verification component
├── database/migrations/             # Database schema migrations (NEW - THIS IMPLEMENTATION)
│   └── 20251110_sso_mfa_tables.ts    # Migration for SSO and MFA tables
├── database/schema/                 # Database schema files (NEW - THIS IMPLEMENTATION)
│   └── sso-mfa-schema.sql           # SQL schema definitions for SSO/MFA features
├── docs/                              # Documentation system (95% organized) ✅
│   ├── sso-mfa-implementation.md      # Implementation documentation for SSO and MFA (NEW - THIS IMPLEMENTATION)
│   └── protocols/                   # 15 development protocols
├── tests/                             # Test suites (Jest, Playwright)
│   └── unit/services/auth/          # Unit tests for auth services (NEW - THIS IMPLEMENTATION)
│       ├── sso-provider.service.test.ts
│       └── totp.service.test.ts
└── README.md                          # This file - AI initialization guide
```

**AI: All your work should be within `D:\\clientforge-crm\\`. Never create files outside this directory without permission.**

---

## 🚀 SESSION START PROTOCOL (MANDATORY)

### Execute Every Session (5 Minutes)

**AI: This is MANDATORY. Project quality depends on proper initialization.**

### ⚠️ COMPLIANCE CHECK: Did you read all required files?

**Before you proceed, verify you have actually READ (not just seen) these files:**

- [ ] docs/ai/CLAUDE.md - Did you use the Read tool on this file? (yes/no)
- [ ] README.md - Did you use the Read tool on this file? (yes/no)
- [ ] docs/ai/QUICK_START_AI.md - Did you use the Read tool? (yes/no)
- [ ] docs/protocols/00_QUICK_REFERENCE.md - Did you use the Read tool? (yes/no)
- [ ] docs/07_CHANGELOG.md - Did you use the Read tool? (yes/no)
- [ ] docs/00_MAP.md - Did you use the Read tool? (yes/no)

**If ANY checkbox is unchecked, STOP and read those files NOW using the Read tool.**

**Self-Verification Question:** Can you answer these WITHOUT re-reading?
1. What is the project's anti-duplication philosophy? (UPDATE > CREATE or CREATE > UPDATE?)
2. How many minutes must you search before creating a new file? (answer: ___)
3. How many directory levels deep should files be placed? (answer: ___)
4. What percentage test coverage is required? (answer: ___%)
5. What is the verification code for initialization? (hint: see top of README)

**If you cannot answer all 5 questions, you did NOT properly read the files. Go read them now.**

#### Step 1: Read Master Instructions (2 minutes)
```
✓ docs/ai/CLAUDE.md - 90-second quick reference (READ FIRST!)
✓ README.md (this file) - Project overview & critical protocols
✓ docs/ai/QUICK_START_AI.md - AI-specific quick start guide
✓ docs/protocols/00_QUICK_REFERENCE.md - One-page cheat sheet
```

**IMPORTANT**: docs/ai/CLAUDE.md must be explicitly read at the start of EVERY session. It contains the essential context compression - read it before README.md for fastest initialization.

#### Step 2: Read Recent Context (2 minutes)
```
✓ docs/07_CHANGELOG.md - Recent changes
✓ logs/session-logs/ - Last 2-3 session logs
✓ docs/00_MAP.md - Current project structure
```

#### Step 3: Confirm Understanding (1 minute)

Answer these 5 questions:
1. **What was done in last session?** → Context continuity
2. **What is current project state?** → Current priorities
3. **What am I being asked to do today?** → Task clarity
4. **Do I have a clear implementation plan?** → Execution readiness
5. **Have I reserved 10 minutes for documentation?** → Time management

#### Step 4: Report to User

```
✅ Session Initialized Successfully

📚 Context Loaded:
- README.md: 50+ protocols active
- Last Session: [summary from session log]
- Current State: [from MAP.md and CHANGELOG.md]

🎯 Task Understanding:
- Request: [what user asked for]
- Approach: [implementation strategy]
- Time Estimate: [based on complexity]
- Protocols Active: All P0/P1 protocols engaged

⏰ Documentation Reserved: Last 10 minutes

Ready to begin! 🚀
```

---

## 📁 FILE ORGANIZATION RULES (IRONCLAD)

### CRITICAL RULE #1: Minimal Files in Root

**This is non-negotiable. Violation = immediate correction.**

#### Allowed in Root:
```
Documentation: README.md, CLAUDE.md, LICENSE
Configuration: .dockerignore, .editorconfig, .env.example, .eslintrc.json,
               .gitignore, .nvmrc, .prettierrc, .claudeignore
Build/Deploy: docker-compose.yml, Dockerfile, Makefile
Package: package.json, package-lock.json, tsconfig.json, turbo.json, lerna.json
```

**Note**: README.md is the ONLY .md file allowed in root directory. All other documentation (including CLAUDE.md) belongs in docs/ subdirectories with proper 3-4 level folder structure.

#### Forbidden in Root:
- ❌ Any .md files besides README.md (use docs/guides/, docs/ai/, docs/deployment/, etc.)
- ❌ Source code (use backend/, frontend/, ai/)
- ❌ Scripts (use scripts/)
- ❌ Tests (use tests/)
- ❌ Other documentation files (use docs/)

### Deep Folder Structure (ALWAYS 3-4 Levels)

```bash
# ❌ WRONG: Shallow placement
backend/services/user-service.ts
frontend/components/UserProfile.tsx

# ✅ RIGHT: Deep, specific placement
backend/services/user/user-service.ts
backend/services/user/user-validator.ts
backend/services/user/user-repository.ts
frontend/components/User/Profile/UserProfile.tsx
frontend/components/User/Profile/UserProfileCard.tsx
```

### File Placement Rules

| Type | Location |
|------|----------|
| Backend Services | `backend/services/[module]/[module]-service.ts` |
| Backend Controllers | `backend/api/controllers/[module]/[module]-controller.ts` |
| Backend Repositories | `backend/repositories/[module]/[module]-repository.ts` |
| Frontend Components | `frontend/components/[Module]/[Component]/[ComponentName].tsx` |
| Frontend Pages | `frontend/pages/[Module]/[PageName].tsx` |
| Frontend Hooks | `frontend/hooks/use-[hook-name].ts` |
| Unit Tests | `tests/unit/[module]/[component].test.ts` |
| Integration Tests | `tests/integration/[module]/[feature].test.ts` |
| E2E Tests | `tests/e2e/[user-journey].spec.ts` |
| Documentation | `docs/[category]/[name].md` |
| Protocol Docs | `docs/protocols/[##]_[NAME].md` |

---

## 🎯 ANTI-DUPLICATION SYSTEM (P0 CRITICAL)

### Core Philosophy: UPDATE FIRST, CREATE NEVER (WITHOUT SEARCH)

**Zero-tolerance policy for duplication. Search 2-3 minutes before creating ANYTHING.**

### 🛑 ENFORCEMENT CHECKPOINT: Before Creating ANY File

**AI: You are about to create a file. STOP and answer these questions:**

1. **Did you search for 2-3 minutes?** (yes/no) - If NO, STOP and search now
2. **Did you run ALL 5 search phases?** (yes/no) - If NO, STOP and run them now
3. **Did you find any similar files?** (yes/no) - If YES, UPDATE those instead
4. **Can you extend an existing file?** (yes/no) - If YES, extend instead of create
5. **Is this file 100% unique?** (yes/no) - If NO, DO NOT create

**If you answered NO to Q5 or YES to Q3/Q4, you MUST NOT create a new file.**

**Verification Code for File Creation:**
```
File Creation Authorized: [filename]
Search Duration: [X minutes]
Similar Files Found: [list or "none"]
Reason for New File: [explanation]
Similarity Score: [<50% to justify creation]
Verification: ANTI-DUP-CHECK-COMPLETE
```

**Include this code in your response when creating files, or you violated protocol.**

### Mandatory 5-Phase Search Protocol

```bash
# PHASE 1: Global Search (60 seconds)
find . -name '*keyword*' -type f
find . -iname '*keyword*' -type f  # Case-insensitive
grep -r 'keyword' --include='*.md' --include='*.ts' --include='*.tsx'

# PHASE 2: Documentation Search (30 seconds)
ls -la docs/*.md
cat docs/00_MAP.md | grep -i 'keyword'
find docs/ -name '*.md' -exec grep -l 'keyword' {} \;

# PHASE 3: Code Search (30 seconds)
find frontend/components/ -name '*Component*'
find backend/services/ -name '*service*'
grep -r 'export.*FunctionName' --include='*.ts'

# PHASE 4: Library Search (30 seconds)
# Check if lodash, date-fns, React hooks, or dependencies provide this

# PHASE 5: Similarity Analysis (30 seconds)
# Calculate similarity: 90%+ = USE existing, 80-89% = EXTEND existing
```

### Decision Matrix

| Similarity | Action |
|------------|--------|
| 90%+ similar | USE existing (import/reference) |
| 80-89% similar | EXTEND existing (add method/prop) |
| 70-79% similar | REFACTOR to shared (make generic) |
| 50-69% similar | EVALUATE if related |
| <50% similar | OK to create (document why unique) |

### Pre-Creation Checklist

**Execute BEFORE creating ANY file:**

```
Search Phase (2-3 min):
✓ Searched by filename
✓ Searched by content
✓ Searched in docs
✓ Searched in code
✓ Checked session logs

Verification Phase:
✓ NO existing file serves this purpose (100% certain)
✓ NO existing doc covers this (checked all docs)
✓ NO similar functionality exists
✓ Existing file CANNOT be updated (80%+ similar = update)

Decision Phase:
✓ Functionality is TRULY unique
✓ NOT duplicate under different name
✓ NOT reinventing library function
✓ Confirmed DEEPEST appropriate folder
✓ Documented WHY new file needed

🚫 If ANY unchecked: STOP - Complete items first
✅ All checked: OK to create
```

---

## 🔗 DEPENDENCY CHAIN AWARENESS (P1 ESSENTIAL)

### Core Principle: Every File Change Can Break Other Files

**Before modifying ANY file, check dependencies and update all dependents.**

### 4-Step Protocol (1 Minute Total)

```bash
# STEP 1: Find Downstream Dependencies (30 sec)
grep -r 'from.*filename' --include='*.ts' --include='*.tsx'
grep -r 'import.*filename' --include='*.ts' --include='*.tsx'

# STEP 2: Find Upstream Dependencies (10 sec)
head -n 50 filename | grep -E '^import|^from'

# STEP 3: Assess Breaking Change Risk (20 sec)
# HIGH: Function signature, interface, export removed, file moved
# MEDIUM: Implementation changed, new required param
# LOW: Internal change, optional param, docs

# STEP 4: Update All Dependents (variable)
# HIGH RISK: Update ALL downstream files, run ALL tests
# MEDIUM RISK: Update affected files, add deprecation
# LOW RISK: Verify no side effects, run smoke tests
```

### Breaking Change Examples

```typescript
// HIGH RISK: Function signature changed
// BEFORE:
function calculateDiscount(price: number): number

// AFTER:
function calculateDiscount(price: number, percentage: number): number
// → Find all callers, update OR make optional with default

// MEDIUM RISK: New required interface property
// BEFORE:
interface User { id: string; name: string }

// AFTER:
interface User { id: string; name: string; email: string }
// → Find all implementations, update OR make optional (email?: string)

// LOW RISK: Optional parameter added
function getUser(id: string, includeDeleted: boolean = false): Promise<User>
// → Backward compatible, no updates needed
```

**See Full Details**: [docs/protocols/01_DEPENDENCY_CHAIN.md](docs/protocols/01_DEPENDENCY_CHAIN.md)

---

## 🛡️ SECURITY IMPLICATION CHECK (P1 ESSENTIAL)

### Auto Security Review on EVERY Code Change

**Mandatory OWASP Top 10 check before committing any code.**

### Security Checklist (30-Second Scan)

```
✓ SQL Injection: Parameterized queries ONLY, never string interpolation
✓ XSS: Sanitize all user inputs, avoid dangerouslySetInnerHTML
✓ Auth Bypass: Verify authentication on protected routes
✓ Sensitive Data: Never log passwords, tokens, API keys
✓ CSRF: Tokens on state-changing operations
✓ Broken Access Control: Check user owns resource
✓ Insecure Dependencies: npm audit clean
✓ Weak Crypto: bcrypt for passwords (cost=12), JWT with secrets
```

### Security Patterns

```typescript
// ✅ GOOD: Parameterized queries
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [email]
)

// ❌ BAD: SQL injection risk
const user = await db.query(`SELECT * FROM users WHERE email = '${email}'`)

// ✅ GOOD: Input sanitization
import DOMPurify from 'dompurify'
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />

// ❌ BAD: XSS risk
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ GOOD: Authorization check
if (contact.userId !== req.user.id) {
  return res.status(403).json({ error: 'Unauthorized' })
}

// ❌ BAD: No authorization
const contact = await getContact(req.params.id)
res.json(contact) // Any user can access!
```

**See Full Details**: [docs/protocols/02_SECURITY.md](docs/protocols/02_SECURITY.md)

---

## 🧪 TEST COVERAGE REQUIREMENTS (P1 ESSENTIAL)

### Mandatory Coverage Targets

| Category | Target | Why |
|----------|--------|-----|
| Overall | 85%+ | Production quality baseline |
| Auth | 95%+ | Security critical |
| Payment | 95%+ | Financial critical |
| Security | 90%+ | Vulnerability prevention |
| API | 85%+ | Contract enforcement |

### Test Pyramid (Distribution)

```
E2E Tests (10%)           ◢━━◣    Slow, expensive, high confidence
Integration Tests (30%)  ◢━━━━━◣  Medium speed, good coverage
Unit Tests (60%)      ◢━━━━━━━━◣  Fast, cheap, wide coverage
```

### Auto-Generate 5 Types of Tests

```typescript
// 1. Happy Path Test
it('should create contact with valid data', async () => {
  const contact = await createContact({ name: 'John', email: 'john@example.com' })
  expect(contact.id).toBeDefined()
  expect(contact.name).toBe('John')
})

// 2. Edge Case Test
it('should handle empty name gracefully', async () => {
  await expect(createContact({ name: '', email: 'john@example.com' }))
    .rejects.toThrow('Name is required')
})

// 3. Error Case Test
it('should throw on duplicate email', async () => {
  await createContact({ name: 'John', email: 'john@example.com' })
  await expect(createContact({ name: 'Jane', email: 'john@example.com' }))
    .rejects.toThrow('Email already exists')
})

// 4. Security Test
it('should prevent SQL injection in email', async () => {
  await expect(createContact({ name: 'John', email: "' OR '1'='1" }))
    .rejects.toThrow('Invalid email format')
})

// 5. Performance Test (for critical paths)
it('should create contact in under 100ms', async () => {
  const start = Date.now()
  await createContact({ name: 'John', email: 'john@example.com' })
  const duration = Date.now() - start
  expect(duration).toBeLessThan(100)
})
```

**See Full Details**: [docs/protocols/03_TEST_COVERAGE.md](docs/protocols/03_TEST_COVERAGE.md)

---

## 💥 BREAKING CHANGE DETECTION (P0 CRITICAL)

### Never Break Existing Functionality

**Before modifying public APIs or exported functions, assess impact and plan migration.**

### Breaking Change Risk Levels

#### HIGH RISK (Update ALL dependents immediately)
- Function signature changed (params, return type)
- Interface/type definition changed
- Export removed or renamed
- File moved to different location

#### MEDIUM RISK (Add deprecation warnings)
- Function implementation changed (same signature)
- New required parameter added
- Default behavior changed

#### LOW RISK (Verify no side effects)
- Internal function changed (not exported)
- Optional parameter added
- Documentation updated

### Deprecation Strategy

```typescript
/**
 * @deprecated Use calculateDiscountWithPercentage instead. Removal in v4.0.0
 */
export function calculateDiscount(price: number): number {
  console.warn('calculateDiscount is deprecated. Use calculateDiscountWithPercentage.')
  return calculateDiscountWithPercentage(price, 10)
}

export function calculateDiscountWithPercentage(
  price: number,
  percentage: number = 10
): number {
  return price * (percentage / 100)
}
```

**See Full Details**: [docs/protocols/04_BREAKING_CHANGES.md](docs/protocols/04_BREAKING_CHANGES.md)

---

## 📊 CODE QUALITY ENFORCEMENT (P1 ESSENTIAL)

### 9-Point Quality Check (Before Commit)

```
1. Type Safety:
   ✓ Zero 'any' types (use proper types or 'unknown')
   ✓ Explicit return types on all functions
   ✓ Strict null checks enabled

2. Error Handling:
   ✓ try-catch on all async operations
   ✓ Structured errors (AppError class)
   ✓ Never swallow errors

3. Security:
   ✓ OWASP Top 10 compliance
   ✓ Input validation (zod schemas)
   ✓ No secrets in code/logs

4. Performance:
   ✓ No N+1 queries
   ✓ Pagination on list endpoints (<20 items)
   ✓ Database indexes on foreign keys
   ✓ API responses <200ms

5. Testing:
   ✓ 85%+ code coverage
   ✓ Tests actually test behavior
   ✓ Edge and error cases covered

6. Documentation:
   ✓ JSDoc on public functions
   ✓ Comments on complex logic only
   ✓ README/docs updated

7. Naming:
   ✓ Clear, descriptive names
   ✓ Follow conventions (kebab-case, PascalCase)
   ✓ No abbreviations (except common: id, url, api)

8. DRY (Don't Repeat Yourself):
   ✓ No code duplication
   ✓ Extracted shared utilities
   ✓ Reusable components

9. SOLID Principles:
   ✓ Single Responsibility
   ✓ Open/Closed
   ✓ Liskov Substitution
   ✓ Interface Segregation
   ✓ Dependency Inversion
```

**See Full Details**: [docs/protocols/10_CODE_REVIEW.md](docs/protocols/10_CODE_REVIEW.md)

---

## ⏰ SESSION END PROTOCOL (MANDATORY)

### Execute Every Session (10 Minutes Reserved)

**AI: This is MANDATORY. Never skip. Future AI sessions depend on this.**

### 🚨 SESSION END CHECKPOINT

**STOP! Before ending your session, answer these:**

1. **Did you update CHANGELOG.md?** (yes/no) - If NO, do it NOW
2. **Did you create a session log?** (yes/no) - If NO, do it NOW
3. **Did you update affected docs?** (yes/no) - If YES to changes, update NOW
4. **Did you reserve 10 minutes for this?** (yes/no) - If NO, you're rushing
5. **Can you list all files you created/modified?** (yes/no) - If NO, review your work

**If you answered NO to Q1 or Q2, you are VIOLATING mandatory protocol.**

**Session End Verification Code:**
```
✅ SESSION END PROTOCOL COMPLETE
CHANGELOG Updated: [yes/no]
Session Log Created: [filepath]
Files Created: [count] - [list]
Files Modified: [count] - [list]
Tests Added: [count]
Documentation Updated: [list of docs]
Verification: SESSION-END-v3.0-COMPLETE
```

**You MUST include this code when ending a session.**

#### Step 1: Update CHANGELOG.md (2 minutes)

```markdown
## [Unreleased]

### Added
- New feature X with Y capability

### Changed
- Refactored module Z for better performance

### Fixed
- Bug in component A causing issue B

### Security
- Fixed XSS vulnerability in input field
```

#### Step 2: Create Session Log (5 minutes)

**Location**: `logs/session-logs/YYYY-MM-DD-task-name.md`

**Template**:
```markdown
# Session Log: [Task Name]

**Date**: 2025-11-05
**Duration**: [X minutes]
**AI Assistant**: Claude Code / GitHub Copilot
**Task Status**: ✅ Complete / ⏸️ In Progress / ❌ Blocked

## Task Description
[What was requested]

## What Was Done
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Files Created
- path/to/file1.ts
- path/to/file2.tsx

## Files Modified
- path/to/file3.ts (added function X)
- path/to/file4.tsx (updated component Y)

## Tests Written
- tests/unit/file1.test.ts (95% coverage)

## Decisions Made
- **Decision**: Why we chose approach A over B
- **Rationale**: Performance vs maintainability trade-off

## Challenges Encountered
- Challenge X: Solved by doing Y
- Challenge Z: Need to revisit in next session

## Next Steps
- [ ] Task 1 to complete
- [ ] Task 2 to start
- [ ] Follow-up on decision X

## Notes for Future AI
- Context X is important for understanding Y
- Watch out for edge case Z in module A
```

#### Step 3: Update Affected Documentation (2 minutes)

```
✓ Update docs/00_MAP.md if structure changed
✓ Update relevant docs/protocols/ if protocol affected
✓ Update API docs if endpoints changed
✓ Update component docs if UI changed
```

#### Step 4: Final Verification (1 minute)

```
✓ All code committed
✓ All tests passing
✓ Documentation complete
✓ CHANGELOG updated
✓ Session log created
✓ No TODOs left in code (create tickets instead)
```

---

## 🎨 CONVENTIONS & PATTERNS

### Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Directories | kebab-case | `user-management/` |
| Files | kebab-case.ext | `user-service.ts` |
| React Components | PascalCase.tsx | `UserProfile.tsx` |
| Classes | PascalCase | `UserService` |
| Functions | camelCase | `getUserById` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRIES` |
| Interfaces | PascalCase | `IUserRepository` |
| Types | PascalCase | `UserRole` |
| Database Tables | snake_case (plural) | `user_profiles` |
| Database Columns | snake_case | `first_name`, `created_at` |
| API Endpoints | kebab-case | `/api/v1/user-profiles` |
| Environment Variables | UPPER_SNAKE_CASE | `DATABASE_URL` |

### Code Patterns

**TypeScript Strict Mode**:
```typescript
// ✅ ALWAYS
const user: User = { id: 1, name: 'John' }
async function getUser(id: number): Promise<User | null>

// ❌ NEVER
const user: any = { id: 1, name: 'John' }
async function getUser(id): Promise<any>
```

**Error Handling**:
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

**API Endpoints**:
```typescript
// ✅ ALWAYS
GET    /api/v1/users          // List with pagination
POST   /api/v1/users          // Create
GET    /api/v1/users/:id      // Get one
PUT    /api/v1/users/:id      // Update
DELETE /api/v1/users/:id      // Delete

// ❌ NEVER
GET /getUsers
POST /user/create
GET /api/users/:id/getData
```

**React Components**:
```typescript
// ✅ ALWAYS
export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const { data, isLoading, error } = useQuery(['user', userId], () => getUser(userId))

  if (isLoading) return <Spinner />
  if (error) return <ErrorMessage error={error} />
  if (!data) return <NotFound />

  return <div>{data.name}</div>
}

// ❌ NEVER
export function UserProfile(props) {
  const [user, setUser] = useState(null)
  useEffect(() => {
    fetch('/api/users/' + props.id).then(r => r.json()).then(setUser)
  }, [])
  return <div>{user?.name}</div>
}
```

---

## 🏗️ ARCHITECTURE & STRUCTURE

### Architectural Patterns

1. **Modular Monolith → Microservices** - Start simple, extract services as needed
2. **Event-Driven Architecture** - RabbitMQ for async operations
3. **CQRS** - Command Query Responsibility Segregation
4. **Repository Pattern** - Data access abstraction
5. **Service Layer** - Business logic separation
6. **API Gateway** - Unified entry point with rate limiting
7. **Multi-tenant** - Isolated data per organization (tenant_id)
8. **Multi-level Caching** - Redis → In-memory → CDN

### Performance Budgets

| Metric | Target | Critical |
|--------|--------|----------|
| API Response Time | <200ms | <500ms |
| Page Load | <2s | <4s |
| Time to Interactive | <3s | <5s |
| Database Query | <100ms | <300ms |
| Bundle Size (initial) | <500KB | <1MB |
| Test Suite | <30s | <60s |

### Database Strategy

- **PostgreSQL**: Transactional data, relationships, ACID compliance
- **MongoDB**: Logs, events, unstructured data, flexible schema
- **Redis**: Cache, sessions, real-time counters, pub/sub
- **Elasticsearch**: Full-text search, analytics, log aggregation
- **S3**: Files, attachments, backups, static assets

### Logging Architecture (CRITICAL - AI MUST UNDERSTAND THIS)

**ClientForge uses a dual logging system:**

```typescript
interface LoggingArchitecture {
  primary: {
    system: "Winston with MongoDB Transport",
    location: "MongoDB database: clientforge, collection: app_logs",
    format: "Structured JSON documents",
    features: [
      "Queryable by tenant_id, user_id, level, timestamp",
      "Automatic TTL cleanup (7-90 days)",
      "No encoding issues (UTF-8 native)",
      "Aggregation and analytics via MongoDB queries"
    ],
    configuration: "backend/utils/logging/logger.ts",
    transport: "winston-mongodb package"
  },

  backup: {
    system: "File-based logging (fallback)",
    location: "logs/ directory (error.log, combined.log)",
    format: "JSON lines with rotation",
    purpose: "Backup if MongoDB unavailable",
    retention: "10 files × 10MB = 100MB max"
  },

  where_logs_go: {
    application_logs: "MongoDB app_logs collection (7-day TTL)",
    error_logs: "MongoDB error_logs collection (30-day TTL)",
    audit_logs: "MongoDB audit_logs collection (90-day TTL)",
    file_backup: "logs/combined.log and logs/error.log"
  },

  query_logs: {
    mongodb_shell: "mongosh 'mongodb://crm:password@localhost:27017/clientforge?authSource=admin'",
    find_errors: "db.app_logs.find({ level: 'error' }).sort({ timestamp: -1 }).limit(10)",
    by_tenant: "db.app_logs.find({ tenantId: 'tenant-uuid' })",
    by_user: "db.app_logs.find({ userId: 'user-uuid' })"
  }
}
```

**AI: When you see logging in code, understand this:**
1. **All logs go to MongoDB first** (via Winston transport)
2. **Files are backup only** (if MongoDB connection fails)
3. **Never use console.log()** - always use `logger.info()`, `logger.error()`, etc.
4. **Never log sensitive data** - passwords, tokens, API keys, emails (mask them)
5. **Emoji removed from all logging** - caused encoding issues, use `[OK]`, `[ERROR]`, `[WARNING]`

**Example Correct Logging:**
```typescript
import { logger } from '../utils/logging/logger'

// Good - structured logging
logger.info('[OK] User login successful', {
  userId: user.id,
  tenantId: user.tenantId,
  email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'), // masked
  timestamp: new Date()
})

// Bad - console.log and sensitive data exposed
console.log('User logged in:', user.email, user.password) // NEVER DO THIS
```

---

## 🤖 MCP MULTI-AGENT SYSTEM (7-AGENT COORDINATION)

**Elite AI agent swarm with real-time context synchronization for maximum development velocity.**

### System Architecture

**7 Coordinated Agents:**

```typescript
interface MCPAgentSystem {
  // DEVELOPMENT AGENTS (MCP Router Coordinated)
  agent_0: {
    name: "Claude Code",
    role: "Orchestrator",
    type: "primary",
    capabilities: ["user_interface", "task_routing", "context_management"],
    location: "Your Claude Code session"
  },

  agent_1: {
    name: "Qwen2.5-Coder 32B",
    role: "Code Generation",
    type: "local_gpu",
    vram: "10GB",
    speed: "50-80 tokens/sec",
    capabilities: ["full_implementations", "multi_database_sync", "type_safety"],
    location: "RTX 4090 GPU 1 - localhost:11434"
  },

  agent_2: {
    name: "DeepSeek Coder 6.7B",
    role: "Test Writing",
    type: "local_gpu",
    vram: "5GB",
    speed: "100-150 tokens/sec",
    capabilities: ["test_generation", "95%_coverage", "edge_case_discovery"],
    location: "RTX 4090 GPU 1 - localhost:11435"
  },

  agent_3: {
    name: "CodeLlama 13B",
    role: "Refactoring Expert",
    type: "local_gpu",
    vram: "7GB",
    speed: "70-90 tokens/sec",
    capabilities: ["code_cleanup", "performance_optimization", "type_improvements"],
    location: "RTX 4090 GPU 1 - localhost:11436"
  },

  agent_4: {
    name: "Mistral 7B",
    role: "Documentation Writer",
    type: "local_gpu",
    vram: "2GB",
    speed: "120-150 tokens/sec",
    capabilities: ["jsdoc", "readme", "api_docs", "inline_comments"],
    location: "RTX 4090 GPU 1 - localhost:11437"
  },

  // CLIENTFORGE APP AI FEATURES (Production SDK Bots)
  agent_5: {
    name: "Claude SDK Helper",
    role: "AI Assistant (Albedo) & Planning",
    type: "api_sdk",
    capabilities: [
      "natural_language_queries",
      "lead_scoring",
      "smart_recommendations",
      "complex_reasoning",
      "system_design"
    ],
    purpose: "Powers ClientForge's AI features + helps MCP with architecture",
    api_key: "ANTHROPIC_API_KEY_CLIENTFORGE"
  },

  agent_6: {
    name: "GPT-4 SDK Helper",
    role: "Content Generation & Security Review",
    type: "api_sdk",
    capabilities: [
      "email_composition",
      "report_generation",
      "security_analysis",
      "owasp_review",
      "customer_interaction"
    ],
    purpose: "Powers ClientForge's AI features + helps MCP with security",
    api_key: "OPENAI_API_KEY_CLIENTFORGE"
  },

  total_vram: "24GB (100% utilization on RTX 4090)",
  combined_throughput: "405 tokens/sec (local agents)",
  cost_reduction: "80% (local handles routine work)"
}
```

### Agent Responsibilities

**Development Flow (MCP Router):**
- "Implement createContact" → Agent 1 (Qwen32B) - local, $0
- "Write tests" → Agent 2 (DeepSeek) - local, $0
- "Refactor code" → Agent 3 (CodeLlama) - local, $0
- "Write docs" → Agent 4 (Mistral) - local, $0
- "Design architecture" → Agent 5 (Claude SDK) - API (uses app budget)
- "Security audit" → Agent 6 (GPT-4 SDK) - API (uses app budget)

**Production Features (ClientForge App):**
- **Albedo AI Assistant** → Agent 5 (Claude SDK)
- **Smart Email Generation** → Agent 6 (GPT-4 SDK)
- **Lead Scoring** → Agent 5 (Claude SDK)
- **Report Generation** → Agent 6 (GPT-4 SDK)

### MCP Router Commands

**Quick Start:**
```bash
# Step 1: Start Ollama fleet (4 local agents on GPU 1)
npm run fleet:start

# Step 2: Start MCP Router + all agents
npm run mcp:all

# Result: 7-agent swarm ready, 24GB VRAM utilized
```

**Management:**
```bash
npm run mcp:start       # MCP Router only (port 8765)
npm run mcp:clients     # Ollama clients only
npm run mcp:stop        # Stop all MCP processes
npm run fleet:status    # Check agent health
```

### Performance Benefits

| Metric | Before MCP | With MCP | Improvement |
|--------|-----------|----------|------------|
| Development Speed | 1x (sequential) | 4x (parallel) | **+300% faster** |
| Cost | $25/hour (cloud API) | $0 (local GPU) | **-100% cost** |
| Quality | Standard | Enhanced | +15% accuracy |
| Test Coverage | Manual | Automated | +20% coverage |

---

## 🔐 SSO AND MFA IMPLEMENTATION

The ClientForge CRM v3.0 now includes a complete Single Sign-On (SSO) and Multi-Factor Authentication (MFA) system as specified in the blueprint.

### Key Features Implemented:
1. **Google OAuth 2.0 Support** - Secure authentication with Google Workspace
2. **Microsoft Azure AD Integration** - Enterprise SSO for Microsoft users
3. **SAML 2.0 Protocol** - Support for enterprise identity providers 
4. **TOTP MFA Implementation** - Time-based One-Time Passwords using speakeasy library
5. **Backup Codes Management** - Secure generation and validation of backup authentication codes
6. **Complete API Endpoints** - RESTful endpoints for all SSO/MFA operations
7. **Frontend Components** - React UI components for login, setup, and verification flows

### Files Created:
- `backend/services/auth/sso/` - SSO service implementations (Google, Microsoft, SAML)
- `backend/services/auth/mfa/` - MFA service implementations (TOTP, Backup Codes)  
- `backend/api/rest/v1/routes/sso-routes.ts` - API endpoints for authentication
- `frontend/components/Auth/SSO/` - React components for SSO login buttons
- `frontend/components/Auth/MFA/` - React components for MFA setup and verification
- `database/migrations/20251110_sso_mfa_tables.ts` - Database schema migrations
- `database/schema/sso-mfa-schema.sql` - SQL schema definitions
- `docs/sso-mfa-implementation.md` - Detailed implementation documentation
- `tests/unit/services/auth/` - Unit tests for auth services

### Security Features:
- **CSRF Protection** - State parameter in OAuth flows
- **PKCE Support** - Proof Key for Code Exchange security enhancement
- **Encrypted Storage** - Sensitive data stored with proper encryption  
- **Rate Limiting** - API endpoints secured against abuse
- **Audit Logging** - All authentication events logged for monitoring

### Database Schema:
The implementation includes the following database tables:
1. `sso_providers` - Stores provider configurations 
2. `user_mfa` - Manages user MFA settings and secrets
3. `user_sso_tokens` - Stores SSO access tokens
4. `user_mfa_backup_codes` - Stores generated backup codes

### API Endpoints:
```
POST /api/v1/auth/sso/initiate      - Initiate SSO login flow
GET  /api/v1/auth/sso/providers     - Get available providers  
POST /api/v1/auth/sso/callback      - Handle OAuth callback
GET  /api/v1/auth/mfa/status        - Check user's MFA status
POST /api/v1/auth/mfa/setup/totp    - Enable TOTP for user
POST /api/v1/auth/mfa/verify        - Verify MFA code during login
POST /api/v1/auth/mfa/backup-codes/generate  - Generate backup codes
```

This implementation fully satisfies the requirements specified in the blueprint's Tier 1 systems (SSO + MFA Authentication System) and provides a secure, enterprise-ready authentication foundation for ClientForge CRM.
