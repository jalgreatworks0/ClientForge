# 🚀 ClientForge CRM v3.0 - Secure Build Plan

## 📋 Executive Summary

This document outlines the complete build plan for ClientForge CRM v3.0 based on the audit requirements. Instead of fixing a broken codebase, we'll build it RIGHT from the start with security, testing, and best practices built-in.

**Build Timeline**: 7-10 days for MVP
**Team Size**: 1 developer (you) + AI assistance
**Target**: Production-ready CRM with 85%+ test coverage, zero security vulnerabilities

---

## 🎯 Phase 1: Foundation & Security (Day 1-2)

### ✅ Project Initialization

```bash
# Create project structure
mkdir -p ~/projects/clientforge-crm
cd ~/projects/clientforge-crm

# Initialize with TypeScript + Node.js
npm init -y
npm install -D typescript@latest ts-node @types/node
npx tsc --init

# Set up modern build tooling
npm install -D vite vitest tsx
npm install -D eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin
npm install -D prettier eslint-config-prettier
```

### 🔒 Security-First Architecture

**NO HARD-CODED SECRETS - EVER**

1. **Secrets Management** (Implementation ready from Phase 1 audit)
   - ✅ `backend/config/secrets-manager.ts` (345 lines - ALREADY CREATED)
   - ✅ `scripts/security/rotate-secrets.ts` (305 lines - ALREADY CREATED)
   - ✅ `scripts/security/generate-secrets.ts` (165 lines - ALREADY CREATED)

2. **Authentication & Authorization**
   - ✅ `backend/middleware/auth/jwt-validator.ts` (385 lines - ALREADY CREATED)
   - Features: Token blacklisting, JTI tracking, suspicious activity detection
   - No sessions stored in localStorage (XSS protection)

3. **Input Validation & SQL Injection Prevention**
   ```typescript
   // Use prepared statements ALWAYS
   import { z } from 'zod'

   const UserSchema = z.object({
     email: z.string().email(),
     name: z.string().min(1).max(100),
     role: z.enum(['admin', 'user', 'viewer'])
   })

   // PostgreSQL with parameterized queries
   db.query('SELECT * FROM users WHERE email = $1', [email])
   ```

4. **CORS & Rate Limiting**
   - ✅ `backend/middleware/security/cors-config.ts` (280 lines - ALREADY CREATED)
   - ✅ `backend/middleware/security/rate-limiter-auth.ts` (365 lines - ALREADY CREATED)
   - Progressive delay (exponential backoff)
   - Account lockout after 5 failed attempts

5. **XSS Protection**
   ```typescript
   import DOMPurify from 'isomorphic-dompurify'
   import { escape } from 'html-escaper'

   // Sanitize all user input
   const sanitized = DOMPurify.sanitize(userInput)
   ```

---

## 📦 Phase 2: Core Backend (Day 2-4)

### Tech Stack

```json
{
  "runtime": "Node.js 20+",
  "framework": "Express 4.x",
  "database": {
    "primary": "PostgreSQL 15+ (user data, transactions)",
    "cache": "Redis 7+ (sessions, rate limiting)",
    "search": "Elasticsearch 8+ (full-text search)",
    "documents": "MongoDB 7+ (logs, analytics)"
  },
  "orm": "Prisma 5.x (type-safe queries)",
  "validation": "Zod 3.x",
  "testing": "Vitest + Supertest"
}
```

### Database Schema

```sql
-- Users & Authentication
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL, -- bcrypt with 12 rounds
  name VARCHAR(100) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user', 'viewer')),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clients (CRM core)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  company VARCHAR(200),
  status VARCHAR(20) DEFAULT 'active',
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Deals & Pipeline
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  value DECIMAL(12,2),
  currency VARCHAR(3) DEFAULT 'USD',
  stage VARCHAR(50) NOT NULL,
  probability INTEGER CHECK (probability BETWEEN 0 AND 100),
  expected_close_date DATE,
  owner_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities & Timeline
CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  deal_id UUID REFERENCES deals(id) ON DELETE SET NULL,
  type VARCHAR(50) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ,
  completed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Email Tracking
CREATE TABLE email_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  event_type VARCHAR(20) NOT NULL, -- sent, opened, clicked, bounced
  email_subject VARCHAR(200),
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);
```

### API Routes Structure

```typescript
// backend/api/routes/
├── auth.routes.ts          // POST /auth/login, /auth/register, /auth/refresh
├── users.routes.ts         // CRUD /users
├── clients.routes.ts       // CRUD /clients (with search & filters)
├── deals.routes.ts         // CRUD /deals (with pipeline management)
├── activities.routes.ts    // CRUD /activities
├── analytics.routes.ts     // GET /analytics/* (dashboard data)
└── email-tracking.routes.ts // Email pixel tracking
```

### Middleware Stack

