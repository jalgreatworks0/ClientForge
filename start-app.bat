@echo off
REM =========================================
REM ClientForge CRM - Application Launcher
REM =========================================
REM Starts backend + frontend and opens browser
REM Backend: Port 3000
REM Frontend: Port 3001
REM =========================================

title ClientForge CRM - Application Launcher

echo.
echo ========================================
echo  ClientForge CRM - Application Launcher
echo ========================================
echo.
echo Starting full-stack CRM application...
echo.

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo The application may not work correctly without environment variables.
    echo See .env.example for reference.
    echo.
    echo Press any key to continue anyway, or Ctrl+C to cancel...
    pause >nul
)

REM Kill any existing Node.js processes to avoid port conflicts
echo [INFO] Checking for existing Node.js processes...
tasklist /FI "IMAGENAME eq node.exe" 2>NUL | find /I /N "node.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [WARNING] Found existing Node.js processes. Terminating them...
    taskkill /F /IM node.exe >NUL 2>&1
    timeout /t 2 /nobreak >nul
)

REM Start backend in a new minimized window
echo [INFO] Starting backend server on port 3000...
start "ClientForge Backend API" /MIN cmd /c "cd /d %~dp0 && npm run dev:backend"

REM Wait for backend to initialize
echo [INFO] Waiting for backend to initialize...
timeout /t 5 /nobreak >nul

REM Start frontend in a new minimized window
echo [INFO] Starting frontend server on port 3001...
start "ClientForge Frontend UI" /MIN cmd /c "cd /d %~dp0frontend && npm run dev"

REM Wait for frontend to initialize
echo [INFO] Waiting for frontend to start...
timeout /t 3 /nobreak >nul

REM Open the application in default browser
echo [INFO] Opening application in browser...
timeout /t 2 /nobreak >nul
start http://localhost:3001

echo.
echo ========================================
echo [SUCCESS] ClientForge CRM is starting!
echo ========================================
echo.
echo Backend API:  http://localhost:3000/api
echo Frontend UI:  http://localhost:3001
echo.
echo The application should open in your browser automatically.
echo.
echo Both servers are running in separate minimized windows:
echo   - "ClientForge Backend API"
echo   - "ClientForge Frontend UI"
echo.
echo To stop the servers:
echo   1. Close the minimized windows, OR
echo   2. Run: taskkill /F /IM node.exe
echo.
echo ========================================
echo.
echo Press any key to close this launcher window...
pause >nul
