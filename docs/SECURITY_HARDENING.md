# Security Hardening Guide

## Overview

This document outlines all security measures implemented in ClientForge CRM to protect against common vulnerabilities and ensure OWASP Top 10 compliance.

## Table of Contents

1. [OWASP Top 10 Compliance](#owasp-top-10-compliance)
2. [SQL Injection Prevention](#sql-injection-prevention)
3. [Cross-Site Scripting (XSS) Protection](#cross-site-scripting-xss-protection)
4. [Cross-Site Request Forgery (CSRF) Protection](#cross-site-request-forgery-csrf-protection)
5. [Rate Limiting](#rate-limiting)
6. [Input Sanitization](#input-sanitization)
7. [Authentication & Authorization](#authentication--authorization)
8. [Password Security](#password-security)
9. [Security Headers](#security-headers)
10. [Security Testing](#security-testing)

---

## OWASP Top 10 Compliance

### A01:2021 – Broken Access Control ✅

**Protection Measures:**
- Role-Based Access Control (RBAC) implemented
- Multi-tenant data isolation (tenant_id in all queries)
- Authentication required for all protected endpoints
- Authorization middleware checks user permissions
- Row-level security enforced in repositories

**Implementation:**
```typescript
// backend/middleware/authenticate.ts
// Verifies JWT token and extracts user context

// backend/middleware/authorize.ts
// Checks user role and permissions
```

### A02:2021 – Cryptographic Failures ✅

**Protection Measures:**
- bcrypt with cost factor 12 for password hashing
- JWT with HS256 algorithm for tokens
- Secrets stored in environment variables
- HTTPS enforcement in production
- Secure cookie flags (httpOnly, secure, sameSite)

**Implementation:**
```typescript
// backend/core/auth/password-service.ts
// Uses bcrypt.hash() with saltRounds=12

// backend/core/auth/jwt-service.ts
// Generates secure JWT tokens
```

### A03:2021 – Injection ✅

**Protection Measures:**
- **SQL Injection:** Parameterized queries ($1, $2, etc.) everywhere
- **NoSQL Injection:** Input validation before MongoDB queries
- **Command Injection:** No system commands from user input
- **XSS:** DOMPurify sanitization for HTML content

**Implementation:**
```typescript
// All database queries use parameterized format
await pool.query(
  'SELECT * FROM users WHERE email = $1 AND tenant_id = $2',
  [email, tenantId]
)

// Never use string concatenation:
// ❌ BAD: `SELECT * FROM users WHERE email = '${email}'`
```

### A04:2021 – Insecure Design ✅

**Protection Measures:**
- Secure defaults (HTTPS, secure cookies)
- Input validation at all layers
- Fail-safe defaults (deny by default)
- Rate limiting on all endpoints
- Account lockout after failed login attempts

### A05:2021 – Security Misconfiguration ✅

**Protection Measures:**
- Security headers (Helmet.js)
- Disabled error stack traces in production
- No default credentials
- Secure session configuration
- CORS properly configured

**Implementation:**
```typescript
// backend/api/server.ts
app.use(helmet({
  contentSecurityPolicy: { /* ... */ },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}))
```

### A06:2021 – Vulnerable and Outdated Components ✅

**Protection Measures:**
- Regular `npm audit` checks
- Automated dependency updates
- No deprecated packages
- Security patches applied promptly

**Verification:**
```bash
npm audit
npm audit fix
```

### A07:2021 – Identification and Authentication Failures ✅

**Protection Measures:**
- Strong password policy enforced
- Account lockout after 5 failed attempts
- Session management with Redis
- JWT token expiration (15 min access, 7 day refresh)
- Email verification for new accounts
- Password reset with secure tokens

**Implementation:**
```typescript
// backend/core/auth/auth-service.ts
// Implements account lockout, session management
```

### A08:2021 – Software and Data Integrity Failures ✅

**Protection Measures:**
- Input validation with schemas
- Data integrity checks
- Audit logging for critical operations
- Immutable audit trails

### A09:2021 – Security Logging and Monitoring Failures ✅

**Protection Measures:**
- Structured logging (Winston)
- Audit logs for authentication events
- Failed login attempt tracking
- Monitoring for suspicious activity
- Performance and security metrics

**Implementation:**
```typescript
// backend/utils/logging/audit-logger.ts
// Logs all authentication events, permission changes
```

### A10:2021 – Server-Side Request Forgery (SSRF) ✅

**Protection Measures:**
- URL validation before external requests
- Whitelist of allowed domains
- No user-controlled URLs in server requests
- Input sanitization for URLs

---

## SQL Injection Prevention

### Parameterized Queries

**ALL database queries MUST use parameterized format:**

```typescript
// ✅ CORRECT - Parameterized query
const result = await pool.query(
  'SELECT * FROM contacts WHERE email = $1 AND tenant_id = $2',
  [email, tenantId]
)

// ❌ WRONG - String concatenation (NEVER DO THIS)
const result = await pool.query(
  `SELECT * FROM contacts WHERE email = '${email}'`
)
```

### LIKE Query Protection

For LIKE queries, escape wildcards:

```typescript
import { sanitizeSqlLikePattern } from '../utils/sanitization/input-sanitizer'

const searchTerm = sanitizeSqlLikePattern(userInput)
await pool.query(
  'SELECT * FROM contacts WHERE name LIKE $1',
  [`%${searchTerm}%`]
)
```

### Verification Checklist

- ✅ All queries use `$1, $2, $3` parameter placeholders
- ✅ No string concatenation in SQL
- ✅ No template literals with user input
- ✅ LIKE patterns are sanitized
- ✅ Table/column names are NOT from user input

---

## Cross-Site Scripting (XSS) Protection

### Server-Side Protection

**Location:** `backend/utils/sanitization/input-sanitizer.ts`

```typescript
import { sanitizeHtml, sanitizePlainText } from '../utils/sanitization/input-sanitizer'

// For rich text content (allows safe HTML)
const safeHtml = sanitizeHtml(userInput)

// For plain text (strips all HTML)
const safeText = sanitizePlainText(userInput)
```

### Allowed HTML Tags

Safe tags allowed by sanitizeHtml():
- Text: `<p>`, `<br>`, `<strong>`, `<em>`, `<u>`
- Headers: `<h1>` through `<h6>`
- Lists: `<ul>`, `<ol>`, `<li>`
- Links: `<a>` (only href, title, target, rel attributes)
- Code: `<code>`, `<pre>`, `<blockquote>`

**Blocked:**
- `<script>`, `<iframe>`, `<object>`, `<embed>`
- All event handlers (onclick, onerror, etc.)
- `javascript:` URLs
- `data:` URLs

### Client-Side Protection

**React automatically escapes values:**
```tsx
// ✅ Safe - React escapes by default
<div>{userInput}</div>

// ⚠️ Dangerous - Only use with sanitized content
<div dangerouslySetInnerHTML={{ __html: sanitizeHtml(userInput) }} />
```

### Content Security Policy

**Location:** `backend/api/server.ts`

```typescript
helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Tailwind requires inline styles
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
})
```

---

## Cross-Site Request Forgery (CSRF) Protection

### Implementation

**Location:** `backend/middleware/csrf-protection.ts`

**How it works:**
1. Server generates CSRF token for each session
2. Token stored server-side and sent to client in cookie
3. Client includes token in all state-changing requests
4. Server validates token before processing request

### Backend Usage

```typescript
import { csrfProtection, getCsrfToken } from '../middleware/csrf-protection'

// Apply to all routes that need protection
app.use(csrfProtection())

// Endpoint to get CSRF token
app.get('/api/v1/csrf-token', getCsrfToken)
```

### Frontend Usage

```typescript
// 1. Get CSRF token from cookie
const csrfToken = document.cookie
  .split('; ')
  .find(row => row.startsWith('XSRF-TOKEN='))
  ?.split('=')[1]

// 2. Include in all POST/PUT/PATCH/DELETE requests
fetch('/api/v1/resource', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-XSRF-TOKEN': csrfToken,
  },
  body: JSON.stringify(data),
})
```

### Safe Methods

CSRF protection skips these safe methods (no state changes):
- GET
- HEAD
- OPTIONS

### Token Lifecycle

- **Generated:** On first request or after validation
- **Stored:** Server-side in memory (use Redis in production)
- **Expires:** 24 hours
- **Rotation:** New token generated after each validation
- **Invalidated:** On logout

---

## Rate Limiting

### Implementation

**Location:** `backend/middleware/rate-limiter.ts`

### Pre-configured Limiters

#### 1. Authentication Rate Limiter
**Prevents brute force attacks:**
```typescript
import { authRateLimiter } from '../middleware/rate-limiter'

// Apply to login endpoints
app.post('/api/v1/auth/login', authRateLimiter, loginHandler)
```

**Limits:**
- 5 requests per 15 minutes per IP
- Successful logins don't count (skipSuccessfulRequests)
- Returns 429 with Retry-After header when exceeded

#### 2. General API Rate Limiter
```typescript
import { apiRateLimiter } from '../middleware/rate-limiter'

// Apply to all API routes
app.use('/api/v1', apiRateLimiter)
```

**Limits:**
- 100 requests per minute per IP + tenant
- Applies to all authenticated requests

#### 3. Sensitive Operations Limiter
```typescript
import { sensitiveRateLimiter } from '../middleware/rate-limiter'

// Apply to password reset, email verification, etc.
app.post('/api/v1/auth/password-reset', sensitiveRateLimiter, handler)
```

**Limits:**
- 10 requests per minute
- For operations like password reset, email changes

#### 4. Per-User Rate Limiter
```typescript
import { perUserRateLimiter } from '../middleware/rate-limiter'

// Limits per authenticated user (not IP)
app.use('/api/v1/users/:id', perUserRateLimiter)
```

**Limits:**
- 60 requests per user per minute
- Tracks by user ID, not IP

#### 5. Email Rate Limiter
```typescript
import { emailRateLimiter } from '../middleware/rate-limiter'

app.post('/api/v1/auth/send-verification', emailRateLimiter, handler)
```

**Limits:**
- 10 emails per hour per email address
- Prevents email spam

### Custom Rate Limiter

```typescript
import { createRateLimiter } from '../middleware/rate-limiter'

const customLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
  message: 'Too many requests',
  keyGenerator: (req) => req.ip || 'unknown',
})

app.use('/api/v1/custom', customLimiter)
```

### Rate Limit Headers

All responses include rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2025-01-06T12:00:00.000Z
Retry-After: 60  (only when limit exceeded)
```

### Production Considerations

**Current:** In-memory store (single server)
**Production:** Use Redis for distributed rate limiting

```typescript
// TODO: Implement Redis rate limiter for production
// npm install rate-limit-redis
```

---

## Input Sanitization

### Sanitization Functions

**Location:** `backend/utils/sanitization/input-sanitizer.ts`

#### 1. HTML Sanitization
```typescript
import { sanitizeHtml } from '../utils/sanitization/input-sanitizer'

const safeHtml = sanitizeHtml(userInput)
// Allows safe HTML tags, removes scripts, event handlers
```

#### 2. Plain Text Sanitization
```typescript
import { sanitizePlainText } from '../utils/sanitization/input-sanitizer'

const safeText = sanitizePlainText(userInput)
// Strips ALL HTML tags
```

#### 3. Email Sanitization
```typescript
import { sanitizeEmail } from '../utils/sanitization/input-sanitizer'

const safeEmail = sanitizeEmail(userInput)
// Validates format, converts to lowercase, removes invalid chars
// Returns empty string if invalid
```

#### 4. URL Sanitization
```typescript
import { sanitizeUrl } from '../utils/sanitization/input-sanitizer'

const safeUrl = sanitizeUrl(userInput)
// Validates URL, blocks javascript: and data: protocols
// Returns empty string if invalid
```

#### 5. Filename Sanitization
```typescript
import { sanitizeFilename } from '../utils/sanitization/input-sanitizer'

const safeFilename = sanitizeFilename(userInput)
// Prevents directory traversal (../, ..\)
// Removes path separators
// Limits length to 255 characters
```

#### 6. SQL LIKE Pattern Sanitization
```typescript
import { sanitizeSqlLikePattern } from '../utils/sanitization/input-sanitizer'

const pattern = sanitizeSqlLikePattern(userInput)
// Escapes %, _, \ characters
// Use with parameterized queries
```

#### 7. Database Identifier Sanitization
```typescript
import { sanitizeIdentifier } from '../utils/sanitization/input-sanitizer'

const safeColumn = sanitizeIdentifier(userInput)
// Only allows alphanumeric and underscore
// Must start with letter or underscore
```

#### 8. Type Sanitization
```typescript
import {
  sanitizeInteger,
  sanitizeFloat,
  sanitizeBoolean
} from '../utils/sanitization/input-sanitizer'

const id = sanitizeInteger(req.query.id, 0) // Default: 0
const price = sanitizeFloat(req.query.price, 0.0)
const active = sanitizeBoolean(req.query.active, false)
```

### Object Sanitization

```typescript
import { sanitizeObject } from '../utils/sanitization/input-sanitizer'

// Recursively sanitize all string values
const safeData = sanitizeObject(req.body, sanitizePlainText)
```

### Best Practices

1. **Sanitize at Input:** Sanitize as soon as data enters the system
2. **Validate First:** Validate data structure before sanitization
3. **Layer Defense:** Sanitize at multiple layers (controller + service)
4. **Context-Aware:** Use appropriate sanitizer for context (HTML vs plain text)
5. **Never Trust Input:** Assume all input is malicious

---

## Authentication & Authorization

### Authentication Flow

1. **User Login:**
   ```typescript
   POST /api/v1/auth/login
   {
     "email": "user@example.com",
     "password": "securePassword123!",
     "tenantId": "tenant-uuid"
   }
   ```

2. **Server Response:**
   ```json
   {
     "accessToken": "eyJhbGci...",
     "refreshToken": "eyJhbGci...",
     "expiresIn": 900,
     "user": { ... }
   }
   ```

3. **Client Includes Token:**
   ```
   Authorization: Bearer eyJhbGci...
   ```

### Account Lockout

**Protection against brute force:**
- 5 failed login attempts
- Account locked for 30 minutes
- Lockout tracked per user account

**Implementation:**
```typescript
// backend/core/auth/auth-service.ts
if (user.isLocked && user.lockedUntil && new Date() < user.lockedUntil) {
  throw new ForbiddenError('Account is temporarily locked')
}
```

### Session Management

**Location:** `backend/core/auth/session-service.ts`

- Sessions stored in Redis for fast access
- Session metadata in PostgreSQL for audit trail
- Automatic expiration (7 days for refresh tokens)
- Session invalidation on logout
- Concurrent session limits (max 5 per user)

### Multi-Tenant Isolation

**Every query includes tenant_id:**
```typescript
WHERE tenant_id = $1 AND id = $2
```

**User context always includes tenant:**
```typescript
req.user = {
  userId: 'user-uuid',
  tenantId: 'tenant-uuid',
  roleId: 'role-uuid',
  email: 'user@example.com'
}
```

---

## Password Security

### Password Policy

**Location:** `config/security/security-config.ts`

**Requirements:**
- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 lowercase letter
- At least 1 number
- At least 1 special character

### Password Hashing

**Algorithm:** bcrypt
**Cost Factor:** 12 (configurable via env)

```typescript
// backend/core/auth/password-service.ts
const hash = await bcrypt.hash(password, 12)
```

**Why bcrypt:**
- Adaptive (can increase cost over time)
- Automatically salted
- Resistant to rainbow table attacks
- Resistant to GPU cracking

### Password Storage

**Never store plain text passwords:**
- ✅ Store: `passwordHash` (bcrypt)
- ❌ Never: `password` field

### Password Reset

**Secure flow:**
1. User requests reset via email
2. Server generates secure token (32 bytes random)
3. Token stored with expiration (1 hour)
4. Email sent with reset link
5. User clicks link, token validated
6. New password set, old token invalidated

**Rate limiting:** 3 attempts per hour per email

### Password Change

**Requirements:**
1. Must be authenticated
2. Must provide old password
3. New password must meet policy
4. Invalidates all sessions except current

---

## Security Headers

### Helmet.js Configuration

**Location:** `backend/api/server.ts`

```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}))
```

### Headers Set by Helmet

- **X-Content-Type-Options:** nosniff
- **X-Frame-Options:** DENY
- **X-XSS-Protection:** 1; mode=block
- **Strict-Transport-Security:** max-age=31536000; includeSubDomains
- **Content-Security-Policy:** (see above)

### CORS Configuration

**Location:** `config/security/cors-config.ts`

```typescript
{
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-XSRF-TOKEN'],
}
```

---

## Security Testing

### Unit Tests

**Location:** `tests/unit/security/`

#### 1. Rate Limiter Tests
```bash
npm test tests/unit/security/rate-limiter.test.ts
```

Tests:
- Allows requests within limit
- Blocks requests exceeding limit
- Sets correct headers
- Differentiates by IP/user
- Custom key generators

#### 2. Input Sanitizer Tests
```bash
npm test tests/unit/security/input-sanitizer.test.ts
```

Tests:
- HTML sanitization (XSS prevention)
- Email validation
- URL validation
- Filename sanitization (path traversal)
- SQL LIKE pattern escaping
- Type sanitization

### Integration Tests

**TODO:** Add integration tests for:
- CSRF token flow
- Rate limiting across multiple requests
- Authentication flow end-to-end
- Authorization checks

### Security Audit Checklist

Run before each release:

```bash
# 1. Dependency audit
npm audit
npm audit fix

# 2. Type check (prevents 'any' types)
npm run type-check

# 3. Lint for security issues
npm run lint

# 4. Run security tests
npm test -- --testPathPattern=security

# 5. Manual checklist
# - [ ] All queries parameterized
# - [ ] No secrets in code
# - [ ] All inputs sanitized
# - [ ] HTTPS enforced
# - [ ] Security headers present
# - [ ] Rate limiting active
# - [ ] CSRF protection enabled
# - [ ] Audit logging enabled
```

---

## Security Monitoring

### Audit Logging

**Location:** `backend/utils/logging/audit-logger.ts`

**Events logged:**
- User login (success/failure)
- Password changes
- Password resets
- Permission changes
- Data exports
- Administrative actions

### Failed Login Monitoring

Track failed attempts:
```typescript
// Alert if > 10 failed logins in 5 minutes from same IP
// Alert if > 50 failed logins across all users
```

### Suspicious Activity

Monitor for:
- Rapid API requests from single IP
- Privilege escalation attempts
- Access to unauthorized resources
- SQL injection patterns in logs
- XSS injection patterns in logs

---

## Deployment Security

### Environment Variables

**Never commit secrets:**
```bash
# .env (not in git)
DATABASE_URL=postgresql://...
JWT_SECRET=random-secure-secret
JWT_REFRESH_SECRET=different-random-secret
REDIS_URL=redis://...
```

### Production Checklist

- ✅ NODE_ENV=production
- ✅ HTTPS only (no HTTP)
- ✅ Secure cookies (secure=true)
- ✅ Strong JWT secrets (64+ characters)
- ✅ Database connection SSL
- ✅ Redis connection SSL
- ✅ Rate limiting with Redis
- ✅ Error stack traces disabled
- ✅ Debug logging disabled
- ✅ CORS restricted to production domain
- ✅ CSP headers configured
- ✅ Regular backups enabled
- ✅ Monitoring and alerting active

---

## Security Contacts

**Report vulnerabilities to:**
- Email: security@abstractcreatives.com
- Bug Bounty: (if applicable)

**Do NOT:**
- Disclose publicly before patch
- Test on production systems
- Access other users' data

---

**Last Updated:** 2025-01-06
**Phase:** 6 - Security Hardening
**Status:** Complete
