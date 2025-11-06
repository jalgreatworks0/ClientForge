# 🔒 Security Protocol - OWASP Top 10

**P1 ESSENTIAL**: Security-first development for all code changes

---

## Core Principle

**Every line of code is a potential vulnerability.** Apply security best practices to prevent OWASP Top 10 vulnerabilities.

---

## OWASP Top 10 (2021) Prevention Checklist

### 1. Broken Access Control

**Threat**: Users accessing unauthorized resources or performing unauthorized actions.

**Prevention**:
```typescript
// ✅ ALWAYS check authorization
import { authenticate, authorize } from '../middleware/auth'

router.get('/contacts/:id',
  authenticate,
  authorize(['admin', 'user']),
  contactController.getById
)

// ❌ NEVER skip auth checks
router.get('/contacts/:id', contactController.getById) // DANGEROUS!
```

**Checklist**:
- [ ] All API routes have `authenticate` middleware
- [ ] Role-based access control (RBAC) applied with `authorize`
- [ ] Tenant isolation enforced (multi-tenant apps)
- [ ] Resource ownership verified (user can only access their own data)

---

### 2. Cryptographic Failures

**Threat**: Sensitive data exposed due to weak encryption or plaintext storage.

**Prevention**:
```typescript
// ✅ ALWAYS hash passwords with bcrypt (cost=12)
import bcrypt from 'bcrypt'
const hashedPassword = await bcrypt.hash(password, 12)

// ✅ ALWAYS encrypt sensitive data
import crypto from 'crypto'
const encryptionKey = process.env.ENCRYPTION_KEY // 32-byte key
const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)

// ❌ NEVER store plaintext passwords
await db.query('INSERT INTO users (password) VALUES ($1)', [password])
```

**Checklist**:
- [ ] Passwords hashed with bcrypt (cost ≥ 12)
- [ ] API keys/secrets in environment variables (never hardcoded)
- [ ] Sensitive data encrypted at rest (AES-256)
- [ ] HTTPS enforced in production
- [ ] TLS 1.2+ for all external connections

---

### 3. Injection (SQL, NoSQL, Command)

**Threat**: Attacker injects malicious code via user input.

**Prevention**:
```typescript
// ✅ ALWAYS use parameterized queries
await db.query('SELECT * FROM users WHERE email = $1', [email])

// ✅ ALWAYS validate/sanitize input
import { z } from 'zod'
const schema = z.object({
  email: z.string().email(),
  name: z.string().max(100)
})
const validated = schema.parse(req.body)

// ❌ NEVER concatenate user input into queries
await db.query(`SELECT * FROM users WHERE email = '${email}'`) // SQL INJECTION!

// ❌ NEVER execute user input as shell commands
exec(`ls ${userInput}`) // COMMAND INJECTION!
```

**Checklist**:
- [ ] All database queries use parameterized statements
- [ ] Zod validation on all user input
- [ ] No `eval()`, `exec()`, or `Function()` with user input
- [ ] MongoDB queries use operators, not string concatenation

---

### 4. Insecure Design

**Threat**: Application designed without security in mind.

**Prevention Patterns**:
- **Principle of Least Privilege**: Users/services only have minimum required permissions
- **Defense in Depth**: Multiple layers of security (auth, validation, encryption)
- **Fail Securely**: Errors don't expose sensitive information

```typescript
// ✅ Secure error handling
try {
  const user = await userService.getById(id)
  if (!user) {
    throw new NotFoundError('User not found')
  }
} catch (error) {
  logger.error('Error fetching user', { userId: id, error })
  // Don't expose internal details to client
  throw new AppError('Unable to fetch user', 500)
}

// ❌ Insecure error handling
try {
  const user = await userService.getById(id)
} catch (error) {
  res.json({ error: error.message, stack: error.stack }) // EXPOSES INTERNALS!
}
```

**Checklist**:
- [ ] Security considered in design phase (not bolted on later)
- [ ] Threat modeling performed for critical features
- [ ] Rate limiting on all public endpoints
- [ ] Session management with secure cookies (httpOnly, secure, sameSite)

---

### 5. Security Misconfiguration

**Threat**: Default configs, unnecessary features, verbose errors expose vulnerabilities.

**Prevention**:
```typescript
// ✅ Production-safe configuration
if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1)
  // Disable stack traces in responses
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: 'Internal server error' })
  })
}

// ✅ Security headers
import helmet from 'helmet'
app.use(helmet())

// ❌ Exposing debug info in production
app.get('/debug', (req, res) => res.json(process.env)) // LEAKS SECRETS!
```

**Checklist**:
- [ ] No default credentials (admin/admin)
- [ ] Helmet.js for security headers
- [ ] CORS properly configured (not `*` in production)
- [ ] Error messages don't expose stack traces/internals
- [ ] Unused dependencies removed
- [ ] `.env` file in `.gitignore`

---

### 6. Vulnerable and Outdated Components

**Threat**: Using libraries with known vulnerabilities.

**Prevention**:
```bash
# ✅ ALWAYS audit dependencies
npm audit
npm audit fix

# ✅ Keep dependencies updated
npm outdated
npm update

# ✅ Use Snyk or Dependabot for automated checks
```

**Checklist**:
- [ ] `npm audit` run before every deployment
- [ ] No HIGH/CRITICAL vulnerabilities in production
- [ ] Automated dependency updates (Dependabot/Renovate)
- [ ] Dependencies pinned in `package-lock.json`

---

### 7. Identification and Authentication Failures

**Threat**: Weak authentication allows unauthorized access.

