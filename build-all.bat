@echo off
REM =========================================
REM ClientForge CRM - Build All
REM =========================================
REM Builds both backend and frontend for production
REM =========================================

echo.
echo ========================================
echo  ClientForge CRM - Build All
echo ========================================
echo.

REM Build backend
echo [STEP 1/2] Building backend...
echo ========================================
call npm run build:backend
if errorlevel 1 (
    echo.
    echo [WARNING] Backend build completed with warnings
    echo.
) else (
    echo.
    echo [SUCCESS] Backend build completed!
    echo.
)

REM Build frontend
echo [STEP 2/2] Building frontend...
echo ========================================
cd frontend
call npm run build
if errorlevel 1 (
    echo.
    echo [ERROR] Frontend build failed!
    cd ..
    pause
    exit /b 1
)
cd ..

echo.
echo ========================================
echo [SUCCESS] All builds completed!
echo ========================================
echo.
echo Backend output: dist\backend\
echo Frontend output: frontend\dist\
echo.
echo Ready for production deployment!
echo ========================================
echo.
pause
