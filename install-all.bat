@echo off
REM =========================================
REM ClientForge CRM - Install All Dependencies
REM =========================================
REM Installs all npm dependencies for backend and frontend
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Install Dependencies
echo ========================================
echo.

REM Check Node.js version
echo [INFO] Checking Node.js version...
node --version
if errorlevel 1 (
    echo.
    echo [ERROR] Node.js is not installed or not in PATH!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

npm --version
if errorlevel 1 (
    echo.
    echo [ERROR] npm is not available!
    pause
    exit /b 1
)

echo.

REM Install root dependencies
echo [STEP 1/2] Installing root dependencies...
echo ========================================
call npm install --legacy-peer-deps
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install root dependencies!
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Root dependencies installed!
echo.

REM Install frontend dependencies
echo [STEP 2/2] Installing frontend dependencies...
echo ========================================
cd frontend
call npm install
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to install frontend dependencies!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo [SUCCESS] Frontend dependencies installed!
echo.

echo.
echo ========================================
echo [SUCCESS] All dependencies installed!
echo ========================================
echo.
echo You can now run:
echo   - start-backend.bat  (Backend only)
echo   - start-frontend.bat (Frontend only)
echo   - start-all.bat      (Both servers)
echo.
echo ========================================
echo.
pause
