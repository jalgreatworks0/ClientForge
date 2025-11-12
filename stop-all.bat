@echo off
REM ============================================
REM ClientForge CRM - Stop All Services
REM ============================================

echo.
echo ====================================================
echo   ClientForge CRM - Stopping All Services
echo ====================================================
echo.

echo Stopping Docker containers...
docker-compose down

echo.
echo Stopping any Node.js processes...
taskkill /F /IM node.exe 2>nul
if %ERRORLEVEL% equ 0 (
    echo Node.js processes stopped.
) else (
    echo No Node.js processes found.
)

echo.
echo ====================================================
echo All services stopped successfully!
echo ====================================================
echo.
pause
