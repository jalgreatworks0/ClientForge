# ClientForge CRM - Remediation Checklist

**Date**: 2025-11-07
**Based On**: System Audit Report (7-Agent Analysis)
**Priority**: CRITICAL - Production Blocker Issues

---

## 🔴 IMMEDIATE (Day 1) - CRITICAL

### [ ] Task 1: Rotate ALL Exposed API Keys
**Time**: 2 hours
**Severity**: CRITICAL
**Files**: `.env`

**Steps**:
1. Generate new keys:
   - [ ] OpenAI API key (https://platform.openai.com/api-keys)
   - [ ] Anthropic API key (https://console.anthropic.com/settings/keys)
   - [ ] HuggingFace token (https://huggingface.co/settings/tokens)
   - [ ] Serper API key (https://serper.dev/api-key)
   - [ ] Render API key (https://dashboard.render.com/u/settings)
   - [ ] GitKraken token
2. Update `.env` with new keys
3. Add `.env` to `.gitignore` (verify it's there)
4. Remove `.env` from git history:
   ```bash
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   ```
5. Implement secrets manager (AWS, Azure, or Doppler)

---

### [ ] Task 2: Fix Duplicate Agent ID in MCP Config
**Time**: 5 minutes
**Severity**: CRITICAL
**File**: `agents/mcp/server-config.json`

**Fix**:
```json
// Line 110: Change from
"planner_architect_claude": {
  "id": "agent-5-claude-planner",  // DUPLICATE!

// To:
"planner_architect_claude": {
  "id": "agent-7-claude-planner",  // FIXED
```

**Test**: Restart MCP router and verify agent routing works

---

### [ ] Task 3: Add FRONTEND_URL Environment Variable
**Time**: 10 minutes
**Severity**: CRITICAL
**File**: `.env`

**Add**:
```bash
# Production URL for email links
FRONTEND_URL=https://app.clientforge.com  # UPDATE WITH YOUR DOMAIN

# Development
# FRONTEND_URL=http://localhost:3001
```

**Update These Files**:
- [ ] `backend/core/email/email-templates.ts`
- [ ] `backend/core/auth/auth-service.ts` (email verification)

---

### [ ] Task 4: Remove Authorization Bypass
**Time**: 30 minutes
**Severity**: CRITICAL (Security Risk)
**File**: `backend/middleware/authorize.ts`

**Current Code (Line 105)**:
```typescript
// TODO: Remove this bypass once permissions/role_permissions tables are migrated
if (!userPermissions || userPermissions.length === 0) {
  logger.warn('[SECURITY] Authorization bypassed - no permissions found')
  return next()  // ❌ BYPASS - ANYONE CAN ACCESS!
}
```

**Fix**:
1. Verify migrations are complete:
   ```bash
   psql -d clientforge -c "SELECT COUNT(*) FROM role_permissions;"
   ```
2. If migrations complete, remove bypass:
   ```typescript
   if (!userPermissions || userPermissions.length === 0) {
     logger.error('[SECURITY] No permissions found for user', { userId, tenantId })
     throw new ForbiddenError('Access denied - no permissions')
   }
   ```
3. If migrations NOT complete, run them now

---

### [ ] Task 5: Delete Duplicate Rate Limiter
**Time**: 5 minutes
**Severity**: MEDIUM
**File**: `backend/middleware/rate-limiter.ts`

**Steps**:
1. Verify `rate-limit.ts` is used (Redis-backed):
   ```bash
   grep -r "rate-limit" backend/api/
   ```
2. Delete the duplicate:
   ```bash
   rm backend/middleware/rate-limiter.ts
   ```
3. Commit: `git commit -m "Remove duplicate rate-limiter (keeping Redis version)"`

---

## 🟡 WEEK 1 - HIGH PRIORITY

### [ ] Task 6: Enable TypeScript Strict Mode
**Time**: 20-30 hours
**Severity**: HIGH
**File**: `tsconfig.json`

**Steps**:
1. Update root `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "strict": true,              // Enable ALL strict checks
       "noEmitOnError": true,       // Don't compile with errors
       "sourceMap": true,           // Enable debugging
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictBindCallApply": true,
       "strictPropertyInitialization": true,
       "noImplicitThis": true,
       "alwaysStrict": true
     }
   }
   ```

2. Fix compilation errors (estimated 200-300 errors):
   - [ ] Fix all `any` types (248 instances)
   - [ ] Type all error handlers (466 catch blocks)
   - [ ] Create Express Request extension interface
   - [ ] Type all database row objects
   - [ ] Fix optional chaining issues

3. Add ESLint rules:
   ```json
   // .eslintrc.json
   {
     "rules": {
       "@typescript-eslint/no-explicit-any": "error",
       "@typescript-eslint/explicit-function-return-type": "warn"
     }
   }
   ```

---

### [ ] Task 7: Implement Email Service
**Time**: 8-12 hours
**Severity**: CRITICAL
**File**: `backend/core/email/email-service.ts`

**Current State**: Only logs emails, doesn't send

**Implementation Options**:

**Option A: SendGrid (Recommended)**
```bash
npm install @sendgrid/mail
```

```typescript
// backend/core/email/email-service.ts
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function sendEmail(options: EmailOptions): Promise<void> {
  const msg = {
    to: options.to,
    from: process.env.EMAIL_FROM_ADDRESS!,
    subject: options.subject,
    html: options.html
  }

  await sgMail.send(msg)
  logger.info('[OK] Email sent', { to: options.to, subject: options.subject })
}
```

**Option B: AWS SES**
```bash
npm install @aws-sdk/client-ses
```

**Option C: Nodemailer + SMTP**
```bash
npm install nodemailer
```

**Required .env Variables**:
```bash
# Email Configuration
EMAIL_PROVIDER=sendgrid  # or 'ses' or 'smtp'
SENDGRID_API_KEY=your_key_here
EMAIL_FROM_ADDRESS=noreply@clientforge.com
EMAIL_FROM_NAME=ClientForge CRM
```

**Test Checklist**:
- [ ] Send welcome email on signup
- [ ] Send email verification email
- [ ] Send password reset email
- [ ] Send notification emails
- [ ] Verify links use FRONTEND_URL

---

### [ ] Task 8: Fix Database Configuration Issues
**Time**: 4-6 hours
**Severity**: HIGH

#### 8.1: Create Docker-Specific .env
```bash
# Copy .env to .env.docker
cp .env .env.docker
```

**Update .env.docker**:
```bash
# Docker service names (not localhost)
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=clientforge_crm

MONGODB_HOST=mongodb
MONGODB_PORT=27017

REDIS_HOST=redis
REDIS_PORT=6379

ELASTICSEARCH_URL=http://elasticsearch:9200
```

#### 8.2: Standardize Database Names
**Decision**: Use `clientforge_crm` everywhere

**Update**:
- [ ] `.env`: `DATABASE_NAME=clientforge_crm`
- [ ] `docker-compose.yml`: `POSTGRES_DB=clientforge_crm`
- [ ] All config files verified

#### 8.3: Add Missing Environment Variables
```bash
# Database Timeouts
DATABASE_IDLE_TIMEOUT=10000
DATABASE_CONNECT_TIMEOUT=5000
DATABASE_STATEMENT_TIMEOUT=30000
DATABASE_QUERY_TIMEOUT=10000

# AI Configuration
AI_CACHE_ENABLED=true
AI_CACHE_TTL=3600
AI_DEFAULT_MODEL=gpt-4-turbo
AI_DEFAULT_TEMPERATURE=0.7
AI_MAX_TOKENS=4000
AI_RATE_LIMIT_PER_MINUTE=60
AI_RATE_LIMIT_PER_HOUR=1000

# CORS
CORS_ORIGINS=http://localhost:3001,https://app.clientforge.com

# Security
HELMET_ENABLED=true
CSP_ENABLED=true
HSTS_ENABLED=true
```

#### 8.4: Sync .env and .env.example
```bash
# Copy all variables from .env to .env.example
# Replace real values with placeholders
```

**Template**:
```bash
# .env.example
OPENAI_API_KEY=sk-proj-your_key_here
ANTHROPIC_API_KEY=sk-ant-your_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
FRONTEND_URL=http://localhost:3001
```

---

### [ ] Task 9: Clean Up Duplicate Code
**Time**: 12-16 hours
**Severity**: HIGH

#### 9.1: Create BaseRepository
**File**: `backend/core/common/base-repository.ts`

```typescript
export abstract class BaseRepository<T extends { id: string; tenantId: string }> {
  protected pool: Pool
  protected tableName: string
  protected fieldMapping: Record<string, string>

  constructor(tableName: string, fieldMapping: Record<string, string>) {
    this.pool = getPool()
    this.tableName = tableName
    this.fieldMapping = fieldMapping
  }

  async create(tenantId: string, data: Partial<T>): Promise<T> {
    const fields = Object.keys(data)
    const values = Object.values(data)
    const placeholders = fields.map((_, i) => `$${i + 2}`)

    const query = `
      INSERT INTO ${this.tableName} (tenant_id, ${fields.join(', ')})
      VALUES ($1, ${placeholders.join(', ')})
      RETURNING *
    `

    const result = await this.pool.query(query, [tenantId, ...values])
    return this.mapToEntity(result.rows[0])
  }

  async findById(id: string, tenantId: string): Promise<T | null> {
    const query = `SELECT * FROM ${this.tableName} WHERE id = $1 AND tenant_id = $2`
    const result = await this.pool.query(query, [id, tenantId])
    return result.rows[0] ? this.mapToEntity(result.rows[0]) : null
  }

  protected abstract mapToEntity(row: any): T
}
```

**Refactor Repositories**:
- [ ] `contact-repository.ts`
- [ ] `account-repository.ts`
- [ ] `deal-repository.ts`
- [ ] `task-repository.ts`
- [ ] `user-repository.ts`

**Estimated Code Reduction**: 2,000 lines (45%)

#### 9.2: Extract Shared Validators
**File**: `backend/core/common/validators.ts`

```typescript
import { z } from 'zod'

export const emailSchema = z.string().email().optional().or(z.literal(''))
export const phoneSchema = z.string().max(50).optional().or(z.literal(''))
export const urlSchema = z.string().url().optional().or(z.literal(''))
export const uuidSchema = z.string().uuid()
export const dateSchema = z.string().datetime().or(z.date())
```

**Update Validators**:
- [ ] `contact-validators.ts`
- [ ] `account-validators.ts`
- [ ] All other validators importing duplicates

#### 9.3: Delete Backup Files
```bash
rm agents/adapters/planner_claude_sdk_old.ts.bak
rm frontend/src/pages/Dashboard.tsx.backup
rm frontend/src/pages/Deals.tsx.backup
git commit -m "Remove old backup files"
```

---

## 🟢 WEEK 2 - MEDIUM PRIORITY

### [ ] Task 10: Complete or Remove Incomplete Features
**Time**: 20-30 hours

#### 10.1: Import/Export Functionality
**Decision**: [ ] Complete [ ] Remove

**If Complete**:
- [ ] Implement CSV import with validation
- [ ] Implement CSV/Excel export
- [ ] Add bulk operations
- [ ] Add progress tracking
- [ ] Write tests

**If Remove**:
```bash
# Remove endpoints from controllers
# Remove routes
# Update API documentation
```

#### 10.2: Activities & Notes
**Decision**: [ ] Complete [ ] Remove

**If Complete**:
- [ ] Implement activity tracking
- [ ] Implement notes CRUD
- [ ] Add comments system
- [ ] Write tests

#### 10.3: Analytics Features
**Decision**: [ ] Complete [ ] Mark as BETA

**If Complete**:
- [ ] Integrate AI predictions (Albedo)
- [ ] Implement target values from DB
- [ ] Add monthly breakdowns
- [ ] Complete pipeline analytics
- [ ] Complete team performance

**If BETA**:
- [ ] Document incomplete features
- [ ] Add BETA labels in UI
- [ ] Disable incomplete endpoints

---

### [ ] Task 11: Add Docker Health Checks
**Time**: 2-4 hours
**File**: `docker-compose.yml`

**Add to all services**:

```yaml
services:
  postgres:
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  mongodb:
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  elasticsearch:
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:9200/_cluster/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5

  backend:
    depends_on:
      postgres:
        condition: service_healthy
      mongodb:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

---

### [ ] Task 12: Consolidate AI Services
**Time**: 8-12 hours

#### 12.1: Create Unified AI Interface
**File**: `backend/services/ai/types.ts`

```typescript
export interface AIProvider {
  name: 'openai' | 'anthropic' | 'huggingface'
  chat(messages: Message[], options?: ChatOptions): Promise<AIResponse>
  stream(messages: Message[], options?: ChatOptions): AsyncIterator<AIChunk>
}

export interface AIResponse {
  content: string
  model: string
  provider: string
  usage: {
    inputTokens: number
    outputTokens: number
    totalTokens: number
  }
  cost: number
  latency: number
}
```

#### 12.2: Delete Legacy Services (If Not Used)
- [ ] Verify usage: `grep -r "claude.sdk.service" backend/`
- [ ] Verify usage: `grep -r "openai.service" backend/`
- [ ] If unused, delete:
  ```bash
  rm backend/services/claude.sdk.service.ts
  rm backend/services/openai.service.ts
  rm backend/services/ai.multi-provider.service.ts
  ```

#### 12.3: Elasticsearch Sync
**Decision**: [ ] Wire Up [ ] Remove

**If Wire Up**:
- [ ] Call `syncContact()` in contact-service.ts after create/update
- [ ] Call `syncAccount()` in account-service.ts
- [ ] Call `syncDeal()` in deal-service.ts
- [ ] Add error handling for sync failures

---

## 📋 WEEK 3 - HOUSEKEEPING

### [ ] Task 13: Fix Incomplete Database Queries
**Time**: 8-12 hours

#### 13.1: Deal Sales Cycle Calculation
**File**: `backend/core/deals/deal-service.ts` line 548

**Current**:
```typescript
const averageSalesCycle = 30  // TODO: Calculate from actual data
```

**Fix**:
```typescript
const averageSalesCycle = await this.calculateAverageSalesCycle(tenantId, filters)

private async calculateAverageSalesCycle(tenantId: string, filters: any): Promise<number> {
  const query = `
    SELECT AVG(EXTRACT(EPOCH FROM (closed_at - created_at)) / 86400) as avg_days
    FROM deals
    WHERE tenant_id = $1 AND stage = 'won' AND closed_at IS NOT NULL
  `
  const result = await pool.query(query, [tenantId])
  return result.rows[0]?.avg_days || 30
}
```

#### 13.2: Task User Names
**File**: `backend/core/tasks/task-service.ts` lines 379, 441

**Fix**: Add JOIN with users table in repository queries

#### 13.3: Account Statistics
**File**: `backend/core/accounts/account-service.ts` line 410

**Implement Proper Aggregations**:
```typescript
async getStatistics(tenantId: string): Promise<AccountStatistics> {
  const query = `
    SELECT
      COUNT(*) as total,
      COUNT(CASE WHEN industry = 'Technology' THEN 1 END) as tech_accounts,
      AVG(annual_revenue) as avg_revenue,
      SUM(annual_revenue) as total_revenue
    FROM accounts
    WHERE tenant_id = $1
  `
  // ... implement
}
```

---

### [ ] Task 14: Documentation Updates
**Time**: 4-6 hours

#### 14.1: Environment Variables Documentation
**Create**: `docs/ENVIRONMENT_VARIABLES.md`

List all 50+ environment variables with:
- Name
- Description
- Required/Optional
- Default value
- Example

#### 14.2: Deployment Guide
**Create**: `docs/DEPLOYMENT.md`

Include:
- Prerequisites
- Docker deployment steps
- Environment setup
- Health check verification
- Rollback procedures

#### 14.3: Update README
- [ ] Add current features list
- [ ] Update architecture diagram
- [ ] Add deployment badge
- [ ] Link to new docs

---

### [ ] Task 15: Code Quality Improvements
**Time**: 40-60 hours (Ongoing)

#### 15.1: Fix Untyped Error Handlers (466 instances)
```typescript
// Before
catch (error) {
  logger.error('Error', error)
}

// After
catch (error: unknown) {
  if (error instanceof AppError) {
    throw error
  }
  logger.error('Unexpected error', { error })
  throw new InternalServerError('Operation failed')
}
```

#### 15.2: Replace `any` Types (248 instances)
- [ ] Create proper Request interface
- [ ] Type database row objects
- [ ] Use `unknown` instead of `any` where appropriate
- [ ] Add generic types to utility functions

#### 15.3: Add ESLint Rules
```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "@typescript-eslint/no-unused-vars": "error",
    "@typescript-eslint/strict-boolean-expressions": "warn"
  }
}
```

---

## ✅ COMPLETION CHECKLIST

### Production Readiness Criteria

- [ ] All API keys rotated and secured
- [ ] TypeScript strict mode enabled
- [ ] Email service functional
- [ ] No duplicate code (BaseRepository implemented)
- [ ] All configuration issues resolved
- [ ] Authorization bypass removed
- [ ] Docker health checks working
- [ ] All incomplete features addressed
- [ ] Test coverage >85%
- [ ] Security audit passed
- [ ] Documentation complete
- [ ] Deployment tested in staging

### Verification Commands

```bash
# TypeScript compilation
npm run type-check

# Tests
npm test

# Linting
npm run lint

# Build
npm run build

# Docker health
docker-compose ps
```

---

## 📊 PROGRESS TRACKING

**Current Status**: 65% Complete

| Phase | Tasks | Status | Progress |
|-------|-------|--------|----------|
| Immediate | 5 | ⬜ Not Started | 0/5 |
| Week 1 | 4 | ⬜ Not Started | 0/4 |
| Week 2 | 3 | ⬜ Not Started | 0/3 |
| Week 3 | 3 | ⬜ Not Started | 0/3 |
| **TOTAL** | **15** | ⬜ **0%** | **0/15** |

**Estimated Completion**: 3-4 weeks (134-198 hours)

---

**Last Updated**: 2025-11-07
**Based On**: SYSTEM_AUDIT_REPORT.md
**Generated By**: Claude Code + 7-Agent Analysis
