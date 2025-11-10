@echo off
REM =========================================
REM ClientForge CRM - Frontend Development Server
REM =========================================
REM Starts the Vite development server for React frontend
REM Port: 3001
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Frontend Server
echo ========================================
echo.

REM Navigate to frontend directory (from scripts/deployment to project root, then to frontend)
cd /d "%~dp0..\..\frontend"

REM Check if node_modules exists
if not exist "node_modules" (
    echo [INFO] node_modules not found. Installing dependencies...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [ERROR] Failed to install frontend dependencies!
        pause
        exit /b 1
    )
)

echo.
echo [INFO] Starting frontend development server on port 3001...
echo [INFO] Frontend will be available at: http://localhost:3001
echo [INFO] API proxy configured to: http://localhost:3000/api
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

REM Start the frontend dev server
call npm run dev

if errorlevel 1 (
    echo.
    echo [ERROR] Frontend server crashed or failed to start!
    echo Check the logs above for error details.
    pause
    exit /b 1
)
