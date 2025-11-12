# Monitoring Stack

## Overview

ClientForge CRM uses a comprehensive monitoring stack for metrics collection, visualization, and log aggregation:

- **Prometheus**: Time-series metrics database (port 9090)
- **Grafana**: Visualization and dashboards (port 3005)
- **Loki**: Log aggregation system (port 3100)
- **Promtail**: Log shipping agent

## Architecture

```
Backend (/metrics) ──scrape──> Prometheus ──query──> Grafana
Backend (logs/*.log) ──ship──> Promtail ──push──> Loki ──query──> Grafana
```

## Quick Start

### Start Monitoring Stack

```bash
npm run monitor:start
```

This starts Prometheus, Grafana, Loki, and Promtail containers.

### Check Status

```bash
npm run monitor:status
```

### View Logs

```bash
npm run monitor:logs
```

## Access Points

- **Prometheus**: http://localhost:9090
  - Targets: http://localhost:9090/targets
  - Queries: http://localhost:9090/graph

- **Grafana**: http://localhost:3005
  - Default credentials: `admin` / `admin`
  - Dashboards: Home → ClientForge folder

- **Loki**: http://localhost:3100
  - Health: http://localhost:3100/ready
  - Metrics: http://localhost:3100/metrics

## Configuration Files

### Prometheus
- **Location**: `config/prometheus/prometheus.yml`
- **Scrape Interval**: 10 seconds
- **Targets**:
  - `clientforge-backend`: Backend metrics endpoint (backend:3000/metrics)
  - `prometheus`: Self-monitoring

### Loki
- **Location**: `config/loki/loki-config.yml`
- **Storage**: Filesystem (`/loki` volume)
- **Schema**: v13 with boltdb-shipper
- **Retention**: 24-hour index period

### Promtail
- **Location**: `config/promtail/promtail-config.yml`
- **Jobs**:
  - `clientforge-backend-logs`: Scrapes `/app/logs/*.log`
  - `docker-stdout`: Scrapes container stdout via Docker socket

### Grafana
- **Provisioning**: `config/grafana/provisioning/`
- **Datasources**: Auto-configured (Prometheus + Loki)
- **Dashboards**: Auto-loaded from `dashboards/` directory

## Dashboards

### ClientForge Backend - Overview
Located in `dashboards/clientforge-backend.json`

**Panels**:
1. **HTTP Request Rate**: Total requests per second
   - Metric: `rate(http_requests_total[1m])`

2. **Request Duration (p95)**: 95th percentile latency
   - Metric: `histogram_quantile(0.95, http_request_duration_ms)`

3. **Error Logs**: Recent ERROR-level log entries
   - Source: Loki query filtered by `|= "ERROR"`

## Backend Metrics

The backend exposes Prometheus metrics at `/metrics` endpoint via `prom-client`.

**Key Metrics**:
- `http_requests_total`: Total HTTP requests (counter)
- `http_request_duration_ms`: Request duration histogram
- `active_connections`: Current active connections (gauge)
- `process_*`: Node.js process metrics
- `nodejs_*`: V8 engine metrics

## Backend Logging

Logs are written by Winston to the `logs/` directory:

- `logs/error.log`: ERROR level only
- `logs/combined.log`: All log levels

**Configuration**: `backend/utils/logging/logger.ts`

**Format**: JSON with timestamps and metadata

**Rotation**: 10 files × 10MB max per file

## Volume Mounts

```yaml
backend:
  volumes:
    - ./logs:/app/logs  # Share logs with Promtail

promtail:
  volumes:
    - ./logs:/app/logs:ro  # Read backend logs
    - /var/run/docker.sock:/var/run/docker.sock:ro  # Container discovery

grafana:
  volumes:
    - ./dashboards:/var/lib/grafana/dashboards  # Auto-load dashboards
    - ./config/grafana/provisioning/:/etc/grafana/provisioning/  # Datasources
```

## Troubleshooting

### Backend Target Shows "DOWN" in Prometheus

**Cause**: Backend container is not running or /metrics endpoint is unreachable.

**Solution**:
```bash
# Start backend
docker compose up -d backend

# Verify metrics endpoint
curl http://localhost:3000/metrics
```

### No Logs Appearing in Grafana

**Cause**: Promtail cannot read log files or backend is not writing logs.

**Solution**:
1. Check backend logs directory exists: `ls -la logs/`
2. Verify Promtail is running: `docker compose ps promtail`
3. Check Promtail logs: `docker compose logs promtail`
4. Verify volume mount: `docker inspect clientforge-promtail | grep Mounts -A 20`

### Dashboard Not Appearing in Grafana

**Cause**: Dashboard provisioning failed or incorrect volume mount.

**Solution**:
1. Check Grafana logs: `docker compose logs grafana | grep -i provision`
2. Verify dashboard file exists: `ls -la dashboards/clientforge-backend.json`
3. Restart Grafana: `docker compose restart grafana`

### Loki "Ingester Not Ready"

**Cause**: Normal startup delay (15 seconds).

**Solution**: Wait 15-30 seconds after startup, then check http://localhost:3100/ready again.

## Smoke Tests

### Generate Test Traffic

```bash
# Windows PowerShell
powershell -Command "1..25 | % { iwr http://localhost:3000/api/v1/health -Headers @{ 'x-tenant-id'='smoketest' } | Out-Null }"

# Linux/Mac
for i in {1..25}; do curl -H "x-tenant-id: smoketest" http://localhost:3000/api/v1/health; done
```

### Verify Metrics in Prometheus

1. Open http://localhost:9090/graph
2. Query: `http_requests_total`
3. Confirm counter increases after traffic generation

### Generate Test Error Log

```bash
# Via API endpoint (if available)
curl -X POST http://localhost:3000/api/v1/test/error

# Or trigger an error manually in code
```

### Verify Logs in Grafana

1. Open http://localhost:3005/explore
2. Select "Loki" datasource
3. Query: `{job="backend"} |= "ERROR"`
4. Confirm error log entries appear

## Production Considerations

### Security
- Change Grafana admin password immediately
- Enable authentication for Prometheus (basic auth or OAuth)
- Restrict metrics endpoint access (internal network only)
- Use TLS/HTTPS for all monitoring endpoints

### Scalability
- Increase Loki retention settings for long-term storage
- Configure Prometheus remote write to long-term storage (e.g., Thanos, Cortex)
- Scale Promtail agents across multiple servers
- Set up Grafana alerting rules

### High Availability
- Run multiple Prometheus instances with federation
- Configure Loki in clustered mode
- Use external storage (S3, GCS) for Loki chunks
- Set up Grafana HA with shared database

### Resource Limits

Add resource constraints in docker-compose.yml:

```yaml
prometheus:
  deploy:
    resources:
      limits:
        memory: 2G
        cpus: '1.0'
```

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Loki Documentation](https://grafana.com/docs/loki/)
- [Promtail Documentation](https://grafana.com/docs/loki/latest/clients/promtail/)
