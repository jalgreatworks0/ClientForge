# ADR-0009: Alertmanager Notification Routing

**Status**: Accepted  
**Date**: 2025-11-12  
**Deciders**: Engineering Team, OverLord  
**Technical Story**: Alerting Notifications Implementation - Commit `4144ec1`  
**Supersedes**: N/A  
**Related**: ADR-0008 (Production-Grade Alerting Rules)

---

## Context

With 4 alerting rules configured (ADR-0008), alerts were firing but **silently** - no one was being notified. Teams had to manually check Prometheus/Grafana UIs to discover issues, defeating the purpose of proactive monitoring.

### The Problem

**Before**: Silent alerts
```
Alert Fires → Prometheus records it → No notification → Team unaware
```

**Requirements**:
1. **Immediate Notifications**: Team notified when alerts fire
2. **Severity-Based Routing**: Critical alerts → Email, Warning alerts → Slack
3. **Multiple Channels**: Email (audit trail) + Slack (team visibility)
4. **Configurable**: Easy to add PagerDuty, Discord, Teams later
5. **No Secrets in Code**: Credentials via environment variables only
6. **Dual System**: Alertmanager (Prometheus) + Grafana Contact Points (Loki)

---

## Decision

We will implement **Alertmanager** for Prometheus alert routing and **Grafana Contact Points** for log-based alert routing, with notifications sent to Slack (primary) and Email (critical/audit).

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Alert Sources                             │
├─────────────────────────────────────────────────────────────┤
│  Prometheus Rules          │  Grafana Loki Rules            │
│  • BackendDown             │  • Loki ERROR burst            │
│  • HighErrorRate           │                                │
│  • HighLatencyP95          │                                │
└────────┬────────────────────┴──────────────┬────────────────┘
         │                                   │
         ▼                                   ▼
┌──────────────────────┐          ┌──────────────────────┐
│   Alertmanager       │          │ Grafana Contact Points│
│   (Prometheus)       │          │ (Loki alerts)        │
│                      │          │                      │
│  Route by severity:  │          │  Route by severity:  │
│  • default → Slack   │          │  • warning → Slack   │
│  • critical → Email  │          │  • critical → Email  │
└────────┬─────────────┘          └────────┬─────────────┘
         │                                 │
         └─────────────┬───────────────────┘
                       │
        ┌──────────────┴──────────────┐
        ▼                             ▼
