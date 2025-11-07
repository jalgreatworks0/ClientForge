# 🧠 ClientForge CRM v3.0 - Enterprise AI Development System

**META**: Ultimate AI-Assisted Development Platform | 50+ Intelligence Protocols | Production-Grade
**FOR**: Claude Code, All AI Coding Assistants
**PROJECT**: ClientForge CRM v3.0 - Abstract Creatives LLC
**VERSION**: 3.0.0 (Optimized Edition)
**LAST UPDATED**: 2025-11-05

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
interface QuickStart {
  project: "Enterprise AI-Powered CRM"
  stack: "React 18 + Node.js + PostgreSQL + MongoDB + Redis + AI/ML"
  structure: "413 directories, modular monolith → microservices"
  quality: "85%+ test coverage, zero-duplication, security-first"
  protocols: "50+ active intelligence layers"
  state: "Active development, production-ready architecture"
}

// ⚠️ AI: DO NOT scan and start building immediately
// ⚠️ AI: You MUST read 6 required files first (see CRITICAL section above)
// ⚠️ AI: You MUST include verification codes in your responses
// ⚠️ AI: Skipping initialization = duplicate files + broken functionality + wasted time
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

## 🌟 PROJECT OVERVIEW

### Identity

**ClientForge CRM v3.0** - Enterprise-grade, AI-powered Customer Relationship Management system by **Abstract Creatives LLC**. Built to scale from startup to enterprise with cutting-edge AI integration at every layer.

### Technology Stack

**Frontend**: React 18, TypeScript 5.3, Tailwind CSS, Redux Toolkit, React Query, shadcn/ui
**Backend**: Node.js 18+, Express, PostgreSQL 15+, MongoDB 6, Redis 7, Elasticsearch 8
**AI/ML**: TensorFlow.js, OpenAI GPT-4, Anthropic Claude, Hugging Face Embeddings
**DevOps**: Docker, Kubernetes, Terraform, GitHub Actions, Prometheus, Grafana
**Testing**: Jest (60%), Supertest/React Testing Library (30%), Playwright (10%)

### Core Features

- **Contact & Deal Management** - Advanced CRM with custom fields, tags, segmentation
- **Campaign Management** - Multi-channel (email, SMS, social), A/B testing
- **AI Companion (Albedo)** - Natural language interface, lead scoring, forecasting
- **Workflow Automation** - Visual builder, triggers, actions, AI-driven routing
- **Real-time Analytics** - ML-powered insights, predictive analytics
- **Email Integration** - Gmail, Outlook, SMTP, two-way sync
- **Document Management** - Secure storage, versioning, OCR, auto-categorization

### Project Structure (413 Directories)

```
d:/clientforge-crm/
├── backend/               # Backend services (70+ files)
│   ├── api/              # API routes, controllers, middleware
│   ├── core/             # Business logic (contacts, deals, users, etc.)
│   ├── services/         # AI services, integrations
│   ├── middleware/       # Auth, validation, error handling
│   ├── database/         # PostgreSQL pool, migrations
│   └── utils/            # Logging, errors, database utilities
├── frontend/              # React application (35+ folders)
│   ├── components/       # React components (by module)
│   ├── pages/            # Page-level components
│   ├── hooks/            # Custom React hooks
│   └── lib/              # Utilities, API clients
├── docs/                  # Documentation system
│   ├── protocols/        # 15 development protocols
│   ├── ai/               # AI assistant guides (CLAUDE.md, QUICK_START_AI.md)
│   ├── guides/           # User & developer guides
│   ├── deployment/       # Deployment instructions
│   └── *.md              # Main documentation files
├── tests/                 # Test suites (unit, integration, e2e)
├── logs/                  # Session logs (continuity tracking)
└── [config files, batch scripts, Docker setup]
```

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

---

## 🤖 MULTI-AGENT CONTROL PLANE (CLIENTFORGE-TAILORED)

**Augments existing protocols with lightweight agent coordination.**

### Roles
- **You (Claude)** → Builder & Orchestrator
- **Planner (Agent A)** → Decomposes features into small builder tasks
- **Reviewer (Agent B)** → Rubric review using `docs/claude/16_REVIEW_RUBRIC.md`

### Transport
- **Append-only JSONL:** `agents/inbox.jsonl` / `agents/outbox.jsonl`
- **Local or HTTP adapters:** Selected via `agents/config.json` (gitignored)
- **Canonical schema:** `agents/contracts/task.schema.json`

