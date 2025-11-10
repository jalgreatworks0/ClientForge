# ClientForge CRM - Development Environment Reset Script
# WARNING: This will delete ALL data in your development databases!

Write-Host "⚠️  ClientForge CRM - Environment Reset" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""
Write-Host "This will:" -ForegroundColor Yellow
Write-Host "  1. Stop all Docker containers" -ForegroundColor White
Write-Host "  2. Delete all database volumes (ALL DATA WILL BE LOST!)" -ForegroundColor White
Write-Host "  3. Restart containers" -ForegroundColor White
Write-Host "  4. Run fresh migrations" -ForegroundColor White
Write-Host ""

$confirmation = Read-Host "Are you sure? Type 'YES' to continue"

if ($confirmation -ne "YES") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "🛑 Stopping all containers..." -ForegroundColor Yellow
docker compose down -v

Write-Host ""
Write-Host "🔄 Starting fresh containers..." -ForegroundColor Yellow
docker compose up -d postgres redis mongodb

Write-Host ""
Write-Host "⏳ Waiting for databases to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "📊 Running migrations..." -ForegroundColor Yellow
.\run-migrations.ps1

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "✅ Environment Reset Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Fresh databases are ready with:" -ForegroundColor Cyan
Write-Host "  - Clean schema" -ForegroundColor White
Write-Host "  - Default admin user" -ForegroundColor White
Write-Host "  - No existing data" -ForegroundColor White
Write-Host ""
Write-Host "Login with:" -ForegroundColor Cyan
Write-Host "  Email:    admin@clientforge.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host ""
