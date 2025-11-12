# ClientForge-CRM Development Guide

**Last Updated**: 2025-11-12  
**Audience**: Backend & Frontend Developers

---

## Quick Start

```bash
# Clone repository
git clone <repo-url>
cd clientforge-crm

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration (see Environment Setup below)

# Run development servers
npm run dev:backend   # Backend on port 3000
npm run dev:frontend  # Frontend on port 3001
```

---

## Environment Setup

### Required Environment Variables

ClientForge-CRM requires **7 critical environment variables** to operate. The server validates these on startup and will fail in production if any are missing.

**1. Copy the example file**:
```bash
cp .env.example .env
```

**2. Edit `.env` and set all required variables**:

#### Database Configuration
```bash
# SQLite (development)
DATABASE_URL=sqlite:./data/dev.db

# PostgreSQL (production - future)
# DATABASE_URL=postgresql://user:password@localhost:5432/clientforge
```

#### Cache Configuration
```bash
# Local Redis
REDIS_URL=redis://localhost:6379

# Production Redis with auth
# REDIS_URL=redis://:password@prod-redis:6379
```

#### Security Secrets

⚠️ **CRITICAL**: These must be unique, strong, randomly generated values in production!

```bash
# JWT signing key (256-bit minimum)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars

# Express session secret (256-bit minimum)
SESSION_SECRET=your-session-secret-min-32-chars

# AES-256 encryption key (EXACTLY 32 characters)
ENCRYPTION_KEY=your-encryption-key-32-chars!!
```

**Generate secure secrets**:
```bash
# macOS/Linux
openssl rand -base64 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

#### AI Service API Keys
```bash
# OpenAI API key
OPENAI_API_KEY=sk-your-openai-api-key

# Anthropic Claude API key
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
```

#### Optional Configuration
```bash
# Environment (development | production | test)
NODE_ENV=development

# Server port
PORT=3000

# API version
API_VERSION=v1

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3001
```

### Environment Validation

**Startup Behavior**:

When you run `npm start`, the server:
1. Loads `.env` file
2. Validates all 7 required variables
3. If any are missing:
   - **Development**: Logs warning, continues startup
   - **Production**: Throws error, exits with code 1

**Example Output (Missing Variables)**:
```
❌ Missing required environment variables: JWT_SECRET, ENCRYPTION_KEY
⚠️  Server will start but may fail at runtime
```

**Validation Command**:
```bash
# Check environment without starting server
node -e "require('dotenv').config(); require('./backend/config/env-validator').initEnvValidation()"
```

### Environment-Specific Files

You can create environment-specific overrides:

```bash
.env                  # Base configuration (gitignored)
.env.development      # Development overrides
.env.production       # Production overrides
.env.test             # Test environment
.env.example          # Template (safe for Git)
```

**Priority**: Specific file > Base .env > System environment variables

### Security Best Practices

**DO**:
- ✅ Copy `.env.example` to `.env` for local development
- ✅ Generate unique secrets for each environment
- ✅ Keep `.env` in `.gitignore` (never commit)
- ✅ Use strong random values for secrets
- ✅ Rotate secrets every 90 days

**DON'T**:
- ❌ Commit `.env` file to Git
- ❌ Share secrets via Slack/email
- ❌ Use `.env.example` placeholder values in production
- ❌ Hardcode secrets in source code
- ❌ Reuse secrets across environments

**See**: [Security Documentation](/docs/SECURITY.md) for complete security guidelines.

---

## Type Safety & TypeScript

### Current State: Strict Mode Migration (Phase 2 Complete)

ClientForge-CRM is actively migrating to TypeScript strict mode. As of November 2025:

- **Status**: Phase 2 of 6 complete
- **Type Errors**: 172 remaining (down from 309 baseline - 44% reduction)
- **Build Impact**: None (errors are warnings, builds pass)
- **Developer Impact**: More IDE feedback, optional fixes

### Type Checking Commands

```bash
# Run full type check (no build output)
npm run type-check

# Build with type checking (produces dist/ folder)
npm run build

# View migration progress
cat scripts/dev-tools/strict-progress.md
```

### Strict Mode Flags (Phase 1)

Currently enabled in `backend/tsconfig.json`:

```json
{
  "noImplicitAny": true,        // No implicit 'any' types
  "noImplicitThis": true,       // 'this' must be explicitly typed
  "strictBindCallApply": true,  // Strict .bind/.call/.apply checks
  "alwaysStrict": true          // Emit "use strict" in JS
}
```

### Common Type Errors & Fixes

#### 1. Implicit `any` in Route Handlers (57% of errors)

**Error**: `TS2769: No overload matches this call`

```typescript
// ❌ Before: Implicit any types
router.get('/api/users', (req, res) => {  // ❌ Implicit any
  const userId = req.user.userId;         // ❌ Wrong property name
  res.json({ userId });
});

// ✅ After: Explicit types
import { Request, Response } from 'express';
import { AuthRequest } from '@/types/auth';