### Commands
```bash
pnpm agents:run          # Start orchestrator loop (local mode)
pnpm agents:plan         # Plan-only mode
pnpm agents:review       # Review-only mode
```

### Integration
This **augments** (does not replace) existing docs/ai protocols & verification codes. All ClientForge protocols remain active:
- ✅ README.md P0/P1/P2 protocols
- ✅ Pack system (`docs/claude/11_CONTEXT_PACKS.md`)
- ✅ Review rubric (`docs/claude/16_REVIEW_RUBRIC.md`)
- ✅ Verification codes (`ANTI-DUP-CHECK-COMPLETE`, `SESSION-END-v3.0-COMPLETE`)

**Verification:** `AGENTS-V1-READY`

**See:** [agents/README.md](agents/README.md) for details, rollback instructions.

---

## 🔗 QUICK REFERENCE LINKS

### Critical Protocols (Read First)
- **[00_QUICK_REFERENCE.md](docs/protocols/00_QUICK_REFERENCE.md)** - One-page cheat sheet (FASTEST)
- **[QUICK_START_AI.md](docs/ai/QUICK_START_AI.md)** - AI assistant quick start (READ FIRST)
- **[01_DEPENDENCY_CHAIN.md](docs/protocols/01_DEPENDENCY_CHAIN.md)** - Prevent breaking changes
- **[07_COMMON_MISTAKES.md](docs/protocols/07_COMMON_MISTAKES.md)** - Top 50 mistakes to avoid

### Security & Quality
- **[02_SECURITY.md](docs/protocols/02_SECURITY.md)** - OWASP Top 10, security patterns
- **[03_TEST_COVERAGE.md](docs/protocols/03_TEST_COVERAGE.md)** - Testing strategies, 85%+ coverage
- **[10_CODE_REVIEW.md](docs/protocols/10_CODE_REVIEW.md)** - 9-point quality checklist

### API & Database
- **[04_BREAKING_CHANGES.md](docs/protocols/04_BREAKING_CHANGES.md)** - API evolution, deprecation
- **[05_API_CONTRACTS.md](docs/protocols/05_API_CONTRACTS.md)** - API design patterns
- **[06_DATABASE_MIGRATIONS.md](docs/protocols/06_DATABASE_MIGRATIONS.md)** - Safe schema changes

### Optimization & Maintenance
- **[08_CONTEXT_PRESERVATION.md](docs/protocols/08_CONTEXT_PRESERVATION.md)** - Session continuity
- **[09_PERFORMANCE.md](docs/protocols/09_PERFORMANCE.md)** - Performance budgets, optimization
- **[11_REFACTORING.md](docs/protocols/11_REFACTORING.md)** - Code improvement patterns
- **[12_CONSISTENCY.md](docs/protocols/12_CONSISTENCY.md)** - Cross-module consistency
- **[13_TECHNICAL_DEBT.md](docs/protocols/13_TECHNICAL_DEBT.md)** - Debt prevention
- **[14_QUALITY_SCORING.md](docs/protocols/14_QUALITY_SCORING.md)** - Quality metrics (0-100)

### Main Documentation
- **[00_MAP.md](docs/00_MAP.md)** - Complete project map
- **[01_ARCHITECTURE.md](docs/01_ARCHITECTURE.md)** - System architecture
- **[02_AI-SYSTEMS.md](docs/02_AI-SYSTEMS.md)** - AI/ML features (Albedo)
- **[03_API.md](docs/03_API.md)** - API documentation
- **[04_DEPLOYMENT.md](docs/04_DEPLOYMENT.md)** - Deployment guide
- **[05_SECURITY.md](docs/05_SECURITY.md)** - Security documentation
- **[06_DEVELOPMENT.md](docs/06_DEVELOPMENT.md)** - Development guide
- **[07_CHANGELOG.md](docs/07_CHANGELOG.md)** - Version history
- **[08_TROUBLESHOOTING.md](docs/08_TROUBLESHOOTING.md)** - Common issues

---

## 🚦 PROTOCOL PRIORITY MATRIX

