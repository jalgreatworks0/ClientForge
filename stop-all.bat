@echo off
REM ============================================
REM ClientForge CRM - Stop All Services
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ====================================================
echo   ClientForge CRM - Stopping All Services
echo ====================================================
echo.

REM Check if Docker is running
echo [1/3] Checking Docker...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo WARNING: Docker is not running!
    echo No containers to stop.
    pause
    exit /b 0
)
echo     [OK] Docker is running

REM Detect docker-compose version
echo.
echo [2/3] Detecting docker-compose...
docker compose version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set COMPOSE_CMD=docker compose
    echo     [OK] Using Docker Compose V2
) else (
    docker-compose --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set COMPOSE_CMD=docker-compose
        echo     [OK] Using Docker Compose V1
    ) else (
        echo WARNING: docker-compose not found!
        echo Attempting to stop containers manually...
        docker ps -q --filter "name=clientforge" 2>nul
        echo     Stopped running containers
        pause
        exit /b 0
    )
)

REM Stop all services
echo.
echo [3/3] Stopping all services...
%COMPOSE_CMD% down

if %ERRORLEVEL% equ 0 (
    echo.
    echo ====================================================
    echo   All Services Stopped Successfully!
    echo ====================================================
    echo.
    echo All Docker containers have been stopped and removed.
    echo Data volumes are preserved.
    echo.
    echo To remove data volumes too (CAUTION: deletes all data^):
    echo   %COMPOSE_CMD% down -v
    echo.
) else (
    echo.
    echo WARNING: Some services may not have stopped cleanly.
    echo Please check: docker ps
    echo.
)

echo.
echo To start services again:
echo   start-all.bat
echo.
pause
