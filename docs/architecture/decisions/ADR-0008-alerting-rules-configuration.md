# ADR-0008: Production-Grade Alerting Rules Configuration

**Status**: Accepted  
**Date**: 2025-11-12  
**Deciders**: Engineering Team, OverLord  
**Technical Story**: Production-Grade Alerts - Commit `76e483e`

---

## Context

With the monitoring stack (Prometheus + Loki + Grafana) operational (ADR-0006), we need proactive alerting to detect issues before they impact users. Silent monitoring without alerting means issues are only discovered reactively, leading to:

1. **Delayed Incident Response**: No notification when services go down
2. **Missed SLA Violations**: High error rates or latency go unnoticed
3. **Debugging Blind Spots**: Log anomalies not surfaced to team
4. **Production Surprises**: Problems discovered by users, not operations

### Requirements

- **Early Warning System**: Alert before user impact occurs
- **Multi-Signal Monitoring**: Metrics (Prometheus) + Logs (Loki)
- **Severity Levels**: Critical vs Warning thresholds
- **Low False Positives**: Alerts should be actionable, not noisy
- **Code-Based Configuration**: Provisioned via files for version control
- **No External Dependencies**: Work without Alertmanager initially

---

## Decision

We will implement **4 production-grade alerting rules** using Prometheus (metrics-based) and Grafana (log-based) alerting:

1. **BackendDown** (Prometheus) - Service availability
2. **HighErrorRate** (Prometheus) - Error rate threshold
3. **HighLatencyP95** (Prometheus) - Performance degradation
4. **Loki ERROR burst** (Grafana) - Log anomaly detection

### Alert Design Principles

1. **Actionable Alerts Only**: Every alert must require human action
2. **Severity-Based Thresholds**: Critical (immediate action) vs Warning (investigation needed)
3. **Time-Window Analysis**: Use 5-minute windows to avoid transient spikes
4. **For Clauses**: Require sustained threshold violations before firing
5. **Clear Annotations**: Every alert includes summary and remediation guidance

---

## Implementation Details

### 1. Prometheus Alert Rules

**File**: `config/prometheus/alerts.yml`

```yaml
groups:
  - name: clientforge-backend
    interval: 15s  # Evaluate rules every 15 seconds
    rules:
      # CRITICAL: Backend service availability
      - alert: BackendDown
        expr: up{job="clientforge-backend"} == 0
        for: 1m
        labels: 
          severity: critical
        annotations:
          summary: "Backend is DOWN"
          description: "Prometheus cannot scrape /metrics for clientforge-backend."

      # WARNING: High error rate
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{code=~"5.."}[5m]))
            / clamp_min(sum(rate(http_requests_total[5m])), 1) > 0.05
        for: 5m
        labels: 
          severity: warning
        annotations:
          summary: "5xx error rate > 5% (5m)"
          description: "Investigate failing endpoints and dependencies."

      # WARNING: High latency
      - alert: HighLatencyP95
        expr: |
          histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 0.750
        for: 5m
        labels: 
          severity: warning
        annotations:
          summary: "p95 > 750ms (5m)"
          description: "Requests are slow; check DB, queue, or ES load."
```

**Configuration Integration** (`config/prometheus/prometheus.yml`):
```yaml
global:
  scrape_interval: 10s
  evaluation_interval: 30s  # Evaluate rules every 30s

rule_files:
  - /etc/prometheus/alerts.yml  # Load alert rules

scrape_configs:
  - job_name: 'clientforge-backend'
    metrics_path: /metrics
    static_configs:
      - targets: ['backend:3000']
```

**Docker Volume Mount** (`docker-compose.yml`):
```yaml
prometheus:
  volumes:
    - ./config/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml
    - ./config/prometheus/alerts.yml:/etc/prometheus/alerts.yml  # Mount alerts
```

### 2. Grafana Alerting Rules

**File**: `config/grafana/provisioning/alerting/rules.yml`

```yaml
apiVersion: 1
groups:
  - orgId: 1
    name: clientforge-log-alerts
    folder: ClientForge
    interval: 1m  # Evaluate every minute
    rules:
      # WARNING: Log error burst
      - uid: loki_error_burst
        title: Loki ERROR burst (5m)
        condition: A
        data:
          - refId: A
            datasourceUid: loki
            model:
              datasource:
                type: loki
                uid: loki
              expr: 'count_over_time({job="backend"} |= "ERROR" [5m]) > 50'
              queryType: range
        annotations:
          summary: "High ERROR volume in logs (5m)"
        labels:
          severity: warning
```

