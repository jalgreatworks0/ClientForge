# ClientForge CRM - Development Environment Startup Script
# Run this after Docker Desktop is running

Write-Host "🚀 Starting ClientForge CRM Development Environment..." -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker..." -ForegroundColor Yellow
$dockerRunning = docker info 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker is not running!" -ForegroundColor Red
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    exit 1
}
Write-Host "✅ Docker is running" -ForegroundColor Green
Write-Host ""

# Start database services
Write-Host "Starting database services (PostgreSQL, Redis, MongoDB)..." -ForegroundColor Yellow
docker compose up -d postgres redis mongodb

Write-Host ""
Write-Host "Waiting for databases to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

# Check service status
Write-Host ""
Write-Host "Checking service status..." -ForegroundColor Yellow
docker compose ps

Write-Host ""
Write-Host "Verifying PostgreSQL connection..." -ForegroundColor Yellow
$pgReady = docker compose exec postgres pg_isready -U crm 2>&1
if ($pgReady -like "*accepting connections*") {
    Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️  PostgreSQL is still initializing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Verifying Redis connection..." -ForegroundColor Yellow
$redisReady = docker compose exec redis redis-cli ping 2>&1
if ($redisReady -like "*PONG*") {
    Write-Host "✅ Redis is ready" -ForegroundColor Green
} else {
    Write-Host "⚠️  Redis is still initializing..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🎉 Development Environment Ready!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Service Endpoints:" -ForegroundColor Cyan
Write-Host "  PostgreSQL: localhost:5432 (user: crm, password: password)" -ForegroundColor White
Write-Host "  Redis:      localhost:6379" -ForegroundColor White
Write-Host "  MongoDB:    localhost:27017" -ForegroundColor White
Write-Host ""
Write-Host "🌐 Backend API: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  Health:  http://localhost:3000/api/v1/health" -ForegroundColor White
Write-Host "  Swagger: http://localhost:3000/api/docs (if enabled)" -ForegroundColor White
Write-Host ""
Write-Host "📝 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Run database migrations: npm run db:migrate" -ForegroundColor White
Write-Host "  2. Start backend: npm run dev:backend (if not running)" -ForegroundColor White
Write-Host "  3. Start frontend: npm run dev:frontend" -ForegroundColor White
Write-Host "  4. Login: admin@clientforge.com / admin123" -ForegroundColor White
Write-Host ""
Write-Host "🛠️  Tools:" -ForegroundColor Cyan
Write-Host "  DBeaver:         C:\Program Files\DBeaver\dbeaver.exe" -ForegroundColor White
Write-Host "  Postman:         Start Menu → Postman" -ForegroundColor White
Write-Host "  MongoDB Compass: Start Menu → MongoDB Compass" -ForegroundColor White
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "  Setup Guide:  .\DOCKER_SETUP_GUIDE.md" -ForegroundColor White
Write-Host "  Build Guide:  .\docs\BUILD_GUIDE_FOUNDATION.md" -ForegroundColor White
Write-Host "  README:       .\README.md" -ForegroundColor White
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Green
