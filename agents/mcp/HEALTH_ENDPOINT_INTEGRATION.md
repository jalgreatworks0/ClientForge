# Health Endpoint Integration Guide

## Overview

Add HTTP `/health` and `/metrics` endpoints to any MCP server for monitoring and debugging.

## Quick Integration (2 minutes per server)

### Step 1: Add to MCP Server

**Example: `filesystem-mcp-server.js`**

```javascript
// At the top of the file
const { startHealthServer, recordToolCall, recordError } = require('./health-endpoint');

// After initializing your MCP server
startHealthServer('filesystem', 3001);

// In your tool call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        // ... existing tool logic
        recordToolCall(); // Record successful call
        return result;
    } catch (error) {
        recordError(); // Record error
        throw error;
    }
});
```

### Step 2: Assign Unique Ports

| MCP Server | Health Port |
|------------|-------------|
| filesystem | 3001 |
| codebase | 3002 |
| testing | 3003 |
| git | 3004 |
| documentation | 3005 |
| build | 3006 |
| rag | 3007 |
| security | 3008 |
| context-pack | 3009 |
| orchestrator | 3010 |
| ai-router | 3011 |
| env-manager | 3012 |
| api-tester | 3013 |

### Step 3: Test Health Endpoint

```bash
# Test single server
curl http://localhost:3001/health

# Expected response:
{
  "status": "healthy",
  "server": "filesystem",
  "uptime": 123,
  "lastToolCall": "2025-11-08T12:34:56.789Z",
  "toolCallCount": 42,
  "errorCount": 2,
  "errorRate": "0.048",
  "timestamp": "2025-11-08T12:36:00.000Z"
}
```

### Step 4: Test All Servers

```powershell
# PowerShell script to check all health endpoints
3001..3013 | ForEach-Object {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$_/health" -TimeoutSec 2 -UseBasicParsing
        $health = $response.Content | ConvertFrom-Json
        Write-Host "[OK] $($health.server) - Uptime: $($health.uptime)s" -ForegroundColor Green
    } catch {
        Write-Host "[FAILED] Port $_" -ForegroundColor Red
    }
}
```

---

## Advanced: Prometheus Metrics

### Expose Metrics Endpoint

Already included! Visit `/metrics` on any health port:

```bash
curl http://localhost:3001/metrics
```

**Response** (Prometheus format):
```
# HELP mcp_server_uptime_seconds Server uptime in seconds
# TYPE mcp_server_uptime_seconds gauge
mcp_server_uptime_seconds{server="filesystem"} 123

# HELP mcp_tool_calls_total Total number of tool calls
# TYPE mcp_tool_calls_total counter
mcp_tool_calls_total{server="filesystem"} 42

# HELP mcp_errors_total Total number of errors
# TYPE mcp_errors_total counter
mcp_errors_total{server="filesystem"} 2
```

### Scrape with Prometheus

**`prometheus.yml`**:
```yaml
scrape_configs:
  - job_name: 'mcp-servers'
    static_configs:
      - targets:
        - 'localhost:3001'
        - 'localhost:3002'
        - 'localhost:3003'
        # ... all 13 ports
    scrape_interval: 15s
```

---

## Automated Health Dashboard

### Create `health_dashboard.html`

```html
<!DOCTYPE html>
<html>
<head>
    <title>MCP Health Dashboard</title>
    <meta http-equiv="refresh" content="10">
    <style>
        body { font-family: monospace; background: #1e1e1e; color: #d4d4d4; padding: 20px; }
        .server { margin: 10px 0; padding: 10px; border-radius: 5px; }
        .healthy { background: #0e4429; border-left: 5px solid #2ea043; }
        .unhealthy { background: #4d1111; border-left: 5px solid #da3633; }
        .loading { background: #3d3d00; border-left: 5px solid #f0c674; }
        h1 { color: #58a6ff; }
    </style>
</head>
<body>
    <h1>MCP Server Health Dashboard</h1>
    <div id="servers"></div>

    <script>
        const servers = [
            {name: 'filesystem', port: 3001},
            {name: 'codebase', port: 3002},
            {name: 'testing', port: 3003},
            {name: 'git', port: 3004},
            {name: 'documentation', port: 3005},
            {name: 'build', port: 3006},
            {name: 'rag', port: 3007},
            {name: 'security', port: 3008},
            {name: 'context-pack', port: 3009},
            {name: 'orchestrator', port: 3010},
            {name: 'ai-router', port: 3011},
            {name: 'env-manager', port: 3012},
            {name: 'api-tester', port: 3013}
        ];

        async function checkHealth(server) {
            try {
                const response = await fetch(`http://localhost:${server.port}/health`);
                const health = await response.json();
                return {
                    ...health,
                    className: health.status === 'healthy' ? 'healthy' : 'unhealthy'
                };
            } catch (error) {
                return {
                    server: server.name,
                    status: 'unreachable',
                    className: 'unhealthy',
                    error: error.message
                };
            }
        }

        async function updateDashboard() {
            const results = await Promise.all(servers.map(checkHealth));
            const html = results.map(r => `
                <div class="server ${r.className}">
                    <strong>${r.server}</strong> - ${r.status}
                    ${r.uptime ? ` | Uptime: ${r.uptime}s` : ''}
                    ${r.toolCallCount ? ` | Calls: ${r.toolCallCount}` : ''}
                    ${r.errorCount ? ` | Errors: ${r.errorCount}` : ''}
                    ${r.error ? ` | Error: ${r.error}` : ''}
                </div>
            `).join('');

            document.getElementById('servers').innerHTML = html;
        }

        updateDashboard();
        setInterval(updateDashboard, 10000); // Refresh every 10s
    </script>
</body>
</html>
```

**Save as**: `D:\clientforge-crm\agents\mcp\health_dashboard.html`

**Open in browser**: `file:///D:/clientforge-crm/agents/mcp/health_dashboard.html`

---

## Integration Checklist

For each MCP server:

- [ ] Add `require('./health-endpoint')` at top
- [ ] Call `startHealthServer('server-name', port)` after initialization
- [ ] Wrap tool handlers with `recordToolCall()` and `recordError()`
- [ ] Test `/health` endpoint returns 200
- [ ] Test `/metrics` endpoint returns Prometheus format
- [ ] Add to health dashboard HTML

---

## Troubleshooting

### "Port already in use" error

Ports 3001-3013 are assigned. If any conflict, update the port number in both the server file and the dashboard.

### "/health returns 404"

1. Verify health server started (check console logs)
2. Confirm correct port in `startHealthServer(name, PORT)`
3. Test with `curl -v http://localhost:PORT/health`

### CORS errors in browser dashboard

Health endpoints only listen on `localhost`. Open the dashboard as a local file (`file://...`) or add CORS headers to health-endpoint.js:

```javascript
res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
});
```

---

## Next Steps

1. Integrate health endpoints into all 13 MCP servers (30 min each)
2. Open `health_dashboard.html` in browser
3. Set as home page or pin tab for always-on monitoring
4. Optional: Set up Prometheus + Grafana for production monitoring

**Benefits**:
- Instant visibility into MCP server health
- Proactive error detection before user impact
- Performance metrics for optimization
- Debugging aid (uptime, last call timestamp)
