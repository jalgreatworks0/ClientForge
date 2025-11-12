@echo off
REM ============================================================================
REM ClientForge CRM - Elite Windows Launcher
REM ============================================================================
REM Purpose: One-command startup for Docker + Backend + Frontend
REM Usage: Double-click this file or run: start-clientforge.bat
REM Safe to run multiple times (idempotent)
REM ============================================================================

SETLOCAL ENABLEDELAYEDEXPANSION
set ROOT=%~dp0
cd /d %ROOT%

echo.
echo ============================================================================
echo   ClientForge CRM - Starting All Services
echo ============================================================================
echo.

REM ============================================================================
REM 1. Start Docker Compose Services
REM ============================================================================
echo [1/4] Starting Docker services (PostgreSQL, MongoDB, Redis, Elasticsearch)...
docker-compose up -d
if ERRORLEVEL 1 (
    echo ERROR: Failed to start Docker services. Check Docker Desktop is running.
    pause
    exit /b 1
)
echo       Docker services started successfully.
echo.

REM ============================================================================
REM 2. Wait for Docker Services to Initialize
REM ============================================================================
echo [2/4] Waiting for services to initialize (5 seconds)...
timeout /t 5 /nobreak >nul
echo       Services initialized.
echo.

REM ============================================================================
REM 3. Start Backend API (Port 3000)
REM ============================================================================
echo [3/4] Launching backend API on http://localhost:3000 ...
start "ClientForge Backend API (Port 3000)" cmd /k "cd /d %ROOT% && npm run dev:backend"
echo       Backend started in new window.
echo.

REM ============================================================================
REM 4. Start Frontend UI (Port 3001)
REM ============================================================================
echo [4/4] Launching frontend UI on http://localhost:3001 ...
start "ClientForge Frontend UI (Port 3001)" cmd /k "cd /d %ROOT%\frontend && npm run dev"
echo       Frontend started in new window.
echo.

REM ============================================================================
REM Wait for Services to Be Ready
REM ============================================================================
echo [WAIT] Waiting for services to be ready (8 seconds)...
timeout /t 8 /nobreak >nul
echo.

REM ============================================================================
REM Open Browser to Frontend
REM ============================================================================
echo [LAUNCH] Opening browser to http://localhost:3001 ...
start "" "http://localhost:3001/"
echo.

REM ============================================================================
REM Success
REM ============================================================================
echo ============================================================================
echo   ClientForge CRM - All Services Started Successfully!
echo ============================================================================
echo.
echo   Backend API:  http://localhost:3000
echo   Frontend UI:  http://localhost:3001
echo   Health Check: http://localhost:3000/api/v1/health
echo.
echo   To stop all services, run: stop-all.bat
echo   To view logs: docker-compose logs -f
echo.
echo   Press any key to close this window...
echo ============================================================================
pause >nul