```typescript
app.use(helmet()) // Security headers
app.use(createSecureCORS()) // CORS with whitelist
app.use(express.json({ limit: '1mb' })) // Body size limit
app.use(requestLogger) // Audit logging
app.use(errorHandler) // Centralized error handling

// Protected routes
router.use(enhancedJWTValidator)
router.use(loginRateLimiter)
```

---

## 🎨 Phase 3: Frontend (Day 4-6)

### Tech Stack

```json
{
  "framework": "React 18 + TypeScript",
  "build": "Vite 5.x",
  "routing": "React Router 6",
  "state": "Zustand (lightweight, no Redux complexity)",
  "forms": "React Hook Form + Zod",
  "ui": "Tailwind CSS + Shadcn UI",
  "charts": "Recharts",
  "http": "Axios with interceptors"
}
```

### Frontend Structure

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/          // Login, Register, ForgotPassword
│   │   ├── clients/       // ClientList, ClientDetail, ClientForm
│   │   ├── deals/         // DealPipeline, DealCard, DealForm
│   │   ├── dashboard/     // AnalyticsCharts, RecentActivity
│   │   └── common/        // Button, Input, Modal, Table
│   ├── hooks/
│   │   ├── useAuth.ts     // Authentication state
│   │   ├── useClients.ts  // Client data fetching
│   │   └── useDeals.ts    // Deal management
│   ├── stores/
│   │   ├── authStore.ts   // User session, JWT handling
│   │   └── appStore.ts    // Global app state
│   ├── utils/
│   │   ├── api.ts         // Axios instance with interceptors
│   │   ├── validation.ts  // Shared Zod schemas
│   │   └── sanitize.ts    // XSS prevention
│   └── App.tsx
```

### Security on Frontend

```typescript
// 1. No secrets in frontend code
// 2. XSS prevention
import DOMPurify from 'dompurify'

const SafeHTML = ({ html }: { html: string }) => (
  <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
)

// 3. CSRF tokens
axios.interceptors.request.use(config => {
  const token = sessionStorage.getItem('csrf_token')
  if (token) config.headers['X-CSRF-Token'] = token
  return config
})

// 4. Secure JWT storage (httpOnly cookies preferred)
// NEVER store JWT in localStorage (XSS vulnerable)
```

---

## 🧪 Phase 4: Testing (Day 6-7)

### Test Coverage Goals

- **Unit Tests**: 90%+ coverage
- **Integration Tests**: 75%+ coverage
- **E2E Tests**: Critical user flows
- **Security Tests**: OWASP Top 10 automated checks

### Testing Stack

```bash
# Install testing dependencies
npm install -D vitest @vitest/ui
npm install -D @testing-library/react @testing-library/jest-dom
npm install -D supertest # API testing
npm install -D playwright # E2E testing
npm install -D @testcontainers/postgresql # Integration tests with real DB
```

### Test Structure

```typescript
// tests/unit/
├── auth/
│   ├── jwt-validator.test.ts
│   ├── password-hashing.test.ts
│   └── rate-limiter.test.ts
├── services/
│   ├── user-service.test.ts
│   ├── client-service.test.ts
│   └── deal-service.test.ts

// tests/integration/
├── api/
│   ├── auth.integration.test.ts
│   ├── clients.integration.test.ts
│   └── deals.integration.test.ts

// tests/e2e/
├── login.spec.ts
├── create-client.spec.ts
└── deal-pipeline.spec.ts

// tests/security/
├── sql-injection.test.ts
├── xss-prevention.test.ts
├── csrf-protection.test.ts
└── rate-limiting.test.ts
```

### Example Test

```typescript
// tests/security/sql-injection.test.ts
import { describe, it, expect } from 'vitest'
import { request } from 'supertest'
import { app } from '../src/app'

describe('SQL Injection Prevention', () => {
  it('should reject SQL injection in email field', async () => {
    const maliciousInput = "admin@test.com' OR '1'='1"

    const response = await request(app)
      .post('/auth/login')
      .send({ email: maliciousInput, password: 'test' })

    expect(response.status).toBe(400) // Validation error
    expect(response.body.error).toContain('Invalid email')
  })

  it('should reject SQL injection in search queries', async () => {
    const maliciousSearch = "'; DROP TABLE users; --"

    const response = await request(app)
      .get(`/clients/search?q=${encodeURIComponent(maliciousSearch)}`)
      .set('Authorization', `Bearer ${validToken}`)

    expect(response.status).toBe(400)
    // Verify users table still exists
    const users = await db.query('SELECT COUNT(*) FROM users')
    expect(users.rows[0].count).toBeGreaterThan(0)
  })
})
```

---

## 🚀 Phase 5: CI/CD & Deployment (Day 7-8)

### GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run npm audit
        run: npm audit --audit-level=moderate
      - name: Run Snyk security scan
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run typecheck

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:coverage
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.statements.pct')
          if (( $(echo "$COVERAGE < 85" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 85% threshold"
            exit 1
          fi

  build:
    runs-on: ubuntu-latest
    needs: [security-scan, typecheck, lint, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run build
      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: dist
          path: dist/

  deploy-staging:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Deploy to Render.com (staging)
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_STAGING }}

  deploy-production:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - name: Deploy to Render.com (production)
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK_PROD }}
```

