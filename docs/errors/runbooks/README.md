# Error Runbooks - ClientForge CRM

Operational runbooks for handling production errors. Each runbook provides step-by-step guidance for diagnosing and resolving specific error conditions.

## Quick Reference

### Critical Errors (Require Immediate Action)

| Error ID | Name | Impact | MTTR |
|----------|------|--------|------|
| [DB-001](DB-001.md) | PostgresUnavailable | All database operations fail | 1-5 min |
| [DB-003](DB-003.md) | MongoConnectionFailed | Logging and audit trail disabled | 1-5 min |
| [ES-003](ES-003.md) | ElasticsearchUnavailable | Search functionality disabled | 2-10 min |
| [RDS-001](RDS-001.md) | RedisUnavailable | Sessions lost, cache disabled | 1-5 min |
| [BIL-003](BIL-003.md) | StripeWebhookFailed | Payment processing affected | 5-15 min |
| [GEN-002](GEN-002.md) | ServiceUnavailable | System-wide outage | 2-10 min |
| [QUEUE-001](QUEUE-001.md) | WorkerDown | Background jobs stopped | 2-10 min |

### Major Errors (Require Timely Action)

| Error ID | Name | Impact | MTTR |
|----------|------|--------|------|
| [AUTH-001](AUTH-001.md) | InvalidCredentials | User login issues | 1-2 min |
| [DB-002](DB-002.md) | MongoWriteFailed | Logging degraded | 5-10 min |
| [AI-001](AI-001.md) | ProviderRateLimited | AI features throttled | 10-30 min |
| [QUEUE-002](QUEUE-002.md) | JobFailed | Background task failures | 5-15 min |

## Runbook Structure

Each runbook follows this standard format:

### 1. Header
- **Severity**: minor | major | critical
- **HTTP Status**: 4xx or 5xx
- **Retry Strategy**: none | safe | idempotent
- **Notify**: Yes/No (auto-alert on-call)

### 2. Description
Clear explanation of what the error means and when it occurs.

### 3. Impact
Business and technical impact of the error.

### 4. Detection
- **Signals**: Monitoring alerts and metrics
- **Log Pattern**: How to identify in logs
- **Grafana Dashboard**: Relevant dashboard links

### 5. Immediate Actions
First steps to take when error occurs (1-2 minutes).

### 6. Troubleshooting Steps
Detailed diagnostic steps with commands.

### 7. Resolution Steps
Multiple resolution options ranked by speed and risk.

### 8. Prevention
Long-term measures to prevent recurrence.

### 9. Escalation
When and how to escalate to higher tiers.

### 10. Post-Incident
Steps to take after resolution (RCA, documentation).

## Using Runbooks

### When to Use
- Production error occurs (triggered by alert or user report)
- Testing disaster recovery procedures
- Training new team members
- Post-mortem analysis

### How to Use
1. **Identify Error**: Get error ID from logs or monitoring
2. **Open Runbook**: Find corresponding runbook file
3. **Follow Steps**: Execute immediate actions first
4. **Document**: Log all actions taken
5. **Escalate**: If not resolved in expected MTTR
6. **Post-Incident**: Complete RCA and update runbook

### Best Practices
- Always log commands executed
- Take screenshots of dashboards
- Document any deviations from runbook
- Update runbook after incident if new information learned
- Test runbooks in staging environment quarterly

## Runbook Maintenance

### Quarterly Review
- Test all critical runbooks in staging
- Update commands if infrastructure changed
- Add new troubleshooting steps from incidents
- Verify escalation contacts are current

### After Each Incident
- Update relevant runbook with new findings
- Add new resolution options if discovered
- Update MTTR estimates based on actual time
- Document any gaps in monitoring or alerting

### Deprecation
- Mark runbook as deprecated if error no longer occurs
- Keep for historical reference
- Link to replacement runbook if applicable

## Error Categories

### Infrastructure (DB, REDIS, ES, QUEUE)
Database, cache, search, and queue system errors.
- **Common Causes**: Resource exhaustion, network issues, configuration errors
- **MTTR**: 1-10 minutes
- **Escalation**: DevOps → Senior DevOps → CTO

### Authentication (AUTH)
User login, session, and permission errors.
- **Common Causes**: Token expiry, account lockout, SSO issues
- **MTTR**: 1-5 minutes
- **Escalation**: Backend Engineer → Security Engineer → CTO

### External Services (AI, EMAIL, BILLING, STORAGE)
Third-party API and integration errors.
- **Common Causes**: API key issues, rate limits, service outages
- **MTTR**: 5-30 minutes
- **Escalation**: Backend Engineer → Senior Engineer → Vendor Support

### Client-Side (FRONTEND, VALIDATION)
Browser and user input validation errors.
- **Common Causes**: Network issues, bad user input, browser compatibility
- **MTTR**: 1-5 minutes
- **Escalation**: Frontend Engineer → UX Engineer

### Multi-Agent (AGENTS)
MCP and agent orchestration errors.
- **Common Causes**: Agent timeout, communication failure, resource limits
- **MTTR**: 5-15 minutes
- **Escalation**: AI Engineer → Senior Engineer → CTO

## Monitoring and Alerting

### Prometheus Alerts
All critical errors trigger Prometheus alerts sent to:
- **Slack**: `#alerts-production`
- **PagerDuty**: On-call engineer rotation
- **Email**: `oncall@clientforge.com`

### Grafana Dashboards
- **System Health**: [http://localhost:3001/d/system-health](http://localhost:3001/d/system-health)
- **Error Rates**: [http://localhost:3001/d/error-rates](http://localhost:3001/d/error-rates)
- **Service Status**: [http://localhost:3001/d/service-status](http://localhost:3001/d/service-status)

### Log Aggregation
- **MongoDB**: Winston logs in `app_logs` collection
- **Query**: `db.app_logs.find({ "meta.id": "ERROR_ID" })`
- **Retention**: 30 days for app_logs, 90 days for audit_logs

## Emergency Contacts

### On-Call Rotation
- **Primary**: See PagerDuty schedule
- **Secondary**: See PagerDuty schedule
- **Manager**: DevOps Manager (escalation path)

### Vendor Contacts
- **AWS/Render**: support@render.com
- **Stripe**: support@stripe.com (Priority support)
- **Anthropic**: enterprise@anthropic.com
- **OpenAI**: enterprise@openai.com

## References

- [Error Registry YAML](../../../config/errors/error-registry.yaml)
- [Frontend Error Messages](../../../frontend/src/errors/messages.ts)
- [Monitoring Setup](../../monitoring/README.md)
- [Incident Response Plan](../../incident-response/README.md)

---

**Last Updated**: 2025-11-11
**Maintained By**: DevOps Team
**Review Frequency**: Quarterly
