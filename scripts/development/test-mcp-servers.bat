@echo off
REM =========================================
REM Test ClientForge MCP Servers
REM =========================================

title Testing ClientForge MCP Servers

echo.
echo ========================================
echo  Testing ClientForge MCP Servers
echo ========================================
echo.

cd /d D:\clientforge-crm\agents\mcp\servers

echo [TEST 1] Testing filesystem-mcp-server...
node filesystem-mcp-server.js --test 2>nul && echo [OK] filesystem-mcp-server || echo [FAIL] filesystem-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 2] Testing database-server...
node database-server.js --test 2>nul && echo [OK] database-server || echo [FAIL] database-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 3] Testing codebase-mcp-server...
node codebase-mcp-server.js --test 2>nul && echo [OK] codebase-mcp-server || echo [FAIL] codebase-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 4] Testing testing-mcp-server...
node testing-mcp-server.js --test 2>nul && echo [OK] testing-mcp-server || echo [FAIL] testing-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 5] Testing build-mcp-server...
node build-mcp-server.js --test 2>nul && echo [OK] build-mcp-server || echo [FAIL] build-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 6] Testing context-pack-mcp-server...
node context-pack-mcp-server.js --test 2>nul && echo [OK] context-pack-mcp-server || echo [FAIL] context-pack-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 7] Testing security-mcp-server...
node security-mcp-server.js --test 2>nul && echo [OK] security-mcp-server || echo [FAIL] security-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 8] Testing git-mcp-server...
node git-mcp-server.js --test 2>nul && echo [OK] git-mcp-server || echo [FAIL] git-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 9] Testing documentation-mcp-server...
node documentation-mcp-server.js --test 2>nul && echo [OK] documentation-mcp-server || echo [FAIL] documentation-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 10] Testing rag-mcp-server...
node rag-mcp-server.js --test 2>nul && echo [OK] rag-mcp-server || echo [FAIL] rag-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo [TEST 11] Testing orchestrator-mcp-server...
node orchestrator-mcp-server.js --test 2>nul && echo [OK] orchestrator-mcp-server || echo [FAIL] orchestrator-mcp-server
timeout /t 1 /nobreak >nul

echo.
echo ========================================
echo  Test Complete!
echo ========================================
echo.
echo Next Steps:
echo 1. Restart Claude Desktop
echo 2. Type in chat: "list all available MCP tools"
echo 3. You should see 19 MCP servers with 100+ tools
echo.
echo ========================================
echo.
pause
