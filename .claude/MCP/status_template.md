# MCP Status Template

## Router
- **URL:** http://localhost:8765
- **Health:** http://localhost:8765/health
- **Servers:** http://localhost:8765/servers

## Quick Check
\\\ash
curl http://localhost:8765/health
\\\

## Expected Response
\\\json
{
  "status": "healthy",
  "uptime": 12345,
  "servers": 33,
  "version": "2.0.0"
}
\\\

## If Down
1. Check port: \
etstat -ano | findstr ":8765"\
2. Check logs: \	ail -f D:\clientforge-crm\logs\mcp.log\
3. Restart: \
pm run mcp:all\

## Live Status
Check \.claude/INBOX/mcp_status.json\ for real-time status.