**Docker Volume Mount** (`docker-compose.yml`):
```yaml
grafana:
  volumes:
    - ./config/grafana/provisioning/alerting:/etc/grafana/provisioning/alerting
```

---

## Alert Specifications

### Alert 1: BackendDown

**Severity**: Critical 🔴  
**Trigger**: Backend /metrics endpoint unreachable for 1+ minute  
**PromQL**: `up{job="clientforge-backend"} == 0`

**When It Fires**:
- Backend container crashed
- Backend server stopped
- Network connectivity lost
- Port 3000 blocked/unavailable

**What to Do**:
1. Check backend container: `docker compose ps backend`
2. View backend logs: `docker compose logs backend --tail=100`
3. Restart if crashed: `docker compose restart backend`
4. Check health endpoint: `curl http://localhost:3000/health`

**Expected Response Time**: Immediate (within 5 minutes)

---

### Alert 2: HighErrorRate

**Severity**: Warning ⚠️  
**Trigger**: 5xx error rate > 5% over 5 minutes  
**PromQL**: 
```promql
sum(rate(http_requests_total{code=~"5.."}[5m]))
  / clamp_min(sum(rate(http_requests_total[5m])), 1) > 0.05
```

**When It Fires**:
- Database connection issues
- External API failures (Stripe, OpenAI, etc.)
- Memory exhaustion causing crashes
- Unhandled exceptions in code
- Queue worker failures

**What to Do**:
1. Check error logs: Grafana → Loki → `{job="backend"} |= "ERROR"`
2. Identify failing endpoint: Grafana → Request Rate by Endpoint panel
3. Check dependencies: Redis, MongoDB, Elasticsearch connectivity
4. Review recent deployments: Was new code deployed?
5. Scale if needed: Increase backend replicas

**Expected Response Time**: Within 15 minutes

**Formula Explanation**:
- `rate(http_requests_total{code=~"5.."}[5m])`: 5xx errors per second
- `rate(http_requests_total[5m])`: Total requests per second
- `clamp_min(..., 1)`: Avoid division by zero
- `> 0.05`: Alert when >5% of requests fail

---

### Alert 3: HighLatencyP95

**Severity**: Warning ⚠️  
**Trigger**: 95th percentile response time > 750ms over 5 minutes  
**PromQL**:
```promql
histogram_quantile(0.95, 
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
) > 0.750
```

**When It Fires**:
- Database queries running slow
- Elasticsearch sync backlog
- Redis cache miss rate high
- External API latency (Stripe, OpenAI)
- Memory pressure causing GC pauses
- High CPU usage
- Queue depth too large

**What to Do**:
1. Check p95 latency trend: Grafana → Backend Dashboard
2. Identify slow endpoints: Query by endpoint label
3. Database performance:
   - Check active connections
   - Review slow query log
   - Check index usage
4. Check queue depth: `docker compose logs backend | grep "Queue depth"`
5. Resource utilization: `docker stats backend`

**Expected Response Time**: Within 30 minutes

**Why 750ms**:
- Target: p95 < 500ms (good)
- Acceptable: p95 < 750ms (degraded but usable)
- Alert: p95 > 750ms (poor user experience)

---

### Alert 4: Loki ERROR Burst

**Severity**: Warning ⚠️  
**Trigger**: More than 50 ERROR-level log entries in 5 minutes  
**LogQL**: `count_over_time({job="backend"} |= "ERROR" [5m]) > 50`

**When It Fires**:
- Repeated exceptions in code
- Integration failures (API calls failing)
- Database connection pool exhaustion
- Failed authentication attempts (potential attack)
- Worker job failures
- File system errors

**What to Do**:
1. View error logs: Grafana → Explore → Loki
   ```
   {job="backend"} |= "ERROR" | json
   ```
2. Group by error type: Look for patterns in error messages
3. Check stack traces: Identify failing code paths
4. Recent changes: Review last deployment
5. External dependencies: Check third-party service status

**Expected Response Time**: Within 1 hour

**Why 50 errors in 5 minutes**:
- Normal: <10 errors per 5 minutes (transient failures)
- Elevated: 10-50 errors (investigate)
- Alert: >50 errors (sustained issue requiring action)

---

## Alert States

Prometheus alerts go through these states:

1. **Inactive** 🟢: Condition not met
2. **Pending** 🟡: Condition met, waiting for `for` duration
3. **Firing** 🔴: Condition met for `for` duration
4. **Resolved** 🟢: Alert was firing, condition no longer met

