/**
 * Health Endpoint Wrapper for MCP Servers
 * Add this to any MCP server to expose a /health HTTP endpoint
 *
 * Usage:
 *   const { startHealthServer } = require('./health-endpoint');
 *   startHealthServer('filesystem', 3001);
 */

const http = require('http');

let serverStartTime = Date.now();
let lastToolCallTime = null;
let toolCallCount = 0;
let errorCount = 0;

/**
 * Record a successful tool call
 */
function recordToolCall() {
    lastToolCallTime = Date.now();
    toolCallCount++;
}

/**
 * Record an error
 */
function recordError() {
    errorCount++;
}

/**
 * Get health status
 */
function getHealthStatus() {
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
    const status = uptime > 10 ? 'healthy' : 'starting';

    return {
        status: status,
        uptime: uptime,
        lastToolCall: lastToolCallTime ? new Date(lastToolCallTime).toISOString() : null,
        toolCallCount: toolCallCount,
        errorCount: errorCount,
        errorRate: toolCallCount > 0 ? (errorCount / toolCallCount).toFixed(3) : 0,
        timestamp: new Date().toISOString()
    };
}

/**
 * Start HTTP health check server
 * @param {string} serverName - Name of the MCP server
 * @param {number} port - Port to listen on (default: 3000)
 */
function startHealthServer(serverName, port = 3000) {
    const server = http.createServer((req, res) => {
        if (req.url === '/health' && req.method === 'GET') {
            const health = getHealthStatus();
            health.server = serverName;

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(health, null, 2));
        } else if (req.url === '/metrics' && req.method === 'GET') {
            // Prometheus-compatible metrics
            const uptime = Math.floor((Date.now() - serverStartTime) / 1000);
            const metrics = [
                `# HELP mcp_server_uptime_seconds Server uptime in seconds`,
                `# TYPE mcp_server_uptime_seconds gauge`,
                `mcp_server_uptime_seconds{server="${serverName}"} ${uptime}`,
                ``,
                `# HELP mcp_tool_calls_total Total number of tool calls`,
                `# TYPE mcp_tool_calls_total counter`,
                `mcp_tool_calls_total{server="${serverName}"} ${toolCallCount}`,
                ``,
                `# HELP mcp_errors_total Total number of errors`,
                `# TYPE mcp_errors_total counter`,
                `mcp_errors_total{server="${serverName}"} ${errorCount}`,
            ].join('\n');

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end(metrics);
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Not found' }));
        }
    });

    server.listen(port, 'localhost', () => {
        console.log(`[HEALTH] Server listening on http://localhost:${port}/health`);
    });

    return server;
}

module.exports = {
    startHealthServer,
    recordToolCall,
    recordError,
    getHealthStatus
};