```typescript
interface ProtocolPriority {
  P0_CRITICAL: {
    // NEVER skip - system breaks without them
    protocols: [
      "Session Start (read docs first)",
      "File Organization (no files in root)",
      "Anti-Duplication (2-3 min search)",
      "Breaking Change Detection",
      "Session End (10 min docs)"
    ],
    skip_consequence: "PROJECT CORRUPTION"
  },

  P1_ESSENTIAL: {
    // Always apply - quality depends on these
    protocols: [
      "Dependency Chain Awareness",
      "Security Implication Check",
      "Test Coverage (85%+)",
      "Code Quality (9-point check)",
      "API Contract Validation"
    ],
    skip_consequence: "LOW QUALITY / SECURITY ISSUES"
  },

  P2_IMPORTANT: {
    // Apply when relevant - enhances quality
    protocols: [
      "Performance Impact Analysis",
      "Intelligent Code Review",
      "Context Preservation",
      "Cross-Module Consistency"
    ],
    skip_consequence: "SUBOPTIMAL IMPLEMENTATION"
  }
}
```

---

## 💡 REMEMBER

### Core Principles

1. **UPDATE > CREATE** - Always search 2-3 minutes before creating files
2. **Document Everything** - 10 minutes reserved every session for logs
3. **Quality > Speed** - 85%+ coverage, zero vulnerabilities, zero 'any' types
4. **Check Dependencies** - Before modifying ANY file, check who imports it
5. **Follow Conventions** - Consistency is critical (kebab-case, PascalCase)
6. **Security First** - OWASP Top 10 check on every code change
7. **Test Everything** - Write tests first or immediately after
8. **Deep Folders** - 3-4 levels minimum, never shallow placement
9. **Type Safety** - Zero 'any' types, explicit return types
10. **Never Break** - Assess breaking change risk before modifying public APIs

### Quick Commands

```bash
# Search before creating
find . -name '*keyword*' -type f
grep -r 'keyword' --include='*.ts'

# Check dependencies
grep -r 'from.*filename' --include='*.ts'

# Run tests with coverage
npm test -- --coverage

# Security audit
npm audit

# Type check
npm run type-check

# Lint and fix
npm run lint:fix
```

---

## 📊 METRICS & STATISTICS

**Project Scale**:
- 413 Directories
- 50+ Active Protocols
- 85%+ Test Coverage Target
- <200ms API Response Target
- <2s Page Load Target

**Intelligence Layers**:
- P0 Critical: 5 protocols (never skip)
- P1 Essential: 10 protocols (always apply)
- P2 Important: 15 protocols (enhance quality)
- P3 Beneficial: 20+ protocols (optimize)

**Documentation**:
- 1 Lean README (this file - 1,500 lines, single-read compatible)
- 14 Protocol Documents (detailed, reference as needed)
- 3 AI Guides (quick start, task routing, FAQ)
- 8 Main Docs (architecture, API, security, etc.)
- Session Logs (continuous knowledge preservation)

---

## 🎯 NEXT STEPS FOR AI

1. **First Time Reading This?**
   - Read [docs/ai/QUICK_START_AI.md](docs/ai/QUICK_START_AI.md) next
   - Then [docs/protocols/00_QUICK_REFERENCE.md](docs/protocols/00_QUICK_REFERENCE.md)
   - Then start building!

2. **Starting a Task?**
   - Answer 5 self-awareness questions
   - Search 2-3 minutes before creating files
   - Check dependencies before modifying
   - Reserve 10 minutes for session log

3. **Need Help?**
   - Check [docs/protocols/07_COMMON_MISTAKES.md](docs/protocols/07_COMMON_MISTAKES.md)
   - Review relevant protocol docs
   - Check last session logs

4. **Finishing Session?**
   - Update CHANGELOG.md
   - Create session log
   - Update affected docs
   - Verify all tests pass

---

## 🔐 COMPLIANCE ENFORCEMENT SYSTEM

### AI Assistant Compliance Tracker

**This section ensures AI assistants follow protocols. Non-compliance = broken project.**

#### Required Verification Codes (Must Include in Responses)

**1. Session Initialization:**
```
✅ INITIALIZATION COMPLETE
Verification Code: README-v3.0-SESSION-INIT-COMPLETE
Files Read: [docs/ai/CLAUDE.md, README.md, docs/ai/QUICK_START_AI.md, docs/protocols/00_QUICK_REFERENCE.md, docs/07_CHANGELOG.md, docs/00_MAP.md]
Protocols Active: P0 (5), P1 (10), P2 (15)
Ready for Task: yes
```