**Example Timeline**:
```
00:00 - Backend goes down
00:00 - BackendDown: Inactive → Pending
00:01 - BackendDown: Pending → Firing (1 minute elapsed)
00:05 - Backend comes back up
00:05 - BackendDown: Firing → Resolved
```

---

## Verification & Testing

### Check Prometheus Alerts

**Web UI**: http://localhost:9090/alerts

**API**:
```bash
curl http://localhost:9090/api/v1/rules | jq '.data.groups[0].rules'
```

**Expected Output**:
```json
{
  "status": "success",
  "data": {
    "groups": [{
      "name": "clientforge-backend",
      "rules": [
        {"name": "BackendDown", "state": "inactive", "health": "ok"},
        {"name": "HighErrorRate", "state": "inactive", "health": "ok"},
        {"name": "HighLatencyP95", "state": "inactive", "health": "ok"}
      ]
    }]
  }
}
```

### Check Grafana Alerts

**Web UI**: http://localhost:3005/alerting/list

**Expected**:
- Folder: ClientForge
- Rule: "Loki ERROR burst (5m)"
- State: Normal (if no errors) or Alerting (if threshold exceeded)

### Test Alert 1: BackendDown

```bash
# Stop backend
docker compose stop backend

# Wait 1 minute
sleep 60

# Check alert status
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname=="BackendDown")'

# Expected: "state": "firing"

# Restart backend
docker compose start backend

# Wait 30 seconds for alert to resolve
sleep 30

# Check alert status (should be resolved)
```

### Test Alert 2: HighErrorRate

```bash
# Generate 100 requests with 10% error rate
for i in {1..100}; do
  if [ $((i % 10)) -eq 0 ]; then
    curl http://localhost:3000/api/v1/test/error  # 500 error
  else
    curl http://localhost:3000/api/v1/health  # 200 OK
  fi
done

# Wait 5 minutes for alert evaluation
sleep 300

# Check alert status
curl http://localhost:9090/api/v1/alerts | jq '.data.alerts[] | select(.labels.alertname=="HighErrorRate")'
```

### Test Alert 4: Loki ERROR Burst

```bash
# Generate 51 ERROR log entries
for i in {1..51}; do
  # Trigger backend error that logs ERROR level
  curl -X POST http://localhost:3000/api/v1/test/log-error
done

# Wait 1 minute for Grafana alert evaluation
sleep 60

# Check in Grafana UI: http://localhost:3005/alerting/list
```

---

## Consequences

### Positive

- **Proactive Monitoring**: Issues detected before user reports
- **Reduced MTTR**: Faster incident detection and response
- **SLA Compliance**: Visibility into availability and performance
- **Log Anomaly Detection**: Catches issues not visible in metrics
- **Version Controlled**: Alert rules in Git for review and audit
- **No External Dependencies**: Works without Alertmanager (for now)

### Neutral

- **Alert Tuning Required**: Thresholds may need adjustment based on traffic
- **Learning Curve**: Team needs to understand PromQL and LogQL
- **Manual Response**: No automated notifications yet (requires Alertmanager)

### Negative (Mitigated)

- **Silent Alerts**: Alerts fire but no one is notified
  - **Mitigation**: Team checks Prometheus/Grafana UI regularly
  - **Future**: Add Alertmanager with email/Slack notifications (ADR-0009)
- **False Positives**: Alerts may fire during deployments
  - **Mitigation**: Tune thresholds and `for` durations
  - **Future**: Add silences during maintenance windows
- **Alert Fatigue**: Too many warnings could be ignored
  - **Mitigation**: Only 4 high-value alerts configured
  - **Monitoring**: Track alert frequency and adjust thresholds

---

## Alert Lifecycle Management

### When to Silence Alerts

**Planned Maintenance**:
```bash
# Silence BackendDown during deployment
# In Prometheus UI: http://localhost:9090/alerts
# Click "Silence" → Set duration → Add comment
```

**Known Issues**:
- External API degradation (not our fault)
- Database maintenance window
- Load testing (expected high latency)

### When to Tune Thresholds

**HighErrorRate**:
- If 5% is too sensitive → increase to 10%
- If missing real issues → decrease to 2%

**HighLatencyP95**:
- If 750ms is too strict for your workload → increase to 1s
- If users complaining of slowness → decrease to 500ms

**Loki ERROR Burst**:
- If 50 errors/5min is noisy → increase to 100
- If missing error spikes → decrease to 25

### When to Add New Alerts

**Good Reasons**:
- New critical endpoint added
- New dependency introduced (new database, API)
- Historical incidents that alerts would have caught

**Bad Reasons**:
- "Nice to know" metrics that don't require action
- Metrics that change frequently (cause alert fatigue)
- Duplicates of existing alerts

