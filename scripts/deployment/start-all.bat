@echo off
setlocal enabledelayedexpansion
title ClientForge CRM - Full Stack Startup

REM =========================================
REM ClientForge CRM - Full Stack Startup
REM =========================================
REM Backend: Port 3000
REM Frontend: Port 3001
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Full Stack Startup
echo ========================================
echo.

REM ────────────────────────────────
REM Move to project root
cd /d "%~dp0..\.."

REM ────────────────────────────────
REM Check .env file
if not exist ".env" (
    echo [ERROR] .env file not found in %CD%
    echo Please create it using .env.example as reference.
    pause
    exit /b 1
)

REM ────────────────────────────────
REM Verify Docker services
echo [1/5] Checking Docker services...
docker ps --format "       - {{.Names}}: {{.Status}}" | findstr "clientforge" >nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Some or all ClientForge containers are not running.
    echo Run:
    echo   cd D:\clientforge-crm
    echo   docker compose up -d
    echo Press any key to continue anyway or Ctrl+C to cancel.
    pause >nul
) else (
    echo       Docker containers appear to be running.
)

REM ────────────────────────────────
REM Clean up old processes on 3000/3001
echo.
echo [2/5] Cleaning up existing processes...
set "found_process="
for %%P in (3000 3001) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING 2^>nul') do (
        set "found_process=1"
        echo       Killing process on port %%P (PID %%a)
        taskkill /F /PID %%a >nul 2>&1
    )
)
if defined found_process (
    timeout /t 2 >nul
) else (
    echo       No existing processes found.
)

REM ────────────────────────────────
REM Start backend
echo.
echo [3/5] Starting backend server (Port 3000)...
start "ClientForge Backend" cmd /k "cd /d %CD% && npm run dev:backend"
timeout /t 4 >nul

REM ────────────────────────────────
REM Start frontend
echo.
echo [4/5] Starting frontend server (Port 3001)...
cd /d "%~dp0..\..\frontend"
if not exist "package.json" (
    echo [ERROR] Frontend directory invalid at %CD%
    pause
    exit /b 1
)
start "ClientForge Frontend" cmd /k "npm run dev"
timeout /t 4 >nul

REM ────────────────────────────────
REM Open browser
echo.
echo [5/5] Opening browser...
start "" "http://localhost:3001"

REM ────────────────────────────────
REM Summary
cd /d "%~dp0..\.."
echo.
echo ========================================
echo [SUCCESS] ClientForge CRM is running!
echo ========================================
echo.
echo   Backend:  http://localhost:3000
echo   Frontend: http://localhost:3001
echo.
echo   Master Admin Login:
echo     Email:    master@clientforge.io
echo     Password: _puQRte2HNygbzbRZD2kNqiXIUBlrWAZ5lBKT3aIXPI
echo.
echo   Separate windows show backend and frontend logs.
echo   Close those to stop servers.
echo ========================================
echo.
pause
exit /b 0