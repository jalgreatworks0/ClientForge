@echo off
REM ============================================
REM ClientForge CRM - Complete Startup Script
REM ============================================
REM This script starts all services needed to run the app
REM Backend: http://localhost:3000
REM Frontend: http://localhost:3001 (if available)
REM ============================================

echo.
echo ====================================================
echo   ClientForge CRM - Starting All Services
echo ====================================================
echo.

REM Check if Docker is running
echo [1/6] Checking Docker...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo     Docker is running!

REM Check if docker-compose is available
echo.
echo [2/6] Checking docker-compose...
docker-compose --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: docker-compose not found!
    echo Please install docker-compose and try again.
    pause
    exit /b 1
)
echo     docker-compose is available!

REM Stop any existing containers
echo.
echo [3/6] Stopping any existing containers...
docker-compose down 2>nul
echo     Cleaned up existing containers!

REM Check for .env file
echo.
echo [4/6] Checking environment configuration...
if not exist ".env" (
    echo WARNING: No .env file found!
    echo The app will use docker-compose.yml default values.
    echo For production, create a .env file with your configuration.
    timeout /t 3 /nobreak >nul
)
echo     Environment check complete!

REM Start all Docker services
echo.
echo [5/6] Starting Docker services (PostgreSQL, MongoDB, Redis, Elasticsearch)...
echo     This may take a minute on first run...
docker-compose up -d postgres mongodb redis elasticsearch

REM Wait for services to be ready
echo.
echo [6/6] Waiting for services to initialize...
echo     PostgreSQL: Port 5432
echo     MongoDB: Port 27017
echo     Redis: Port 6379
echo     Elasticsearch: Port 9200

timeout /t 10 /nobreak >nul

REM Check service health
echo.
echo     Checking service health...

docker ps --filter "name=postgres" --filter "status=running" | find "postgres" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] PostgreSQL is running
) else (
    echo     [!!] PostgreSQL may not be ready yet
)

docker ps --filter "name=mongodb" --filter "status=running" | find "mongo" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] MongoDB is running
) else (
    echo     [!!] MongoDB may not be ready yet
)

docker ps --filter "name=redis" --filter "status=running" | find "redis" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] Redis is running
) else (
    echo     [!!] Redis may not be ready yet
)

docker ps --filter "name=elasticsearch" --filter "status=running" | find "elasticsearch" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] Elasticsearch is running
) else (
    echo     [!!] Elasticsearch may not be ready yet
)

echo.
echo ====================================================
echo   Services Started Successfully!
echo ====================================================
echo.
echo Next Steps:
echo   1. Start the backend:  npm run dev:backend
echo   2. Start the frontend: cd frontend ^&^& npm run dev
echo.
echo Or use separate windows:
echo   - Backend:  start cmd /k "npm run dev:backend"
echo   - Frontend: start cmd /k "cd frontend && npm run dev"
echo.
echo Service URLs:
echo   Backend API:  http://localhost:3000
echo   Frontend UI:  http://localhost:3001
echo   PostgreSQL:   localhost:5432
echo   MongoDB:      localhost:27017
echo   Redis:        localhost:6379
echo   Elasticsearch: localhost:9200
echo.
echo To view logs:  docker-compose logs -f [service-name]
echo To stop all:   docker-compose down
echo.
echo ====================================================
echo.

REM Ask user if they want to start backend now
set /p START_BACKEND="Do you want to start the backend now? (y/n): "
if /i "%START_BACKEND%"=="y" (
    echo.
    echo Starting backend in a new window...
    start "ClientForge Backend" cmd /k "npm run dev:backend"
    timeout /t 2 /nobreak >nul

    set /p START_FRONTEND="Do you want to start the frontend now? (y/n): "
    if /i "%START_FRONTEND%"=="y" (
        echo Starting frontend in a new window...
        start "ClientForge Frontend" cmd /k "cd frontend && npm run dev"
    )
)

echo.
echo All done! Services are running in the background.
echo Close this window when you're ready.
pause
