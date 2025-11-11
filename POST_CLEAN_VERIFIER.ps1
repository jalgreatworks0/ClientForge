# =====================================================
# ClientForge CRM - Post-Cleanup Verification Script
# =====================================================
# Verifies repository structure after cleanup
# Usage: .\POST_CLEAN_VERIFIER.ps1
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🧠 ClientForge CRM Structure Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Run this script from the ClientForge CRM root directory" -ForegroundColor Red
    exit 1
}

Write-Host "[1/6] Checking Core Directories..." -ForegroundColor Yellow
$coreDirs = @("backend", "frontend", "docs", "config", "database", "scripts")
$missing = @()

foreach ($dir in $coreDirs) {
    if (Test-Path $dir) {
        Write-Host "  ✅ $dir/" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dir/ MISSING" -ForegroundColor Red
        $missing += $dir
    }
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "❌ Missing directories: $($missing -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/6] Checking Configuration Files..." -ForegroundColor Yellow
$configFiles = @(".env", "package.json", "tsconfig.json", ".gitignore")

foreach ($file in $configFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "  ✅ $file ($([math]::Round($size/1KB, 1)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file MISSING" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[3/6] Checking Documentation..." -ForegroundColor Yellow
$docs = @("backend/README.md", "frontend/README.md", "docs/INDEX.md", "CLEANUP_REPORT.md")

foreach ($doc in $docs) {
    if (Test-Path $doc) {
        $size = (Get-Item $doc).Length
        Write-Host "  ✅ $doc ($([math]::Round($size/1KB, 1)) KB)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  $doc missing (optional)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[4/6] Checking for Orphaned Files..." -ForegroundColor Yellow
$orphaned = @()

if (Test-Path "agents/.tsbuildinfo") {
    $orphaned += "agents/.tsbuildinfo"
}

$mapFiles = Get-ChildItem "config" -Recurse -Filter "*.map" -ErrorAction SilentlyContinue
if ($mapFiles) {
    $orphaned += "config/**/*.map ($($mapFiles.Count) files)"
}

if ($orphaned.Count -eq 0) {
    Write-Host "  ✅ No orphaned build files found" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Found orphaned files:" -ForegroundColor Yellow
    foreach ($file in $orphaned) {
        Write-Host "    - $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[5/6] Checking Server Health..." -ForegroundColor Yellow

# Check if backend is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ Backend API responding (Port 3000)" -ForegroundColor Green
        $healthData = $response.Content | ConvertFrom-Json
        Write-Host "    Status: $($healthData.data.status)" -ForegroundColor Gray
        Write-Host "    Environment: $($healthData.data.environment)" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  Backend not responding (Run 'npm run dev:backend')" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[6/6] Directory Tree (Core Structure)..." -ForegroundColor Yellow
Write-Host ""

# Display tree for core directories
tree /f /a | findstr /C:"backend" /C:"frontend" /C:"docs" /C:"config"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Count files in key directories
$backendFiles = (Get-ChildItem "backend" -Recurse -File | Measure-Object).Count
$frontendFiles = (Get-ChildItem "frontend" -Recurse -File | Measure-Object).Count
$docsFiles = (Get-ChildItem "docs" -Recurse -File -Filter "*.md" | Measure-Object).Count

Write-Host "Backend Files:    $backendFiles" -ForegroundColor White
Write-Host "Frontend Files:   $frontendFiles" -ForegroundColor White
Write-Host "Documentation:    $docsFiles markdown files" -ForegroundColor White

# Calculate total size of key directories
$backendSize = (Get-ChildItem "backend" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
$frontendSize = (Get-ChildItem "frontend" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
$docsSize = (Get-ChildItem "docs" -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Host "Backend Size:     $([math]::Round($backendSize, 2)) MB" -ForegroundColor White
Write-Host "Frontend Size:    $([math]::Round($frontendSize, 2)) MB" -ForegroundColor White
Write-Host "Docs Size:        $([math]::Round($docsSize, 2)) MB" -ForegroundColor White

Write-Host ""
Write-Host "✅ ClientForge CRM Structure OK" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Run 'npm run dev:backend' to start the backend"  -ForegroundColor Gray
Write-Host "  2. Visit http://localhost:3000/api/v1/health" -ForegroundColor Gray
Write-Host "  3. Review CLEANUP_REPORT.md for details" -ForegroundColor Gray
Write-Host ""
