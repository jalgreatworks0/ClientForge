# ClientForge-CRM Security Documentation

**Last Updated**: 2025-11-12  
**Version**: 2.0  
**Classification**: Internal

---

## Overview

ClientForge-CRM implements enterprise-grade security controls across authentication, authorization, data isolation, and secrets management. This document covers security architecture, policies, and operational procedures.

---

## Table of Contents

1. [Multi-Tenant Security](#multi-tenant-security)
2. [Authentication & Authorization](#authentication--authorization)
3. [Environment & Secrets Management](#environment--secrets-management)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Incident Response](#incident-response)

---

## Multi-Tenant Security

### Tenant Isolation Strategy

**Goal**: Complete data isolation between tenants with zero cross-tenant data leaks.

**Implementation**:
1. **Tenant Guard Middleware**: Validates tenant context on every request
2. **Database Scoping**: All queries automatically filtered by `tenantId`
3. **JWT Token Binding**: Authentication tokens tied to specific tenant
4. **Row-Level Security**: Database indexes enforce tenant boundaries

**Architecture**:
```
Request → authenticateToken → tenantGuard → Route Handler
           ↓                    ↓              ↓
         Verify JWT          Extract        Query with
         Set req.user        tenantId       tenantId filter
```

### Tenant Guard Validation

**File**: `backend/middleware/tenant-guard.ts`

**Rules**:
- ✅ Accepts `x-tenant-id` header (priority 1)
- ✅ Accepts `req.user.tenantId` from JWT (priority 2)
- ❌ Rejects requests with missing tenant context (400 TENANT_REQUIRED)
- ❌ Rejects "default" or sentinel values (400 TENANT_REQUIRED)

**Testing**:
- 7/7 tenant guard tests passing
- Cross-tenant access manually verified as blocked
- Database queries validated for tenant scoping

**See**: [ADR-0001: Multi-Tenant Authentication Strategy](/docs/architecture/decisions/ADR-0001-auth-multi-tenant.md)

---

## Authentication & Authorization

### JWT Authentication

**Token Structure**:
```json
{
  "sub": "user-uuid",           // User ID
  "email": "user@example.com",
  "tenantId": "tenant-uuid",    // Tenant isolation
  "role": "admin",              // User role
  "permissions": ["users:read", "users:write"],
  "iat": 1699999999,            // Issued at
  "exp": 1700086399             // Expires (24 hours)
}
```

**Security Controls**:
- ✅ Tokens signed with 256-bit `JWT_SECRET`
- ✅ 24-hour expiration (configurable)
- ✅ httpOnly cookies (prevents XSS)
- ✅ Token tampering detection
- ✅ Refresh token rotation

### Authorization Levels

| Role | Permissions | Scope |
|------|-------------|-------|
| **Tenant Admin** | Full CRUD | All resources in tenant |
| **Manager** | Team management | Assigned teams |
| **User** | Own data + shared | Individual scope |
| **Guest** | Read-only | Public resources |

### Password Security

**Requirements**:
- Minimum 12 characters
- At least 1 uppercase, 1 lowercase, 1 number, 1 special character
- Not in common password dictionary (10k+ entries)
- Maximum 128 characters (bcrypt limit)

**Storage**:
- bcrypt hashing with salt rounds = 12
- Never stored in plaintext
- Never logged or transmitted unencrypted

### Session Management

**Configuration**:
- Session cookie: httpOnly, secure (HTTPS only), sameSite=strict
- Session timeout: 24 hours idle, 7 days absolute
- Session storage: Redis (encrypted)

**See**: [ADR-0003: AuthRequest Interface Alignment](/docs/architecture/decisions/ADR-0003-authrequest-interface-alignment.md)

---

## Environment & Secrets Management

### Environment Validation

**Purpose**: Prevent production deployments with missing configuration.

**Implementation**: `backend/config/env-validator.ts`

**Required Variables** (7 critical):
1. `DATABASE_URL` - Database connection string
2. `REDIS_URL` - Cache connection
3. `JWT_SECRET` - JWT signing key (256-bit)
4. `SESSION_SECRET` - Express session secret
5. `ENCRYPTION_KEY` - AES-256 encryption key (exactly 32 chars)
6. `OPENAI_API_KEY` - OpenAI API access
7. `ANTHROPIC_API_KEY` - Anthropic Claude API access

**Validation Behavior**:
- **Development**: Logs warning, continues startup
- **Production**: Throws error, exits with code 1

**Startup Flow**:
```
1. Load .env file (dotenv.config())
2. Validate environment (initEnvValidation())
   ├─ All present? → Continue
   └─ Missing vars? → DEV: Warn | PROD: Exit
3. Initialize services
4. Start server
```

### Secrets Manager

**File**: `backend/config/secrets-manager.ts`

**Current**: Environment variable provider (EnvSecretsManager)
```typescript
interface ISecretsManager {
  getSecret(key: string): Promise<string | null>;
  setSecret(key: string, value: string): Promise<void>;
}
```

**Future Providers** (abstraction ready):
- AWS Secrets Manager
- HashiCorp Vault
- Azure Key Vault

### Secret Rotation

**Current Process** (Manual):
1. Generate new secret value
2. Update `.env` file or hosting platform environment
3. Restart server

**Recommended Rotation Schedule**:
- JWT_SECRET: Every 90 days
- SESSION_SECRET: Every 90 days
- ENCRYPTION_KEY: Yearly (requires re-encryption of data)
- API Keys: Per provider policy

**Future** (Automated):
- Secrets Manager integration with auto-rotation
- Zero-downtime rotation with dual-key support
- Audit logging for all secret access

### Secret Storage Best Practices

**Development**:
- ✅ Use `.env` file (never commit to Git)
- ✅ Copy `.env.example` and fill in real values
- ❌ Never hardcode secrets in code
- ❌ Never share secrets via Slack/email

**Production**:
- ✅ Set environment variables in hosting platform (Render.com)
- ✅ Use strong, randomly generated values
- ✅ Rotate secrets regularly
- ❌ Never use `.env.example` placeholder values

**See**: [ADR-0004: Environment Validator and Secrets Manager](/docs/architecture/decisions/ADR-0004-environment-validator-secrets-manager.md)

---

## Data Protection

### Encryption at Rest

**Database**:
- ✅ SQLite database file encrypted (planned: SQLCipher)
- ✅ Backups encrypted with AES-256
- ✅ Encryption keys stored separately from data

**Sensitive Fields**:
- SSN/TIN: AES-256-GCM encryption
- Credit card numbers: PCI-DSS compliant vault (planned: Stripe)
- API keys: Encrypted before storage

### Encryption in Transit

**All Communications**:
- ✅ HTTPS/TLS 1.3 for all API traffic
- ✅ Strict Transport Security (HSTS) header
- ✅ Certificate pinning (production)
- ❌ No plaintext HTTP in production

### Data Backup

**Schedule**: 
- Full backup: Daily at 2 AM UTC
- Incremental: Every 4 hours
- Retention: 30 days

**Backup Security**:
- Encrypted with AES-256 before storage
- Stored in separate region from primary database
- Access restricted to operations team only

---

## API Security

### Rate Limiting

**Global Limits**:
- Unauthenticated: 100 requests/hour per IP
- Authenticated: 1000 requests/hour per user
- Admin: 5000 requests/hour

**Endpoint-Specific**:
- `/api/v1/auth/login`: 5 attempts/15 minutes per IP
- `/api/v1/auth/register`: 3 attempts/hour per IP
- `/api/v1/webhooks/*`: 1000 requests/hour per tenant

### Input Validation

**All Requests**:
- ✅ Joi schema validation on request body
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS prevention (input sanitization)
- ✅ CSRF protection (token validation)

**File Uploads**:
- Maximum size: 10 MB
- Allowed types: PDF, PNG, JPG, DOCX only
- Virus scanning with ClamAV (planned)

### CORS Policy

**Allowed Origins**:
- Development: `http://localhost:3001`
- Production: `https://app.clientforge.com`

**Allowed Methods**: GET, POST, PUT, PATCH, DELETE
**Allowed Headers**: Authorization, Content-Type, x-tenant-id
**Credentials**: Allowed (for cookies)

---

## Incident Response

### Security Incident Procedures

**1. Detection**
- Automated alerts for suspicious activity
- Log monitoring (failed auth attempts, unusual queries)
- Error tracking (Sentry)

**2. Containment**
- Revoke compromised tokens immediately
- Block suspicious IP addresses
- Isolate affected tenant(s)

**3. Investigation**
- Review audit logs
- Identify attack vector
- Assess data exposure

**4. Recovery**
- Rotate all secrets
- Patch vulnerabilities
- Restore from clean backup if needed

**5. Post-Incident**
- Document incident in security log
- Update security controls
- Notify affected parties (if required by law)

### Reporting a Security Issue

**Email**: security@abstractcreatives.com  
**PGP Key**: [Available on request]  
**Response Time**: Within 24 hours

**Please Include**:
- Description of vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if available)

---

## Compliance

### Standards

- **OWASP Top 10**: Mitigations implemented for all 10 risks
- **GDPR**: Data protection and right to erasure
- **SOC 2 Type II**: In progress (target: Q2 2026)

### Audit Log

**Logged Events**:
- User authentication (login/logout)
- Authorization failures
- Data modifications (CREATE, UPDATE, DELETE)
- Secret access
- Admin actions

**Log Retention**: 1 year

**Log Format**:
```json
{
  "timestamp": "2025-11-12T10:30:00Z",
  "event": "USER_LOGIN",
  "userId": "user-uuid",
  "tenantId": "tenant-uuid",
  "ip": "203.0.113.42",
  "userAgent": "Mozilla/5.0...",
  "status": "SUCCESS"
}
```

---

## Security Testing

### Automated Security Scanning

**Tools**:
- `npm audit` - Dependency vulnerability scanning (daily)
- ESLint security plugin - Static code analysis
- OWASP ZAP - Dynamic application security testing (weekly)

### Penetration Testing

**Schedule**: Quarterly by external security firm

**Scope**:
- API endpoint fuzzing
- Authentication bypass attempts
- SQL injection testing
- XSS vulnerability scanning
- CSRF token validation

**Last Test**: TBD (first scheduled for Q1 2026)

---

## Developer Security Guidelines

### Secure Coding Practices

**DO**:
- ✅ Use parameterized queries (never string concatenation)
- ✅ Validate all user input with Joi schemas
- ✅ Sanitize output to prevent XSS
- ✅ Use `req.user.tenantId` for all database queries
- ✅ Check authorization before sensitive operations

**DON'T**:
- ❌ Log sensitive data (passwords, tokens, credit cards)
- ❌ Commit `.env` files to Git
- ❌ Hardcode secrets in code
- ❌ Trust user input without validation
- ❌ Return detailed error messages to clients

### Code Review Checklist

Before merging security-related code:
- [ ] Input validation present
- [ ] SQL injection protected (parameterized queries)
- [ ] XSS protected (sanitized output)
- [ ] Authorization checked
- [ ] Tenant isolation enforced
- [ ] Secrets not hardcoded
- [ ] Error messages don't leak sensitive info

---

## References

- [ADR-0001: Multi-Tenant Authentication](/docs/architecture/decisions/ADR-0001-auth-multi-tenant.md)
- [ADR-0003: AuthRequest Interface](/docs/architecture/decisions/ADR-0003-authrequest-interface-alignment.md)
- [ADR-0004: Environment Validator](/docs/architecture/decisions/ADR-0004-environment-validator-secrets-manager.md)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

---

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-12 | Initial security documentation | Engineering Team |
| 2025-11-12 | Added environment validation section | Engineering Team |
| 2025-11-12 | Added multi-tenant security details | Engineering Team |
