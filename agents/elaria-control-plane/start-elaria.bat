@echo off
REM Elaria Control Plane - Quick Start Script
REM Location: D:\clientforge-crm\agents\elaria-control-plane

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║   ELARIA CONTROL PLANE - Quick Start                     ║
echo ║   CLI Interface for LM Studio                            ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "%~dp0"

REM Check if node_modules exists
if not exist "node_modules\" (
    echo [ERROR] Dependencies not installed!
    echo.
    echo Please run: npm install
    echo.
    pause
    exit /b 1
)

REM Check if LM Studio is running
echo [INFO] Checking LM Studio connection...
curl -s http://localhost:1234/v1/models > nul 2>&1

if %ERRORLEVEL% neq 0 (
    echo [WARNING] Cannot connect to LM Studio on http://localhost:1234
    echo.
    echo Make sure:
    echo   1. LM Studio is running
    echo   2. A model is loaded
    echo   3. Server is enabled on port 1234
    echo.
    echo Do you want to continue anyway? (Y/N^)
    choice /c YN /n
    if errorlevel 2 exit /b 1
)

echo.
echo [OK] Starting Elaria Control Plane...
echo.

REM Start in interactive mode
node index.js

pause
