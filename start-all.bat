@echo off
REM ============================================
REM ClientForge CRM - Complete Startup Script
REM ============================================
REM This script starts all services needed to run the app
REM Backend: http://localhost:3000
REM Frontend: http://localhost:3001 (if available)
REM ============================================

setlocal enabledelayedexpansion

echo.
echo ====================================================
echo   ClientForge CRM - Starting All Services
echo ====================================================
echo.

REM Check if Docker is running
echo [1/7] Checking Docker...
docker info >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo ERROR: Docker is not running!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)
echo     [OK] Docker is running!

REM Check if docker-compose is available
echo.
echo [2/7] Checking docker-compose...
docker compose version >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set COMPOSE_CMD=docker compose
    echo     [OK] Docker Compose V2 detected
) else (
    docker-compose --version >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set COMPOSE_CMD=docker-compose
        echo     [OK] Docker Compose V1 detected
    ) else (
        echo ERROR: docker-compose not found!
        echo Please install docker-compose and try again.
        pause
        exit /b 1
    )
)

REM Check for .env file
echo.
echo [3/7] Checking environment configuration...
if not exist ".env" (
    echo WARNING: No .env file found!
    echo Copying from .env.example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo     [OK] Created .env from .env.example
        echo     IMPORTANT: Please update .env with your credentials!
        timeout /t 3 /nobreak >nul
    ) else (
        echo WARNING: .env.example not found either!
        echo The app will use docker-compose.yml default values.
        echo For production, create a .env file with your configuration.
        timeout /t 3 /nobreak >nul
    )
) else (
    echo     [OK] .env file found!
)

REM Stop any existing containers
echo.
echo [4/7] Stopping any existing containers...
%COMPOSE_CMD% down 2>nul
echo     [OK] Cleaned up existing containers!

REM Start core infrastructure services first
echo.
echo [5/7] Starting core infrastructure services...
echo     This may take 30-60 seconds on first run...
echo.
echo     Starting: PostgreSQL, MongoDB, Redis, Elasticsearch, RabbitMQ
%COMPOSE_CMD% up -d postgres mongodb redis elasticsearch rabbitmq

REM Wait for core services
echo.
echo [6/7] Waiting for core services to initialize...
timeout /t 15 /nobreak >nul

REM Check core service health
echo.
echo     Checking core service health...

set ALL_HEALTHY=1

docker ps --filter "name=postgres" --filter "status=running" | find "postgres" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] PostgreSQL is running on port 5432
) else (
    echo     [WARN] PostgreSQL may not be ready yet
    set ALL_HEALTHY=0
)

docker ps --filter "name=mongodb" --filter "status=running" | find "mongo" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] MongoDB is running on port 27017
) else (
    echo     [WARN] MongoDB may not be ready yet
    set ALL_HEALTHY=0
)

docker ps --filter "name=redis" --filter "status=running" | find "redis" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] Redis is running on port 6379
) else (
    echo     [WARN] Redis may not be ready yet
    set ALL_HEALTHY=0
)

docker ps --filter "name=elasticsearch" --filter "status=running" | find "elasticsearch" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] Elasticsearch is running on port 9200
) else (
    echo     [WARN] Elasticsearch may not be ready yet
    set ALL_HEALTHY=0
)

docker ps --filter "name=rabbitmq" --filter "status=running" | find "rabbitmq" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo     [OK] RabbitMQ is running on port 5672
) else (
    echo     [WARN] RabbitMQ may not be ready yet
    set ALL_HEALTHY=0
)

if !ALL_HEALTHY! equ 0 (
    echo.
    echo     [INFO] Some services need more time to initialize.
    echo     Waiting an additional 10 seconds...
    timeout /t 10 /nobreak >nul
)

REM Ask about optional services
echo.
echo [7/7] Optional Services
echo.
set /p START_MONITORING="Do you want to start monitoring services (Prometheus, Grafana, Loki)? (y/n): "
if /i "!START_MONITORING!"=="y" (
    echo     Starting monitoring stack...
    %COMPOSE_CMD% up -d prometheus grafana loki promtail alertmanager
    echo     [OK] Monitoring services started
    echo     Grafana: http://localhost:3030
    echo     Prometheus: http://localhost:9090
)

set /p START_STORAGE="Do you want to start MinIO (S3 storage)? (y/n): "
if /i "!START_STORAGE!"=="y" (
    echo     Starting MinIO...
    %COMPOSE_CMD% up -d minio
    echo     [OK] MinIO started on http://localhost:9001
)

echo.
echo ====================================================
echo   Services Started Successfully!
echo ====================================================
echo.
echo Core Service URLs:
echo   PostgreSQL:     localhost:5432
echo   MongoDB:        localhost:27017
echo   Redis:          localhost:6379
echo   Elasticsearch:  http://localhost:9200
echo   RabbitMQ:       http://localhost:15672
echo.
echo Application URLs (after starting backend/frontend):
echo   Backend API:    http://localhost:3000
echo   Frontend UI:    http://localhost:3001
echo.
echo Management Commands:
echo   View logs:      %COMPOSE_CMD% logs -f [service-name]
echo   Stop all:       %COMPOSE_CMD% down
echo   Restart:        %COMPOSE_CMD% restart [service-name]
echo   Check status:   docker ps
echo.
echo ====================================================
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo WARNING: Node.js not found in PATH!
    echo Please install Node.js to run the backend/frontend.
    echo.
    pause
    exit /b 0
)

REM Ask user if they want to start backend now
set /p START_BACKEND="Do you want to start the backend now? (y/n): "
if /i "!START_BACKEND!"=="y" (
    echo.
    echo Checking npm dependencies...

    REM Check if node_modules exists
    if not exist "node_modules" (
        echo Installing dependencies (this may take a few minutes)...
        call npm install
        if !ERRORLEVEL! neq 0 (
            echo ERROR: Failed to install dependencies!
            pause
            exit /b 1
        )
    )

    echo Starting backend in a new window...
    start "ClientForge Backend" cmd /k "npm run dev:backend"

    echo.
    echo Waiting for backend to initialize...
    timeout /t 5 /nobreak >nul

    set /p START_FRONTEND="Do you want to start the frontend now? (y/n): "
    if /i "!START_FRONTEND!"=="y" (
        if exist "frontend" (
            echo Starting frontend in a new window...
            start "ClientForge Frontend" cmd /k "cd frontend && npm install && npm run dev"
            echo.
            echo [OK] Frontend starting... Wait 20-30 seconds for it to be ready.
        ) else (
            echo WARNING: frontend directory not found!
            echo Skipping frontend startup.
        )
    )
)

echo.
echo ====================================================
echo   All Done!
echo ====================================================
echo.
echo Services are running in the background.
echo.
echo To stop all services:
echo   %COMPOSE_CMD% down
echo.
echo To view this information again:
echo   type "docker ps" to see running containers
echo.
pause