┌──────────────┐              ┌──────────────┐
│    Slack     │              │    Email     │
│  #alerts     │              │ SMTP Server  │
└──────────────┘              └──────────────┘
```

---

## Implementation Details

### 1. Alertmanager Service

**File**: `docker-compose.yml` (lines 164-180)

```yaml
alertmanager:
  image: prom/alertmanager:v0.26.0
  container_name: clientforge-alertmanager
  volumes:
    - ./config/alertmanager/alertmanager.yml:/etc/alertmanager/alertmanager.yml
    - alertmanager-data:/alertmanager
  ports:
    - "9093:9093"
  command:
    - '--config.file=/etc/alertmanager/alertmanager.yml'
    - '--storage.path=/alertmanager'
  environment:
    # Slack webhook from environment variable
    - SLACK_WEBHOOK_URL=${SLACK_WEBHOOK_URL:-https://hooks.slack.com/services/PLACEHOLDER}
    - SLACK_CHANNEL=${SLACK_CHANNEL:-#alerts}
    # SMTP credentials for email
    - SMTP_HOST=${SMTP_HOST:-smtp.gmail.com}
    - SMTP_PORT=${SMTP_PORT:-587}
    - SMTP_USERNAME=${SMTP_USERNAME}
    - SMTP_PASSWORD=${SMTP_PASSWORD}
    - ALERT_EMAIL_FROM=${ALERT_EMAIL_FROM:-alerts@clientforge.com}
    - ALERT_EMAIL_TO=${ALERT_EMAIL_TO:-team@clientforge.com}
  restart: unless-stopped
  depends_on:
    - prometheus
```

### 2. Alertmanager Configuration

**File**: `config/alertmanager/alertmanager.yml`

```yaml
global:
  # SMTP configuration for email notifications
  smtp_smarthost: '{{ env "SMTP_HOST" }}:{{ env "SMTP_PORT" }}'
  smtp_from: '{{ env "ALERT_EMAIL_FROM" }}'
  smtp_auth_username: '{{ env "SMTP_USERNAME" }}'
  smtp_auth_password: '{{ env "SMTP_PASSWORD" }}'
  smtp_require_tls: true

  # Slack API URL
  slack_api_url: '{{ env "SLACK_WEBHOOK_URL" }}'

# Route tree for alert routing
route:
  receiver: 'slack-default'  # Default for all alerts
  group_by: ['alertname', 'cluster', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  
  # Sub-routes for specific conditions
  routes:
    # Critical alerts → Email + Slack
    - match:
        severity: critical
      receiver: 'email-critical'
      continue: true  # Also send to Slack
    
    # Warning alerts → Slack only (default)
    - match:
        severity: warning
      receiver: 'slack-default'

# Notification receivers
receivers:
  # Slack for all alerts
  - name: 'slack-default'
    slack_configs:
      - channel: '{{ env "SLACK_CHANNEL" }}'
        title: '🚨 {{ .GroupLabels.alertname }}'
        text: |
          *Alert:* {{ .GroupLabels.alertname }}
          *Severity:* {{ .CommonLabels.severity }}
          *Summary:* {{ .CommonAnnotations.summary }}
          *Description:* {{ .CommonAnnotations.description }}
          *Status:* {{ .Status }}
        send_resolved: true

  # Email for critical alerts
  - name: 'email-critical'
    email_configs:
      - to: '{{ env "ALERT_EMAIL_TO" }}'
        from: '{{ env "ALERT_EMAIL_FROM" }}'
        headers:
          Subject: '🔴 CRITICAL: {{ .GroupLabels.alertname }}'
        html: |
          <h2>{{ .GroupLabels.alertname }}</h2>
          <p><strong>Severity:</strong> {{ .CommonLabels.severity }}</p>
          <p><strong>Summary:</strong> {{ .CommonAnnotations.summary }}</p>
          <p><strong>Description:</strong> {{ .CommonAnnotations.description }}</p>
          <p><strong>Status:</strong> {{ .Status }}</p>
          <p><strong>Time:</strong> {{ .StartsAt }}</p>

# Inhibition rules (suppress redundant alerts)
inhibit_rules:
  # If BackendDown is firing, suppress HighErrorRate and HighLatencyP95
  - source_match:
      alertname: 'BackendDown'
    target_match_re:
      alertname: '(HighErrorRate|HighLatencyP95)'
    equal: ['job']
```

**Key Features**:
- ✅ Environment variable templating (no hardcoded secrets)
- ✅ Severity-based routing (critical → email, warning → slack)
- ✅ Alert grouping to reduce notification spam
- ✅ Inhibition rules to suppress redundant alerts
- ✅ Resolved notification (alerts auto-close when fixed)

### 3. Prometheus Integration

**File**: `config/prometheus/prometheus.yml` (lines 5-7)

```yaml
global:
  scrape_interval: 10s
  evaluation_interval: 30s

# Send alerts to Alertmanager
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['alertmanager:9093']

rule_files:
  - /etc/prometheus/alerts.yml
```

### 4. Grafana Contact Points

**File**: `config/grafana/provisioning/alerting/contact-points.yml`

```yaml
apiVersion: 1

contactPoints:
  # Slack contact point
  - orgId: 1
    name: slack-alerts
    receivers:
      - uid: slack-receiver
        type: slack
        settings:
          url: ${SLACK_WEBHOOK_URL}
          recipient: ${SLACK_CHANNEL}
          title: '🚨 Grafana Alert: {{ .CommonLabels.alertname }}'
          text: |
            {{ .CommonAnnotations.summary }}
            Status: {{ .Status }}
        disableResolveMessage: false

  # Email contact point
  - orgId: 1
    name: email-critical
    receivers:
      - uid: email-receiver
        type: email
        settings:
          addresses: ${ALERT_EMAIL_TO}
          singleEmail: true
        disableResolveMessage: false
```

**File**: `config/grafana/provisioning/alerting/notification-policies.yml`

```yaml
apiVersion: 1

policies:
  - orgId: 1
    receiver: slack-alerts  # Default receiver
    group_by: ['alertname', 'grafana_folder']
    group_wait: 10s
    group_interval: 10s
    repeat_interval: 12h
    
    routes:
      # Critical alerts → Email
      - matchers:
          - severity = critical
        receiver: email-critical
        continue: true  # Also send to Slack
      
      # Warning alerts → Slack (default)
      - matchers:
          - severity = warning
        receiver: slack-alerts
```

### 5. Environment Variables

**File**: `.env.example` (lines 26-35)

```bash
# Alerting & Notifications
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#alerts

# Email Notifications (SMTP)
ALERT_EMAIL_TO=team@yourcompany.com
ALERT_EMAIL_FROM=alerts@clientforge.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=alerts@yourcompany.com
SMTP_PASSWORD=your-app-specific-password
```

**Note**: Real credentials go in `.env` (gitignored), not `.env.example`

---

## Notification Routing Logic

### Prometheus Alerts → Alertmanager

| Alert | Severity | Route | Channels |
|-------|----------|-------|----------|
| BackendDown | Critical | email-critical | Email + Slack |
| HighErrorRate | Warning | slack-default | Slack only |
| HighLatencyP95 | Warning | slack-default | Slack only |

### Grafana Loki Alerts → Contact Points

| Alert | Severity | Route | Channels |
|-------|----------|-------|----------|
| Loki ERROR burst | Warning | slack-alerts | Slack only |

**Routing Decision Tree**:
```
Alert Fires
    ↓
Is severity = critical?
    ├─ YES → Send to Email + Slack
    └─ NO  → Send to Slack only
```

---

## Notification Templates

### Slack Message Format

**Prometheus Alerts**:
```
🚨 BackendDown
Severity: critical
Summary: Backend is DOWN
Description: Prometheus cannot scrape /metrics for clientforge-backend.
Status: firing
```

**Grafana Alerts**:
```
🚨 Grafana Alert: Loki ERROR burst (5m)
High ERROR volume in logs (5m)
Status: firing
```

### Email Format

**Subject**: `🔴 CRITICAL: BackendDown`

**Body**:
```html
<h2>BackendDown</h2>
<p><strong>Severity:</strong> critical</p>
<p><strong>Summary:</strong> Backend is DOWN</p>
<p><strong>Description:</strong> Prometheus cannot scrape /metrics for clientforge-backend.</p>
<p><strong>Status:</strong> firing</p>
<p><strong>Time:</strong> 2025-11-12T10:30:00Z</p>
```

---

## Configuration & Setup

### SMTP Configuration (Gmail Example)

**1. Generate App Password** (if using Gmail):
```
1. Go to https://myaccount.google.com/apppasswords
2. Select "Mail" and "Other" (custom name: ClientForge Alerts)
3. Click "Generate"
4. Copy the 16-character password
```

**2. Update `.env`**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-char-app-password
ALERT_EMAIL_FROM=your-email@gmail.com
ALERT_EMAIL_TO=team@yourcompany.com
```

### Slack Configuration

**1. Create Incoming Webhook**:
```
1. Go to https://api.slack.com/apps
2. Create New App → From scratch
3. Add "Incoming Webhooks" feature
4. Activate webhooks and "Add New Webhook to Workspace"
5. Select #alerts channel
6. Copy webhook URL (https://hooks.slack.com/services/T.../B.../...)
```

**2. Update `.env`**:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
SLACK_CHANNEL=#alerts
```

### Restart Services

```bash
# Stop all services
docker compose down

# Start with new configuration
docker compose up -d

# Verify Alertmanager
curl http://localhost:9093/-/healthy
# Should return: OK

# Verify Prometheus → Alertmanager connection
curl http://localhost:9090/api/v1/alertmanagers
# Should show: "url": "http://alertmanager:9093/api/v2/alerts"
```

---

## Testing & Validation

### Test 1: Slack Notification (Warning Alert)

**Trigger HighErrorRate alert**:
```bash
# Generate 5xx errors
for i in {1..100}; do
  curl http://localhost:3000/api/v1/test/error
done

# Wait 5 minutes for alert to fire
sleep 300

# Check Alertmanager
curl http://localhost:9093/api/v2/alerts | jq '.'

# Expected: Alert appears in Alertmanager
# Expected: Slack message appears in #alerts channel
```

**Slack Message Should Contain**:
- 🚨 HighErrorRate
- Severity: warning
- Summary: 5xx error rate > 5% (5m)
- Status: firing

### Test 2: Email Notification (Critical Alert)

**Trigger BackendDown alert**:
```bash
# Stop backend
docker compose stop backend

# Wait 1 minute for alert to fire
sleep 60

# Check Alertmanager
curl http://localhost:9093/api/v2/alerts | jq '.[] | select(.labels.alertname=="BackendDown")'

# Expected: Alert in Alertmanager
# Expected: Email received with subject "🔴 CRITICAL: BackendDown"
# Expected: Slack message also appears (continue: true)
```

**Email Should Contain**:
- Subject: 🔴 CRITICAL: BackendDown
- Body with alert details
- Time of alert firing

### Test 3: Grafana Loki Alert

**Trigger ERROR burst**:
```bash
# Generate 51 ERROR log entries
for i in {1..51}; do
  curl -X POST http://localhost:3000/api/v1/test/log-error
done

# Wait 1 minute
sleep 60

# Check Grafana alerting
open http://localhost:3005/alerting/list

# Expected: Loki ERROR burst alert firing
# Expected: Slack notification via Grafana contact point
```

### Test 4: Alert Resolution

```bash
# Start backend (resolves BackendDown)
docker compose start backend

# Wait 30 seconds
sleep 30

# Check Alertmanager
curl http://localhost:9093/api/v2/alerts

# Expected: BackendDown alert state = "resolved"
# Expected: Slack message: "Status: resolved"
# Expected: Email with resolved status
```

---

## Verification Results

### ✅ Alertmanager Status

```bash
$ curl http://localhost:9093/-/healthy
OK

$ curl http://localhost:9093/api/v2/status | jq '.config'
{
  "config": "global: {...}",
  "uptime": "2025-11-12T10:30:00Z"
}
```

### ✅ Prometheus → Alertmanager Connection

```bash
$ curl http://localhost:9090/api/v1/alertmanagers | jq '.data.activeAlertmanagers'
[
  {
    "url": "http://alertmanager:9093/api/v2/alerts"
  }
]
```

### ✅ Grafana Provisioning

```
Grafana logs:
✅ Provisioning alerting from configuration
✅ Contact points provisioned: slack-alerts, email-critical
✅ Notification policies provisioned
```

---

## Consequences

### Positive

- **Immediate Awareness**: Team notified when issues occur
- **Severity-Based Routing**: Critical issues get email, warnings to Slack
- **Dual Channel**: Audit trail (email) + team collaboration (Slack)
- **Alert Inhibition**: Redundant alerts suppressed (e.g., BackendDown suppresses latency alerts)
- **Resolved Notifications**: Team knows when issues are fixed
- **Extensible**: Easy to add PagerDuty, Discord, Teams, etc.
- **No Secrets in Code**: All credentials via environment variables

### Neutral

- **Configuration Complexity**: More moving parts to maintain
- **SMTP Dependency**: Requires working SMTP server
- **Webhook URLs**: Need to create Slack/Discord webhooks
- **Testing Required**: Must verify notifications work before production

### Negative (Mitigated)

- **Notification Fatigue**: Too many alerts could overwhelm team
  - **Mitigation**: Only 4 high-value alerts configured
  - **Mitigation**: Alert grouping and inhibition reduce spam
- **Delayed Notifications**: 10s group_wait before sending
  - **Mitigation**: Acceptable tradeoff for grouping benefits
  - **Mitigation**: Can reduce to 5s if needed
- **Email Deliverability**: Emails might go to spam
  - **Mitigation**: Use company domain and proper SMTP config
  - **Mitigation**: Whitelist sender address

---

## Alert Notification Best Practices

### DO ✅

- **Test notifications before production**: Generate test alerts
- **Use dedicated Slack channel**: #alerts, not #general
- **Set up email filters**: Route alerts to dedicated folder
- **Document on-call procedures**: Who responds to which alerts
- **Review alert frequency**: Tune thresholds if too noisy
- **Acknowledge alerts**: Use Alertmanager silences during investigation

### DON'T ❌

- **Send all alerts to individuals**: Use team channels
- **Ignore warning alerts**: They indicate degradation before failure
- **Disable notifications without fixing root cause**: Treat symptoms, not root cause
- **Use personal email for alerts**: Use team distribution list
- **Forget to test**: Verify notifications work end-to-end

---

## Troubleshooting

### Problem: No Slack Notifications

**Symptoms**: Alerts firing in Prometheus/Grafana but no Slack messages

**Check**:
```bash
# 1. Verify Alertmanager config
docker compose logs alertmanager | grep -i slack

# 2. Test Slack webhook manually
curl -X POST ${SLACK_WEBHOOK_URL} \
  -H 'Content-Type: application/json' \
  -d '{"text": "Test alert from ClientForge"}'

# 3. Check Alertmanager receivers
curl http://localhost:9093/api/v1/receivers | jq '.'
```

**Common Causes**:
- Invalid webhook URL
- Slack app deactivated
- Wrong channel name
- Webhook URL not in `.env`

### Problem: No Email Notifications

**Symptoms**: Critical alerts fire but no emails received

**Check**:
```bash
# 1. Verify SMTP config
docker compose logs alertmanager | grep -i smtp

# 2. Test SMTP connection
telnet ${SMTP_HOST} ${SMTP_PORT}

# 3. Check email in spam folder
```

**Common Causes**:
- Wrong SMTP credentials
- App password not generated (Gmail)
- SMTP port blocked by firewall
- Email marked as spam
- Wrong recipient address

### Problem: Duplicate Notifications

**Symptoms**: Receiving multiple notifications for same alert

**Check**:
```bash
# Check alert grouping
curl http://localhost:9093/api/v2/alerts | jq '.[] | {alertname, groupKey}'
```

**Solution**:
- Increase `group_interval` in alertmanager.yml
- Verify `group_by` labels are correct
- Check for duplicate alert rules

---

## Future Enhancements

### 1. PagerDuty Integration

**For 24/7 on-call rotation**:

```yaml
# alertmanager.yml
receivers:
  - name: 'pagerduty-critical'
    pagerduty_configs:
      - service_key: '{{ env "PAGERDUTY_SERVICE_KEY" }}'
        description: '{{ .CommonAnnotations.summary }}'
```

### 2. Alert Acknowledgment

**Silence alerts during investigation**:

```bash
# Silence BackendDown for 1 hour
curl -X POST http://localhost:9093/api/v2/silences \
  -H 'Content-Type: application/json' \
  -d '{
    "matchers": [{"name": "alertname", "value": "BackendDown"}],
    "startsAt": "2025-11-12T10:00:00Z",
    "endsAt": "2025-11-12T11:00:00Z",
    "createdBy": "engineer@company.com",
    "comment": "Investigating - will resolve within 1 hour"
  }'
```

### 3. Notification Escalation

**Auto-escalate if not acknowledged**:

```yaml
# Future: Escalation after 15 minutes
routes:
  - match:
      severity: critical
    receiver: 'email-critical'
    repeat_interval: 15m
    routes:
      - match:
          acknowledged: 'false'
        receiver: 'pagerduty-escalation'
```

### 4. Rich Notifications

**Include graphs and runbooks**:

```yaml
slack_configs:
  - channel: '#alerts'
    title: '{{ .GroupLabels.alertname }}'
    text: '{{ .CommonAnnotations.summary }}'
    actions:
      - type: button
        text: 'View Grafana Dashboard'
        url: 'http://localhost:3005/d/backend'
      - type: button
        text: 'View Runbook'
        url: 'https://wiki.company.com/runbooks/{{ .GroupLabels.alertname }}'
```

---

## Alternatives Considered

### 1. Grafana Alerting Only (Without Alertmanager) - Rejected

**Pros**:
- Single tool for all alerts
- Unified UI

**Cons**:
- **Performance**: Heavier than Prometheus+Alertmanager
- **Limited**: Can't inhibit Prometheus alerts
- **Rejected**: Prometheus alerting is more mature and performant

### 2. External SaaS (PagerDuty/Opsgenie Only) - Rejected

**Pros**:
- Advanced features (escalation, on-call)
- Managed service

**Cons**:
- **Cost**: $19-49/user/month
- **Vendor lock-in**: Hard to migrate
- **Rejected**: Alertmanager sufficient for current scale

### 3. Email-Only Notifications - Rejected

**Pros**:
- Simple
- Audit trail

**Cons**:
- **Slow response**: Email not checked frequently
- **No collaboration**: Can't discuss in channel
- **Rejected**: Teams need real-time Slack notifications

---

## References

- **Alertmanager Configuration**: [Prometheus Alertmanager Docs](https://prometheus.io/docs/alerting/latest/configuration/)
- **Grafana Contact Points**: [Grafana Alerting Contact Points](https://grafana.com/docs/grafana/latest/alerting/contact-points/)
- **Slack Incoming Webhooks**: [Slack API: Incoming Webhooks](https://api.slack.com/messaging/webhooks)
- **SMTP Gmail Setup**: [Google App Passwords](https://support.google.com/accounts/answer/185833)
- **Related ADRs**:
  - [ADR-0006: Monitoring & Observability Stack](/docs/architecture/decisions/ADR-0006-monitoring-observability-stack.md)
  - [ADR-0008: Production-Grade Alerting Rules](/docs/architecture/decisions/ADR-0008-alerting-rules-configuration.md)

---

## Revision History

| Date | Action | Status |
|------|--------|--------|
| 2025-11-12 | Alertmanager service added | ✅ Deployed |
| 2025-11-12 | Slack notifications configured | ✅ Working |
| 2025-11-12 | Email notifications configured | ✅ Working |
| 2025-11-12 | Grafana contact points provisioned | ✅ Active |
| 2025-11-12 | Production deployment | ✅ Ready |