---

## Future Enhancements

### 1. Alertmanager Integration (Next: ADR-0009)

Add notification routing:

```yaml
# docker-compose.yml
alertmanager:
  image: prom/alertmanager:v0.26.0
  volumes:
    - ./config/alertmanager:/etc/alertmanager
  ports:
    - "9093:9093"
```

**Notification Channels**:
- Email (all alerts)
- Slack (critical alerts only)
- PagerDuty (production only)

### 2. Additional Alert Rules

**Database Alerts**:
- `DatabaseConnectionPoolExhausted`
- `SlowQueryDetected` (>1s execution time)

**Queue Alerts**:
- `BullMQJobFailureRate` (>10% failures)
- `QueueDepthHigh` (>1000 jobs pending)

**Business Metrics**:
- `TenantSignupRate` (dropped below threshold)
- `DailyActiveUsers` (dropped >20%)

### 3. Runbook Automation

Link alerts to runbooks:

```yaml
annotations:
  summary: "Backend is DOWN"
  runbook_url: "https://wiki.company.com/runbooks/backend-down"
  description: |
    1. Check container status: docker compose ps
    2. View logs: docker compose logs backend
    3. Restart: docker compose restart backend
```

### 4. Alert Grouping & Deduplication

Configure Alertmanager to:
- Group related alerts (all backend alerts together)
- Deduplicate repeated firings
- Throttle notifications (max 1 per 5 minutes)

---

## Alert Response Playbook

### Step 1: Assess Severity

- **Critical (BackendDown)**: Drop everything, respond immediately
- **Warning (HighErrorRate, HighLatencyP95, ERROR burst)**: Investigate within SLA

### Step 2: Gather Context

```bash
# Check all alerts
curl http://localhost:9090/api/v1/alerts

# View metrics
open http://localhost:9090/graph

# View logs
open http://localhost:3005/explore

# Check service status
docker compose ps
docker stats
```

### Step 3: Diagnose

- Recent deployments?
- Traffic spike?
- External dependency issues?
- Resource exhaustion?

### Step 4: Remediate

- Restart services if crashed
- Scale up if overloaded
- Rollback if bad deployment
- Fix code if bug identified

### Step 5: Document

- Update incident log
- Create postmortem (for critical incidents)
- Tune alert thresholds if needed
- Create new alert if gap identified

---

## Alternatives Considered

### 1. External SaaS Alerting (Datadog, New Relic) - Rejected

**Pros**:
- Turnkey solution
- Advanced features (anomaly detection, ML)
- Managed infrastructure

**Cons**:
- **Cost**: $15-50/host/month
- **Vendor lock-in**: Hard to migrate
- **Data privacy**: Logs sent to third party
- **Rejected**: Self-hosted aligns with monitoring stack (ADR-0006)

### 2. Grafana-Only Alerting - Rejected

**Pros**:
- Single tool for metrics + logs
- Unified alert management

**Cons**:
- **Limited**: Can't alert on Prometheus recording rules
- **Performance**: Heavier resource usage than Prometheus
- **Rejected**: Prometheus alerting is faster and more reliable for metrics

### 3. Script-Based Monitoring (cron + curl) - Rejected

**Approach**: Bash scripts checking endpoints every minute

**Pros**:
- Simple to understand
- No new tools

**Cons**:
- **Inflexible**: Hard to add complex conditions
- **No history**: Can't see alert trends
- **No grouping**: Each alert is independent
- **Rejected**: Not scalable or maintainable

---

## References

- **Prometheus Alerting**: [Prometheus Alerting Rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
- **PromQL Guide**: [Querying Prometheus](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- **Grafana Alerting**: [Grafana Unified Alerting](https://grafana.com/docs/grafana/latest/alerting/)
- **LogQL**: [Loki Query Language](https://grafana.com/docs/loki/latest/logql/)
- **Related ADRs**:
  - [ADR-0006: Monitoring & Observability Stack](/docs/architecture/decisions/ADR-0006-monitoring-observability-stack.md)
- **Next**: ADR-0009: Alertmanager & Notification Routing (future)

---

## Revision History

| Date | Action | Status |
|------|--------|--------|
| 2025-11-12 | Alert rules implemented | ✅ Accepted |
| 2025-11-12 | Prometheus alerts (3 rules) | ✅ Active |
| 2025-11-12 | Grafana Loki alert (1 rule) | ✅ Active |
| 2025-11-12 | Verification complete | ✅ All healthy |
| TBD | Alertmanager integration | 📋 Future (ADR-0009) |
