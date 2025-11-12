# Security Policy (OWASP Top 10)

## 1. Injection (SQL, NoSQL, Command)
**Prevention:**
- Parameterized queries (PostgreSQL)
- Sanitize inputs (Zod validation)
- No eval(), no shell commands from user input

## 2. Broken Authentication
**Prevention:**
- JWT with short expiry (15min access, 7d refresh)
- Password: bcrypt (cost factor 12)
- Rate limiting (5 failed login attempts = 15min lockout)

## 3. Sensitive Data Exposure
**Prevention:**
- HTTPS only in production
- Secrets in .env (never committed)
- No PII in logs

## 4. XML External Entities (XXE)
**Prevention:**
- No XML parsing (use JSON)
- If needed: disable external entities

## 5. Broken Access Control
**Prevention:**
- Role-based access (RBAC)
- Check permissions on every endpoint
- No direct object references (use UUIDs)

## 6. Security Misconfiguration
**Prevention:**
- CORS: whitelist only
- CSP headers enabled
- Security headers (Helmet.js)

## 7. Cross-Site Scripting (XSS)
**Prevention:**
- Sanitize outputs (DOMPurify frontend)
- CSP: no inline scripts
- React: auto-escapes by default

## 8. Insecure Deserialization
**Prevention:**
- No eval() on JSON
- Validate schema before deserialization

## 9. Using Components with Known Vulnerabilities
**Prevention:**
- \
pm audit\ in CI/CD
- Dependabot alerts
- Update deps quarterly

## 10. Insufficient Logging & Monitoring
**Prevention:**
- Structured logs with correlation IDs
- Error tracking (Sentry)
- Audit logs for sensitive actions
