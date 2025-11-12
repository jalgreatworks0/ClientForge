# AUTH-001: InvalidCredentials

**Severity**: Minor
**HTTP Status**: 401
**Retry Strategy**: None
**Notify**: No (alerts on spike only)

## Description

User authentication failed due to invalid email or password combination.

## Impact

- Individual user cannot log in
- Does not affect other users
- Rate limiting applies after 5 failed attempts

## Detection

### Signals
- Spike in 401 responses (> 100/minute)
- Failed login events exceed threshold
- Individual account lockout triggered

### Log Pattern
```
logger.error("[ERROR]", {
  id: "AUTH-001",
  name: "InvalidCredentials",
  severity: "minor",
  status: 401,
  message: "Invalid email or password",
  cause: "[redacted]"
})
```

### Monitoring
- **Grafana Dashboard**: Auth Metrics
- **Metric**: `auth_failures_total`
- **Alert Threshold**: > 1000 failures in 5 minutes (possible attack)

## Common Causes

1. **User Error**: Typo in email or password
2. **Password Changed**: User forgot they changed password
3. **Account Lockout**: Too many failed attempts
4. **Caps Lock**: User has caps lock enabled
5. **Brute Force Attack**: Multiple failed attempts from single IP

## Immediate Actions

### For Single User Report
```bash
# 1. Check if account exists
psql -d clientforge_dev -c "SELECT id, email, is_locked FROM users WHERE email = 'user@example.com';"

# 2. Check failed login attempts
psql -d clientforge_dev -c "SELECT COUNT(*) FROM login_attempts WHERE email = 'user@example.com' AND success = false AND created_at > NOW() - INTERVAL '15 minutes';"

# 3. Check if account is locked
psql -d clientforge_dev -c "SELECT is_locked, locked_until FROM users WHERE email = 'user@example.com';"
```

### For Attack Pattern
```bash
# Check for brute force from single IP
psql -d clientforge_dev -c "SELECT ip_address, COUNT(*) as attempts FROM login_attempts WHERE success = false AND created_at > NOW() - INTERVAL '5 minutes' GROUP BY ip_address HAVING COUNT(*) > 50;"

# Block IP if confirmed attack
# Add to rate limiter deny list
redis-cli SADD "rate_limit:blocked_ips" "1.2.3.4"
```

## Troubleshooting Steps

### Step 1: Verify User Account Status
```bash
# Get user details
psql -d clientforge_dev -c "
  SELECT
    id,
    email,
    is_active,
    is_locked,
    locked_until,
    failed_login_attempts,
    last_login_at
  FROM users
  WHERE email = 'user@example.com';
"
```

### Step 2: Check Recent Login Attempts
```bash
# Last 10 login attempts for user
psql -d clientforge_dev -c "
  SELECT
    ip_address,
    user_agent,
    success,
    created_at
  FROM login_attempts
  WHERE email = 'user@example.com'
  ORDER BY created_at DESC
  LIMIT 10;
"
```

### Step 3: Review Audit Logs
```bash
# Check MongoDB audit logs
mongo clientforge_dev --eval "
  db.audit_logs.find({
    'meta.email': 'user@example.com',
    'meta.action': 'login',
    'timestamp': { \$gte: new Date(Date.now() - 24*60*60*1000) }
  }).sort({ timestamp: -1 }).limit(10).pretty()
"
```

## Resolution Steps

### Option 1: Unlock Account
If account is locked due to failed attempts:
```bash
psql -d clientforge_dev -c "
  UPDATE users
  SET
    is_locked = false,
    locked_until = NULL,
    failed_login_attempts = 0
  WHERE email = 'user@example.com';
"
```
**Expected Time**: < 1 minute

### Option 2: Reset Password
If user forgot password:
```bash
# Trigger password reset email
curl -X POST http://localhost:3000/api/v1/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com"}'
```
**Expected Time**: 1-2 minutes (user action required)

### Option 3: Verify SSO Configuration
If SSO login fails:
```bash
# Check SSO provider status
curl http://localhost:3000/api/v1/auth/sso/providers

# Verify OAuth tokens in database
psql -d clientforge_dev -c "
  SELECT
    provider,
    token_expires_at
  FROM oauth_tokens
  WHERE user_id = (SELECT id FROM users WHERE email = 'user@example.com');
"
```
**Expected Time**: 2-5 minutes

### Option 4: Block Attacking IP
If brute force attack detected:
```bash
# Add IP to Redis blocked list
redis-cli SADD "rate_limit:blocked_ips" "1.2.3.4"

# Verify blocking works
redis-cli SISMEMBER "rate_limit:blocked_ips" "1.2.3.4"

# Should return: (integer) 1
```
**Expected Time**: < 1 minute

## Prevention

1. **Rate Limiting**: 5 attempts per 15 minutes per IP
2. **Account Lockout**: Automatic after 5 failed attempts
3. **CAPTCHA**: Show after 3 failed attempts
4. **Password Requirements**: Min 12 characters, complexity rules
5. **MFA**: Encourage users to enable 2FA
6. **Security Headers**: Helmet.js configuration
7. **Monitoring**: Alert on unusual login patterns

## User Communication

### Email Template (Account Locked)
```
Subject: Account Security Alert - Account Temporarily Locked

Hi [User Name],

Your ClientForge account has been temporarily locked due to multiple failed login attempts.

For security reasons, you'll be able to try logging in again in 30 minutes, or you can reset your password immediately:

[Reset Password Button]

If you didn't attempt to log in, please contact our support team immediately.

Thanks,
ClientForge Security Team
```

### In-App Message
```
Your account has been locked due to multiple failed login attempts.
Please wait 30 minutes or reset your password to regain access.
```

## Related Errors

- **AUTH-002**: MFARequired
- **AUTH-003**: TokenExpired
- **AUTH-004**: SessionInvalid
- **AUTH-005**: PermissionDenied
- **RL-001**: RateLimitExceeded

## Escalation

### Level 1 (0-5 minutes)
- Support engineer handles user request
- Unlock account if legitimate user
- Guide user through password reset

### Level 2 (5-15 minutes)
- Backend engineer investigates patterns
- Check for coordinated attacks
- Review rate limiting effectiveness

### Level 3 (15+ minutes)
- Security engineer paged
- Implement additional protections
- Consider IP blocking at firewall level

## Post-Incident

### For Single User Issue
1. Document resolution in support ticket
2. No further action required

### For Attack Pattern
1. **Analysis**: Review attacker IPs, user agents, patterns
2. **Report**: Document in security incident log
3. **Prevention**: Update rate limiting rules if needed
4. **Monitoring**: Add new detection rules

## Security Best Practices

1. **Never Log Passwords**: Always redact in logs
2. **Hash with bcrypt**: Cost factor = 12
3. **Secure Session Storage**: Use Redis with encryption
4. **Token Expiry**: Access tokens: 15 min, Refresh: 7 days
5. **Audit Trail**: Log all authentication events

## References

- [Authentication Architecture](../../architecture/auth.md)
- [Rate Limiting Configuration](../../security/rate-limiting.md)
- [Security Protocols](../../security/README.md)
- [OWASP Auth Cheatsheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)

---

**Last Updated**: 2025-11-11
**Runbook Version**: 1.0
**Owner**: Security Team
