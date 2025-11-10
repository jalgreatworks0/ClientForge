# Quick Backend Diagnostic Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " ClientForge Backend Diagnostics" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Check if backend is running on port 3000
Write-Host "[1] Checking port 3000..." -ForegroundColor Yellow
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($port3000) {
    Write-Host "    ✅ Something is listening on port 3000" -ForegroundColor Green
    Write-Host "    Process ID: $($port3000.OwningProcess)" -ForegroundColor Gray
} else {
    Write-Host "    ❌ Nothing listening on port 3000" -ForegroundColor Red
    Write-Host "    Backend server is NOT running!" -ForegroundColor Red
}

# Check Node.js processes
Write-Host "`n[2] Node.js processes running:" -ForegroundColor Yellow
$nodeProcesses = Get-Process node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "    Found $($nodeProcesses.Count) Node.js processes" -ForegroundColor Gray
    $nodeProcesses | Select-Object Id, @{Name="Memory(MB)";Expression={[math]::Round($_.WS/1MB,2)}}, Path | Format-Table -AutoSize
} else {
    Write-Host "    ❌ No Node.js processes running" -ForegroundColor Red
}

# Test backend health endpoint
Write-Host "`n[3] Testing backend health endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -TimeoutSec 2 -ErrorAction Stop
    Write-Host "    ✅ Backend is responding!" -ForegroundColor Green
    Write-Host "    Status: $($response.StatusCode)" -ForegroundColor Gray
} catch {
    Write-Host "    ❌ Backend not responding" -ForegroundColor Red
    Write-Host "    Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Check PostgreSQL connection
Write-Host "`n[4] Checking PostgreSQL..." -ForegroundColor Yellow
$pgPort = Get-NetTCPConnection -LocalPort 5432 -ErrorAction SilentlyContinue
if ($pgPort) {
    Write-Host "    ✅ PostgreSQL is running on port 5432" -ForegroundColor Green
} else {
    Write-Host "    ⚠️  PostgreSQL not detected on port 5432" -ForegroundColor Yellow
}

# Check frontend (Vite)
Write-Host "`n[5] Checking frontend (Vite)..." -ForegroundColor Yellow
$vitePort = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
if ($vitePort) {
    Write-Host "    ✅ Frontend is running on port 3001" -ForegroundColor Green
} else {
    $vitePort = Get-NetTCPConnection -LocalPort 5173 -ErrorAction SilentlyContinue
    if ($vitePort) {
        Write-Host "    ✅ Frontend is running on port 5173" -ForegroundColor Green
    } else {
        Write-Host "    ⚠️  Frontend not detected" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " DIAGNOSIS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if (-not $port3000) {
    Write-Host "❌ BACKEND NOT RUNNING" -ForegroundColor Red
    Write-Host "`nTo start backend:" -ForegroundColor Yellow
    Write-Host "  cd D:\clientforge-crm" -ForegroundColor Gray
    Write-Host "  npm run dev:backend" -ForegroundColor Gray
    Write-Host "`nOr use the convenient script:" -ForegroundColor Yellow
    Write-Host "  .\start-backend.bat" -ForegroundColor Gray
} else {
    Write-Host "✅ Backend appears to be running" -ForegroundColor Green
    Write-Host "`nIf you're still getting 500 errors, check:" -ForegroundColor Yellow
    Write-Host "  1. Backend console for error messages" -ForegroundColor Gray
    Write-Host "  2. Database migrations: npm run db:migrate" -ForegroundColor Gray
    Write-Host "  3. PostgreSQL connection in .env file" -ForegroundColor Gray
}

Write-Host "`n========================================`n" -ForegroundColor Cyan
