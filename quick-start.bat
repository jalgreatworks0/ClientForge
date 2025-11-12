@echo off
REM ============================================
REM ClientForge CRM - Quick Start (No Prompts)
REM ============================================

echo Starting all ClientForge CRM services...

REM Check Docker
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not running! Please start Docker Desktop.
    pause
    exit /b 1
)

REM Start Docker services
echo Starting Docker services...
docker-compose up -d postgres mongodb redis elasticsearch

REM Wait for services
echo Waiting 10 seconds for services to initialize...
timeout /t 10 /nobreak >nul

REM Start backend
echo Starting backend...
start "ClientForge Backend" cmd /k "npm run dev:backend"

REM Wait a bit
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting frontend...
start "ClientForge Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo ====================================================
echo All services started!
echo.
echo Backend:  http://localhost:3000
echo Frontend: http://localhost:3001
echo.
echo Check the new windows for logs.
echo ====================================================
echo.
pause