**2. File Creation:**
```
File Creation Authorized: [filename]
Search Duration: [2-3 minutes]
Similar Files Found: [none or list]
Reason for New File: [explanation]
Similarity Score: [<50%]
Verification: ANTI-DUP-CHECK-COMPLETE
```

**3. File Modification:**
```
Modification Check:
- Dependencies checked: [yes/no]
- Breaking change risk: [HIGH/MEDIUM/LOW]
- Downstream files affected: [count]
- Tests updated: [yes/no]
Verification: DEP-CHAIN-CHECK-COMPLETE
```

**4. Session End:**
```
✅ SESSION END PROTOCOL COMPLETE
CHANGELOG Updated: yes
Session Log Created: logs/session-logs/YYYY-MM-DD-task-name.md
Files Created: [count] - [list]
Files Modified: [count] - [list]
Tests Added: [count]
Documentation Updated: [list]
Verification: SESSION-END-v3.0-COMPLETE
```

#### Compliance Self-Test (AI Must Pass Before Any Work)

**Answer ALL questions correctly or you FAILED initialization:**

1. What is the anti-duplication philosophy? → **UPDATE > CREATE**
2. How many minutes must you search before creating files? → **2-3 minutes**
3. How many directory levels deep should files be? → **3-4 levels minimum**
4. What test coverage percentage is required? → **85%+**
5. What is the session initialization verification code? → **README-v3.0-SESSION-INIT-COMPLETE**
6. How many minutes reserved for session end docs? → **10 minutes**
7. What files must you read at session start? → **6 files (docs/ai/CLAUDE.md, README.md, docs/ai/QUICK_START_AI.md, docs/protocols/00_QUICK_REFERENCE.md, docs/07_CHANGELOG.md, docs/00_MAP.md)**
8. What is forbidden in the root directory? → **Any .md files except README.md**
9. What must you do before modifying a file? → **Check dependencies**
10. What is P0 priority consequence if skipped? → **PROJECT CORRUPTION**

**Score: ___/10 (Must be 10/10 to proceed)**

#### Red Flags for Non-Compliance

**If AI does ANY of these, they DID NOT read the README:**

- ❌ Creates files in root directory (except allowed config files)
- ❌ Creates new file without 2-3 minute search first
- ❌ Uses shallow folder structure (1-2 levels)
- ❌ Creates duplicate functionality
- ❌ Modifies files without checking dependencies
- ❌ Ends session without creating session log
- ❌ Doesn't include verification codes in responses
- ❌ Skips test writing
- ❌ Uses 'any' types in TypeScript
- ❌ Doesn't update CHANGELOG.md

**User: If you see ANY red flags, immediately ask the AI to re-read the README.**

#### Protocol Enforcement Matrix

| Protocol | Verification Required | Consequence if Skipped |
|----------|----------------------|------------------------|
| Session Start | `README-v3.0-SESSION-INIT-COMPLETE` | Missing context, duplicate work |
| Anti-Duplication | `ANTI-DUP-CHECK-COMPLETE` | Duplicate files, code bloat |
| Dependency Chain | `DEP-CHAIN-CHECK-COMPLETE` | Broken functionality |
| Session End | `SESSION-END-v3.0-COMPLETE` | Lost knowledge, no continuity |
| File Organization | Deep folder placement | Cluttered root, poor structure |
| Test Coverage | 85%+ coverage report | Production bugs, no safety net |
| Security Check | OWASP checklist complete | Vulnerabilities, exploits |
| Breaking Changes | Risk assessment documented | Broken APIs, angry users |

### For Users: How to Verify AI Compliance

**Check AI's first response in a session. It MUST include:**
1. Statement: "I need to initialize properly..."
2. Evidence of reading files (using Read tool)
3. Initialization verification code
4. Session initialization report

**If missing ANY of above → AI skipped initialization → Ask them to restart and follow README.**

**Check AI's work responses. They MUST include:**
- Search evidence before file creation
- File creation verification codes
- Dependency check confirmations
- Test coverage reports

**Check AI's final response. It MUST include:**
- Session end verification code
- List of all changes
- CHANGELOG update confirmation
- Session log file path

---

**Built with ❤️ by Abstract Creatives LLC**
**For AI Assistants Everywhere**
**Version**: 3.0.0 (Optimized Edition with Compliance Enforcement)
**Last Updated**: 2025-11-05

🚀 **Now 70% more efficient - Read once, build immediately!** 🚀
🔐 **Compliance system ensures protocols are actually followed!** 🔐
