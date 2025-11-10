# ClientForge CRM - Database Migration Script
# Runs all SQL migrations in backend/database/migrations/

Write-Host "🗄️  ClientForge CRM - Database Migration Tool" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "Checking Docker and PostgreSQL..." -ForegroundColor Yellow
$dockerRunning = docker compose ps postgres 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ PostgreSQL container is not running!" -ForegroundColor Red
    Write-Host "Run: docker compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

# Check if PostgreSQL is ready
$pgReady = docker compose exec postgres pg_isready -U crm 2>&1
if ($pgReady -notlike "*accepting connections*") {
    Write-Host "⚠️  PostgreSQL is not ready yet. Waiting..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
}

Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green
Write-Host ""

# Get all migration files
$migrationFiles = Get-ChildItem -Path "backend\database\migrations\" -Filter "*.sql" | Sort-Object Name

if ($migrationFiles.Count -eq 0) {
    Write-Host "⚠️  No migration files found in backend/database/migrations/" -ForegroundColor Yellow
    exit 0
}

Write-Host "Found $($migrationFiles.Count) migration file(s):" -ForegroundColor Cyan
foreach ($file in $migrationFiles) {
    Write-Host "  - $($file.Name)" -ForegroundColor White
}
Write-Host ""

# Run each migration
$successCount = 0
$failCount = 0

foreach ($file in $migrationFiles) {
    Write-Host "Running migration: $($file.Name)..." -ForegroundColor Yellow

    # Copy migration file to container
    docker cp "backend\database\migrations\$($file.Name)" clientforge-crm-postgres-1:/tmp/migration.sql 2>&1 | Out-Null

    # Execute migration
    $result = docker compose exec -T postgres psql -U crm -d clientforge -f /tmp/migration.sql 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ Success: $($file.Name)" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "  ❌ Failed: $($file.Name)" -ForegroundColor Red
        Write-Host "  Error: $result" -ForegroundColor Red
        $failCount++
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migration Summary:" -ForegroundColor Cyan
Write-Host "  ✅ Successful: $successCount" -ForegroundColor Green
Write-Host "  ❌ Failed:     $failCount" -ForegroundColor $(if ($failCount -gt 0) { "Red" } else { "White" })
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verify tables were created
Write-Host "Verifying database tables..." -ForegroundColor Yellow
$tables = docker compose exec -T postgres psql -U crm -d clientforge -c "\dt" 2>&1

if ($tables -like "*tenants*") {
    Write-Host "✅ Database schema created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Tables created:" -ForegroundColor Cyan
    docker compose exec -T postgres psql -U crm -d clientforge -c "\dt"
} else {
    Write-Host "⚠️  Schema verification failed. Check migration errors above." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "📊 Database Info:" -ForegroundColor Cyan
Write-Host "  Host:     localhost" -ForegroundColor White
Write-Host "  Port:     5432" -ForegroundColor White
Write-Host "  Database: clientforge" -ForegroundColor White
Write-Host "  User:     crm" -ForegroundColor White
Write-Host "  Password: password" -ForegroundColor White
Write-Host ""
Write-Host "🔐 Default Admin Login:" -ForegroundColor Cyan
Write-Host "  Email:    admin@clientforge.com" -ForegroundColor White
Write-Host "  Password: admin123" -ForegroundColor White
Write-Host "  ⚠️  CHANGE THIS IN PRODUCTION!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Done! 🎉" -ForegroundColor Green
