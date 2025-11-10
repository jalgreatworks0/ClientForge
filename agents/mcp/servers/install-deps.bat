@echo off
echo Installing MCP Server Dependencies...
cd /d D:\clientforge-crm\agents\mcp\servers
npm init -y
npm install @modelcontextprotocol/sdk glob simple-git chokidar fast-glob
echo.
echo Done! Dependencies installed.
pause