**Prevention**:
```typescript
// ✅ Strong JWT configuration
const token = jwt.sign(
  { userId: user.id, tenantId: user.tenantId },
  process.env.JWT_SECRET, // 256-bit secret
  {
    expiresIn: '7d',
    algorithm: 'HS256',
    jti: uuidv4() // Unique token ID for revocation
  }
)

// ✅ Password requirements
const passwordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Must contain uppercase letter')
  .regex(/[a-z]/, 'Must contain lowercase letter')
  .regex(/[0-9]/, 'Must contain number')
  .regex(/[^A-Za-z0-9]/, 'Must contain special character')
```

**Checklist**:
- [ ] JWT secret is 256+ bits (strong random string)
- [ ] Tokens expire (7 days max for access tokens)
- [ ] Password complexity enforced (min 8 chars, mixed case, numbers, symbols)
- [ ] Account lockout after failed login attempts
- [ ] Multi-factor authentication for admin accounts
- [ ] Session invalidation on logout

---

### 8. Software and Data Integrity Failures

**Threat**: Code/data modified without verification.

**Prevention**:
```typescript
// ✅ Verify data integrity with signatures
import crypto from 'crypto'

function verifyWebhook(payload: string, signature: string): boolean {
  const hmac = crypto.createHmac('sha256', process.env.WEBHOOK_SECRET)
  const digest = hmac.update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
}

// ✅ Use integrity checks for CDN resources
<script src="https://cdn.example.com/lib.js"
        integrity="sha384-..."
        crossorigin="anonymous"></script>
```

**Checklist**:
- [ ] CI/CD pipeline secured (no secrets in code)
- [ ] Code signing for releases
- [ ] Webhook signatures verified
- [ ] Subresource Integrity (SRI) for CDN assets
- [ ] Database backups encrypted and verified

---

### 9. Security Logging and Monitoring Failures

**Threat**: Breaches go undetected due to insufficient logging.

**Prevention**:
```typescript
// ✅ Audit logging for security events
import { auditLogger } from '../utils/logging/audit-logger'

// Log authentication events
auditLogger.info('User login successful', {
  userId: user.id,
  email: user.email,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  timestamp: new Date()
})

// Log authorization failures
auditLogger.warn('Unauthorized access attempt', {
  userId: req.user?.userId,
  resource: req.path,
  method: req.method,
  ip: req.ip
})
```

**Checklist**:
- [ ] All authentication events logged (login, logout, failures)
- [ ] All authorization failures logged
- [ ] All data modifications logged (who, what, when)
- [ ] Logs include context (user ID, IP, timestamp)
- [ ] Logs centralized (CloudWatch, Datadog, etc.)
- [ ] Alerts for suspicious patterns (rate limiting triggers, brute force)

---

### 10. Server-Side Request Forgery (SSRF)

**Threat**: Attacker tricks server into making requests to internal resources.

**Prevention**:
```typescript
// ✅ Validate URLs before fetching
import { URL } from 'url'

function isSafeURL(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    // Block private IP ranges
    const blocklist = ['127.0.0.1', 'localhost', '169.254', '10.', '172.16', '192.168']
    return !blocklist.some(blocked => url.hostname.includes(blocked))
  } catch {
    return false
  }
}

// ✅ Whitelist allowed domains
const ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com']
if (!ALLOWED_DOMAINS.includes(url.hostname)) {
  throw new Error('Domain not allowed')
}

// ❌ Fetching user-provided URLs without validation
const response = await fetch(req.body.url) // SSRF VULNERABILITY!
```

**Checklist**:
- [ ] User-provided URLs validated before fetching
- [ ] Internal IPs/domains blocked (localhost, 127.0.0.1, 10.x.x.x, etc.)
- [ ] Whitelist allowed external domains
- [ ] Network segmentation (app servers can't access admin interfaces)

---

## Security Code Review Checklist

Before merging ANY code, verify:

- [ ] **Authentication**: All routes protected with `authenticate` middleware?
- [ ] **Authorization**: Proper role/permission checks with `authorize`?
- [ ] **Input Validation**: Zod schemas validate all user input?
- [ ] **SQL Injection**: All queries use parameterized statements ($1, $2, etc.)?
- [ ] **XSS Prevention**: User input escaped in templates/responses?
- [ ] **Secrets Management**: No hardcoded API keys/passwords?
- [ ] **Error Handling**: No stack traces/internal details exposed to clients?
- [ ] **Logging**: Security events (auth, authz failures) logged?
- [ ] **Rate Limiting**: Public endpoints have rate limits?

---

## Security Testing Patterns

```typescript
// Security test example
describe('Contact API Security', () => {
  it('should reject unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/contacts')
    expect(res.status).toBe(401)
  })

  it('should reject unauthorized access to other tenant data', async () => {
    const token = generateToken({ userId: 'user1', tenantId: 'tenant1' })
    const res = await request(app)
      .get('/api/v1/contacts/contact-from-tenant2')
      .set('Authorization', `Bearer ${token}`)
    expect(res.status).toBe(403)
  })

  it('should prevent SQL injection in search', async () => {
    const maliciousInput = "'; DROP TABLE users; --"
    const res = await request(app)
      .get(`/api/v1/contacts/search?q=${maliciousInput}`)
      .set('Authorization', `Bearer ${validToken}`)
    expect(res.status).toBe(200) // Query should be safe
    // Verify users table still exists
    const users = await db.query('SELECT COUNT(*) FROM users')
    expect(users.rows[0].count).toBeGreaterThan(0)
  })
})
```

---

## Reference Links

- [OWASP Top 10 (2021)](https://owasp.org/Top10/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

## Quick Security Commands

```bash
# Audit dependencies for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Check for outdated packages
npm outdated

# Scan with Snyk (install globally first)
snyk test
```

---

**Remember**: Security is not optional. It's a requirement for EVERY code change.
