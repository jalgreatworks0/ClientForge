@echo off
REM ============================================================================
REM ClientForge CRM - Elite Dev Launcher (One-Click Start)
REM ============================================================================
REM Purpose: Reliable one-command startup for local development
REM Usage: Double-click this file or run: start-all.bat
REM
REM What this does:
REM   1. (Optional) Quick health check via tests
REM   2. Verify Docker is running
REM   3. Start Docker services (PostgreSQL, MongoDB, Redis, Elasticsearch)
REM   4. Wait for services to be ready
REM   5. Start backend API on http://localhost:3000
REM   6. Wait for backend health endpoint
REM   7. Start frontend UI on http://localhost:3001
REM   8. Open browser to frontend
REM
REM Prerequisites:
REM   - Docker Desktop installed and running
REM   - Node.js 18+ installed
REM   - Dependencies installed (npm install)
REM
REM Safe to run multiple times (idempotent)
REM ============================================================================

SETLOCAL ENABLEDELAYEDEXPANSION
set ROOT=%~dp0
cd /d "%ROOT%"

echo.
echo ============================================================================
echo   ClientForge CRM - Elite Dev Launcher
echo ============================================================================
echo   Starting all services for local development...
echo ============================================================================
echo.

REM ============================================================================
REM STEP 0: Optional Health Check (Smoke Test)
REM ============================================================================
REM Uncomment the following section if you want a quick health check before starting.
REM This runs a lightweight smoke test to catch issues early.
REM
REM echo [0/7] Running quick health check...
REM npm run test:backend -- --testPathPattern=smoke --passWithNoTests 2>nul
REM if ERRORLEVEL 1 (
REM     echo.
REM     echo WARNING: Health check detected issues!
REM     echo.
REM     choice /C YN /M "Continue anyway (Y/N)"
REM     if ERRORLEVEL 2 (
REM         echo Aborted by user.
REM         pause
REM         exit /b 1
REM     )
REM     echo Continuing despite warnings...
REM )
REM echo       Health check passed (or skipped).
REM echo.

REM ============================================================================
REM STEP 1: Verify Docker is Running
REM ============================================================================
echo [1/7] Checking Docker Desktop...
docker info >nul 2>&1
if ERRORLEVEL 1 (
    echo.
    echo ============================================================================
    echo   ERROR: Docker is not running!
    echo ============================================================================
    echo.
    echo   Please start Docker Desktop and wait for it to fully initialize.
    echo   Look for the whale icon in your system tray.
    echo.
    echo   Once Docker is running, run this script again.
    echo ============================================================================
    echo.
    pause
    exit /b 1
)
echo       Docker is running - OK
echo.

REM ============================================================================
REM STEP 2: Start Docker Compose Services
REM ============================================================================
echo [2/7] Starting Docker services (PostgreSQL, MongoDB, Redis, Elasticsearch)...
docker-compose up -d postgres mongodb redis elasticsearch
if ERRORLEVEL 1 (
    echo.
    echo ============================================================================
    echo   ERROR: Failed to start Docker services
    echo ============================================================================
    echo.
    echo   This could be due to:
    echo   - Port conflicts (ports 5432, 27017, 6379, 9200 may be in use)
    echo   - Docker Desktop not fully initialized
    echo   - docker-compose.yml configuration issues
    echo.
    echo   Troubleshooting:
    echo   1. Check running containers: docker ps
    echo   2. Check logs: docker-compose logs
    echo   3. Stop conflicting services or restart Docker Desktop
    echo ============================================================================
    echo.
    pause
    exit /b 1
)
echo       Docker services started successfully
echo.

REM ============================================================================
REM STEP 3: Wait for Docker Services to Initialize
REM ============================================================================
echo [3/7] Waiting for Docker services to initialize (10 seconds)...
echo       This ensures databases are ready before backend starts...
timeout /t 10 /nobreak >nul
echo       Services should be initialized
echo.

