@echo off
REM =========================================
REM ClientForge CRM - Clean Restart
REM =========================================
REM Kills all Node.js processes and restarts
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Clean Restart
echo ========================================
echo.
echo This will kill all running Node.js processes
echo and restart the backend server with fresh configuration.
echo.
echo ========================================
echo.

REM Kill all Node.js processes
echo [INFO] Stopping all Node.js processes...
taskkill /F /IM node.exe >NUL 2>&1
if %ERRORLEVEL%==0 (
    echo [SUCCESS] Node.js processes terminated
) else (
    echo [INFO] No Node.js processes were running
)

REM Wait a moment for processes to fully terminate
timeout /t 2 /nobreak >nul

REM Clear any TypeScript cache
echo [INFO] Clearing TypeScript build cache...
cd /d "%~dp0..\.."
if exist ".tsbuildinfo" del .tsbuildinfo
if exist "tsconfig.tsbuildinfo" del tsconfig.tsbuildinfo
if exist "dist" rmdir /s /q dist 2>nul

echo.
echo [SUCCESS] Clean restart preparation complete!
echo.
echo ========================================
echo Now starting backend server...
echo ========================================
echo.

REM Start the backend
call "%~dp0start-backend.bat"
