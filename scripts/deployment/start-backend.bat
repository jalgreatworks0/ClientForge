@echo off
REM =========================================
REM ClientForge CRM - Backend Server
REM =========================================
REM Starts the Node.js backend API server
REM Port: 3000
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Backend Server
echo ========================================
echo.

REM Change to project root directory
cd /d "%~dp0..\.."

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found!
    echo Please create .env file with required environment variables.
    echo See .env.example for reference.
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo.
    call npm install --legacy-peer-deps
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install dependencies!
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting backend development server on port 3000...
echo [INFO] API will be available at: http://localhost:3000/api
echo [INFO] Health check: http://localhost:3000/api/v1/health
echo [INFO] Auto-reload enabled with ts-node-dev
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the backend development server with auto-reload
call npm run dev:backend

if errorlevel 1 (
    echo.
    echo [ERROR] Backend server crashed or failed to start!
    echo Check the logs above for error details.
    pause
    exit /b 1
)