REM ============================================================================
REM STEP 4: Start Backend API
REM ============================================================================
echo [4/7] Starting backend API on http://localhost:3000 ...
start "ClientForge Backend API (Port 3000)" cmd /k "cd /d "%ROOT%" && echo Starting backend server... && npm run dev:backend"
echo       Backend starting in new window (check for errors there)
echo.

REM ============================================================================
REM STEP 5: Wait for Backend Health Endpoint
REM ============================================================================
echo [5/7] Waiting for backend to be healthy...
echo       Checking http://localhost:3000/api/v1/health ...
set RETRY_COUNT=0
set MAX_RETRIES=30
:WAIT_BACKEND
timeout /t 2 /nobreak >nul
curl -s -f http://localhost:3000/api/v1/health >nul 2>&1
if ERRORLEVEL 1 (
    set /a RETRY_COUNT+=1
    if !RETRY_COUNT! GEQ %MAX_RETRIES% (
        echo.
        echo ============================================================================
        echo   WARNING: Backend health check timeout (after 60 seconds)
        echo ============================================================================
        echo.
        echo   Backend may not be ready. Check the backend terminal window for errors.
        echo.
        echo   Common issues:
        echo   - Database connection failed (check Docker services)
        echo   - TypeScript compilation errors
        echo   - Port 3000 already in use
        echo   - Missing environment variables (.env file)
        echo.
        choice /C YN /M "Continue anyway and start frontend (Y/N)"
        if ERRORLEVEL 2 (
            echo.
            echo Aborted. Backend terminal window will remain open for debugging.
            echo.
            pause
            exit /b 1
        )
        echo Continuing despite backend not being fully ready...
        goto BACKEND_READY
    )
    echo       Retry !RETRY_COUNT!/%MAX_RETRIES% - backend not ready yet...
    goto WAIT_BACKEND
)
echo       Backend is healthy and ready!
:BACKEND_READY
echo.

REM ============================================================================
REM STEP 6: Start Frontend UI
REM ============================================================================
echo [6/7] Starting frontend UI on http://localhost:3001 ...
start "ClientForge Frontend UI (Port 3001)" cmd /k "cd /d "%ROOT%\frontend" && echo Starting frontend dev server... && npm run dev"
echo       Frontend starting in new window (check for errors there)
echo.

REM ============================================================================
REM STEP 7: Wait for Frontend and Open Browser
REM ============================================================================
echo [7/7] Waiting for frontend to compile and be ready (10 seconds)...
timeout /t 10 /nobreak >nul
echo       Opening browser to http://localhost:3001 ...
start "" "http://localhost:3001/"
echo       Browser launched
echo.

REM ============================================================================
REM SUCCESS!
REM ============================================================================
echo ============================================================================
echo   SUCCESS! ClientForge CRM is now running
echo ============================================================================
echo.
echo   URLS:
echo   - Frontend UI:       http://localhost:3001
echo   - Backend API:       http://localhost:3000
echo   - API Health Check:  http://localhost:3000/api/v1/health
echo.
echo   DOCKER SERVICES:
echo   - PostgreSQL:        localhost:5432 (user: crm, pass: password, db: clientforge)
echo   - MongoDB:           localhost:27017
echo   - Redis:             localhost:6379
echo   - Elasticsearch:     localhost:9200
echo.
echo   MONITORING:
echo   - Check backend terminal window for API logs
echo   - Check frontend terminal window for Vite dev server logs
echo   - View Docker logs: docker-compose logs -f
echo.
echo   TO STOP ALL SERVICES:
echo   - Close backend and frontend terminal windows (Ctrl+C)
echo   - Run: stop-all.bat
echo   - Or run: docker-compose down
echo.
echo   TROUBLESHOOTING:
echo   - If UI doesn't load, wait 30 more seconds for Vite to compile
echo   - Check frontend terminal for "ready in Xms" message
echo   - If backend fails, check .env file exists and is configured
echo   - For Docker issues: docker-compose logs [service-name]
echo.
echo ============================================================================
echo   Press any key to close this launcher window...
echo   (Backend and frontend windows will remain open)
echo ============================================================================
pause >nul
