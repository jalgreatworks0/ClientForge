@echo off
REM =========================================
REM ClientForge CRM - Full Stack Startup
REM =========================================
REM Starts both backend and frontend servers in separate windows
REM Backend: Port 3000
REM Frontend: Port 3001
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Full Stack Startup
echo ========================================
echo.
echo This will start both backend and frontend servers
echo in separate command windows.
echo.
echo Backend API: http://localhost:3000/api
echo Frontend UI: http://localhost:3001
echo.
echo ========================================
echo.

REM Change to project root directory
cd /d "%~dp0..\.."

REM Check if .env file exists
if not exist ".env" (
    echo [ERROR] .env file not found in %CD%!
    echo Please create .env file with required environment variables.
    echo See .env.example for reference.
    echo.
    pause
    exit /b 1
)

REM Start backend in a new window
echo [INFO] Starting backend server...
start "ClientForge Backend" cmd /k "cd /d %CD%\scripts\deployment && start-backend.bat"

REM Wait 3 seconds for backend to initialize
echo [INFO] Waiting for backend to initialize...
timeout /t 3 /nobreak >nul

REM Start frontend in a new window
echo [INFO] Starting frontend development server...
start "ClientForge Frontend" cmd /k "cd /d %CD%\scripts\deployment && start-frontend.bat"

REM Wait 5 seconds for frontend to fully initialize
echo [INFO] Waiting for frontend to initialize...
timeout /t 5 /nobreak >nul

REM Open browser to ClientForge UI
echo [INFO] Opening browser to http://localhost:3001...
start "" "http://localhost:3001"

echo.
echo ========================================
echo [SUCCESS] Both servers are running!
echo ========================================
echo.
echo Backend:  http://localhost:3000/api
echo Frontend: http://localhost:3001
echo.
echo Browser opened automatically to the UI.
echo Check the separate windows for server logs.
echo Close those windows to stop the servers.
echo.
echo ========================================
echo.
echo Press any key to close this window...
pause >nul