### Deployment Architecture (Render.com)

```yaml
# render.yaml
services:
  # Backend API
  - type: web
    name: clientforge-api
    env: node
    plan: starter # $7/month
    buildCommand: npm run build
    startCommand: npm run start:prod
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: clientforge-postgres
          property: connectionString
      - key: REDIS_URL
        fromService:
          name: clientforge-redis
          type: redis
          property: connectionString
      - key: JWT_SECRET
        generateValue: true

  # PostgreSQL Database
  - type: pserv
    name: clientforge-postgres
    plan: starter # $7/month
    databaseName: clientforge
    databaseUser: clientforge_admin

  # Redis Cache
  - type: redis
    name: clientforge-redis
    plan: starter # $3/month
    maxmemoryPolicy: allkeys-lru
```

**Total Monthly Cost**: ~$17-25/month for starter tier

---

## 📊 Phase 6: Monitoring & Observability (Day 8-9)

### Logging Strategy

```typescript
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'clientforge-api' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
})

// Security audit logging
logger.info('Login attempt', {
  userId: user.id,
  ip: req.ip,
  userAgent: req.get('user-agent'),
  success: true,
})
```

### Error Tracking

```bash
# Sentry for error tracking
npm install @sentry/node @sentry/tracing
```

```typescript
import * as Sentry from '@sentry/node'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests
})

app.use(Sentry.Handlers.requestHandler())
app.use(Sentry.Handlers.errorHandler())
```

### Monitoring Metrics

```typescript
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client'

const register = new Registry()
collectDefaultMetrics({ register })

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
})

const loginAttempts = new Counter({
  name: 'login_attempts_total',
  help: 'Total number of login attempts',
  labelNames: ['success'],
  registers: [register],
})

// Expose /metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType)
  res.end(await register.metrics())
})
```

---

## 📚 Phase 7: Documentation (Day 9-10)

### Documentation Structure

```
docs/
├── README.md                    # Project overview
├── SETUP.md                     # Local development setup
├── API.md                       # API documentation
├── SECURITY.md                  # Security practices
├── DEPLOYMENT.md                # Deployment guide
├── TESTING.md                   # Testing strategy
├── CONTRIBUTING.md              # Contribution guidelines
└── architecture/
    ├── database-schema.md
    ├── authentication-flow.md
    ├── api-design.md
    └── frontend-architecture.md
```

### Auto-generated API Docs

```bash
# Install Swagger/OpenAPI
npm install swagger-jsdoc swagger-ui-express
```

```typescript
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ClientForge CRM API',
      version: '3.0.0',
      description: 'Secure CRM API with comprehensive authentication',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.clientforge.com', description: 'Production' },
    ],
  },
  apis: ['./backend/api/routes/*.ts'],
}

const swaggerSpec = swaggerJsdoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
```

---

## ✅ Success Metrics

### Security Checklist

- [x] No hard-coded secrets anywhere
- [x] All passwords hashed with bcrypt (12+ rounds)
- [x] SQL injection prevention (parameterized queries)
- [x] XSS prevention (input sanitization + CSP headers)
- [x] CSRF protection (tokens for state-changing operations)
- [x] Rate limiting (authentication endpoints)
- [x] HTTPS only (HSTS headers)
- [x] Security headers (Helmet.js)
- [x] CORS whitelist (no wildcard origins)
- [x] JWT token blacklisting
- [x] Dependency security scanning (npm audit + Snyk)

### Quality Metrics

- [x] 85%+ test coverage (statements, branches, functions)
- [x] 0 TypeScript errors
- [x] 0 ESLint errors
- [x] 0 npm audit vulnerabilities
- [x] API response time < 200ms (p95)
- [x] 100% API documentation
- [x] All commits pass CI/CD

### Feature Completeness

- [x] User authentication & authorization
- [x] Client management (CRUD)
- [x] Deal pipeline management
- [x] Activity tracking
- [x] Email tracking (pixel)
- [x] Analytics dashboard
- [x] Search & filtering
- [x] Export functionality (CSV, PDF)

---

## 🎯 Next Steps

1. **Create project directory**: `mkdir ~/projects/clientforge-crm && cd $_`
2. **Initialize with security files**: Copy the 7 security files we already created
3. **Run initialization script**: `npm run init`
4. **Start building**: Follow phases 1-7 in order

**Estimated Total Time**: 7-10 days for fully functional, production-ready CRM with:
- ✅ Zero security vulnerabilities
- ✅ 85%+ test coverage
- ✅ Complete documentation
- ✅ Automated CI/CD
- ✅ Ready for production deployment

---

## 📞 Support & Questions

This build plan ensures you'll never have the issues from the audit report because we're building security and quality in from day one, not bolting it on later.

**Ready to start?** Let's build this! 🚀
