@echo off
setlocal enabledelayedexpansion

REM =========================================
REM ClientForge CRM - Full Stack Startup
REM =========================================
REM Starts both backend and frontend servers
REM Backend: Port 3000
REM Frontend: Port 3001
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Full Stack Startup
echo ========================================
echo.

REM Change to project root directory
cd /d "%~dp0..\.."

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Location: %CD%\.env
    echo.
    echo Please create .env file with required environment variables.
    echo See .env.example for reference.
    echo.
    pause
    exit /b 1
)

REM Check Docker services
echo [1/5] Checking Docker services...
docker ps --filter "name=clientforge-crm" --format "       - {{.Names}}: {{.Status}}" 2>nul | findstr "Up" >nul
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARNING] Docker services not running!
    echo Please start them first:
    echo   cd D:\clientforge-crm\deployment\docker\development
    echo   docker-compose up -d postgres redis mongodb elasticsearch minio rabbitmq
    echo.
    echo Press any key to continue anyway or Ctrl+C to exit...
    pause >nul
) else (
    echo       Docker services are running!
)

REM Kill any existing processes on ports 3000 and 3001
echo.
echo [2/5] Cleaning up existing processes...
set "found_process="
for %%P in (3000 3001) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%%P ^| findstr LISTENING 2^>nul') do (
        set "found_process=1"
        echo       Killing process on port %%P (PID: %%a)
        taskkill /F /PID %%a >nul 2>&1
    )
)
if defined found_process (
    echo       Waiting for ports to be released...
    timeout /t 3 /nobreak >nul
) else (
    echo       No existing processes found
)

REM Start backend
echo.
echo [3/5] Starting backend server (Port 3000)...
start "ClientForge Backend" cmd /k "cd /d %CD% && npm run dev:backend"

REM Wait for backend to initialize
echo       Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start frontend
echo.
echo [4/5] Starting frontend server (Port 3001)...
cd /d "%~dp0..\..\frontend"
if not exist "package.json" (
    echo [ERROR] Frontend directory not found or invalid!
    echo Expected: %CD%
    echo.
    pause
    exit /b 1
)
start "ClientForge Frontend" cmd /k "npm run dev"

REM Wait for frontend to initialize
cd /d "%~dp0..\.."
echo       Waiting for frontend to initialize...
timeout /t 5 /nobreak >nul

REM Open browser
echo.
echo [5/5] Opening browser...
start "" "http://localhost:3001"

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
echo   Check the separate windows for server logs.
echo   Close those windows to stop the servers.
echo.
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
