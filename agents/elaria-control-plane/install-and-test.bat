@echo off
echo.
echo ============================================
echo   Elaria Control Plane - Setup
echo ============================================
echo.

cd /d D:\clientforge-crm\agents\elaria-control-plane

echo [1/3] Installing dependencies...
call npm install

echo.
echo [2/3] Testing connection...
node test-elaria.js

echo.
echo [3/3] Setup complete!
echo.
pause