router.get('/api/users', (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;  // ✅ Correct property name + null-safety
  res.json({ userId });
});
```

**Key Changes in Phase 2**:
- `req.user.userId` → `req.user.id`
- `req.user.roleId` → `req.user.role`

**Complete AuthRequest Interface**:
```typescript
interface AuthRequest extends Request {
  user?: {
    id: string;              // ✅ Aligned with Express
    email: string;
    tenantId: string;        // ClientForge-specific
    role?: string;           // ✅ Aligned with Express
    permissions?: string[];  // ClientForge-specific
  }
}
```

#### 2. Missing Type Imports

**Error**: `TS2307: Cannot find module '@types/js-yaml'`

```bash
# Install missing types
npm install --save-dev @types/js-yaml
```

#### 3. Property Typos

**Error**: `TS2551: Property 'setex' does not exist. Did you mean 'setEx'?`

```typescript
// ❌ Before: Typo in method name
await redis.setex(key, ttl, value);

// ✅ After: Correct method name
await redis.setEx(key, ttl, value);
```

### Best Practices

1. **Always add types to new code**: Don't add to the error count
2. **Fix errors in files you touch**: Incremental improvement
3. **Use type guards**: Safely check types at runtime
4. **Leverage IDE**: Red squiggles are your friends
5. **Consult the tracker**: `scripts/dev-tools/strict-progress.md` shows priorities

### Migration Timeline

| Phase | Expected Completion | Error Reduction |
|-------|---------------------|-----------------|
| Phase 1: Safe flags | ✅ Complete (Nov 12) | Baseline: 309 |
| Phase 2: AuthRequest fix | ✅ Complete (Nov 12) | -44% (→172 errors) |
| Phase 3: Explicit types | Week of Nov 18 | Target: →102 errors |
| Phase 4: Module resolution | Week of Nov 25 | Target: →77 errors |
| Phase 5: Property access | Week of Dec 2 | Target: 0 errors |
| Phase 6: Full strict mode | Week of Dec 16 | Zero errors 🎯 |

**References**: 
- [ADR-0002: TypeScript Strict Mode Migration](/docs/architecture/decisions/ADR-0002-typescript-strict-mode.md)
- [ADR-0003: AuthRequest Interface Alignment](/docs/architecture/decisions/ADR-0003-authrequest-interface-alignment.md)

---

## Development Workflow

### Branch Strategy

```
main          - Production-ready code
develop       - Integration branch
feature/*     - New features
fix/*         - Bug fixes
chore/*       - Maintenance tasks
```

### Commit Conventions

```
feat(scope): description      # New feature
fix(scope): description       # Bug fix
docs(scope): description      # Documentation
chore(scope): description     # Maintenance
refactor(scope): description  # Code refactoring
test(scope): description      # Testing
```

### Code Review Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Run `npm run type-check` and `npm test`
4. Push branch and create PR
5. Address review feedback
6. Merge to `develop` when approved

---

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.spec.ts

# Watch mode
npm run test:watch
```

---

## Building

```bash
# Development build
npm run build:dev

# Production build
npm run build

# Clean build artifacts
npm run clean
```

---

## Debugging

### Backend Debugging

```bash
# Run with Node debugger
npm run debug:backend

# Attach to process in VS Code
# Use "Attach to Node" launch configuration
```

### Frontend Debugging

```bash
# Run with source maps
npm run dev:frontend

# Open Chrome DevTools
# Set breakpoints in Sources tab
```

---

## Common Issues

### Port Already in Use

```bash
# Kill process on port 3000
npx kill-port 3000

# Or change port in .env
PORT=3002
```

### Missing Environment Variables

```
❌ Missing required environment variables: JWT_SECRET
```

**Fix**: Copy `.env.example` to `.env` and fill in all required values.

```bash
cp .env.example .env
# Edit .env with your values
```

### Type Errors Blocking Development

Type errors are **warnings only** during strict mode migration. Your code will still build and run.

To hide type errors temporarily:
```bash
# Build without type checking
npm run build -- --no-check
```

### Module Resolution Errors

```bash
# Clear TypeScript cache
rm -rf node_modules/.cache

# Reinstall dependencies
npm install
```

---

## Tools & Extensions

### Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- GitLens
- Thunder Client (API testing)

### Configuration Files

- `.vscode/settings.json` - Workspace settings
- `.eslintrc.js` - Linting rules
- `.prettierrc` - Code formatting
- `tsconfig.json` - TypeScript configuration
- `.env` - Environment variables (gitignored)
- `.env.example` - Environment template (committed)

---

## Architecture References

- [System Architecture](/docs/ARCHITECTURE.md)
- [API Documentation](/docs/api/)
- [Security Guidelines](/docs/SECURITY.md)
- [Module System](/docs/MODULE_SYSTEM.md)
- [Environment & Secrets](/docs/architecture/decisions/ADR-0004-environment-validator-secrets-manager.md)

---

## Getting Help

- **Documentation**: `/docs/`
- **Progress Trackers**: `scripts/dev-tools/`
- **Team Contact**: Slack #clientforge-dev
- **Bug Reports**: GitHub Issues
- **Security Issues**: security@abstractcreatives.com
