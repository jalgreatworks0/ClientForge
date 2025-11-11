# =====================================================
# ClientForge CRM - Post-Reorganization Verifier
# =====================================================
# Verifies system health after safe reroute & reorg
# Usage: .\scripts\verify\post-reorg-verify.ps1
# =====================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "🔍 Post-Reorg Verification" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$errors = @()
$warnings = @()

# =====================================================
# 1. Port Checks
# =====================================================
Write-Host "[1/8] Checking Service Ports..." -ForegroundColor Yellow

$ports = @{
    "Backend API" = 3000
    "Frontend Dev" = 3001
    "PostgreSQL" = 5432
    "MongoDB" = 27017
    "Redis" = 6379
    "Elasticsearch" = 9200
}

foreach ($service in $ports.Keys) {
    $port = $ports[$service]
    $listening = netstat -ano | Select-String ":$port " | Select-String "LISTENING"

    if ($listening) {
        Write-Host "  ✅ $service (Port $port)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $service (Port $port) NOT LISTENING" -ForegroundColor Red
        $errors += "$service not running on port $port"
    }
}

Write-Host ""

# =====================================================
# 2. Health Endpoint Check
# =====================================================
Write-Host "[2/8] Checking Backend Health..." -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000/api/v1/health" -UseBasicParsing -TimeoutSec 5

    if ($response.StatusCode -eq 200) {
        Write-Host "  ✅ /api/v1/health → 200 OK" -ForegroundColor Green

        $healthData = $response.Content | ConvertFrom-Json
        Write-Host "    Status: $($healthData.data.status)" -ForegroundColor Gray
        Write-Host "    Environment: $($healthData.data.environment)" -ForegroundColor Gray
    } else {
        Write-Host "  ❌ /api/v1/health → $($response.StatusCode)" -ForegroundColor Red
        $errors += "Health endpoint returned $($response.StatusCode)"
    }
} catch {
    Write-Host "  ❌ Backend not responding" -ForegroundColor Red
    $errors += "Backend health check failed: $($_.Exception.Message)"
}

Write-Host ""

# =====================================================
# 3. Metrics Endpoint Check
# =====================================================
Write-Host "[3/8] Checking Metrics..." -ForegroundColor Yellow

try {
    $metricsResponse = Invoke-WebRequest -Uri "http://localhost:3000/metrics" -UseBasicParsing -TimeoutSec 5

    if ($metricsResponse.StatusCode -eq 200) {
        $metricsLines = ($metricsResponse.Content -split "`n").Count
        Write-Host "  ✅ /metrics → 200 OK ($metricsLines metrics)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠️  /metrics → $($metricsResponse.StatusCode)" -ForegroundColor Yellow
        $warnings += "Metrics endpoint returned $($metricsResponse.StatusCode)"
    }
} catch {
    Write-Host "  ⚠️  Metrics endpoint unavailable" -ForegroundColor Yellow
    $warnings += "Metrics check failed (non-critical)"
}

Write-Host ""

# =====================================================
# 4. Queue Health Check
# =====================================================
Write-Host "[4/8] Checking Queue System..." -ForegroundColor Yellow

try {
    # Check if queue health script exists
    if (Test-Path "scripts\queue\check-queue-health.ts") {
        $queueHealth = npx tsx scripts\queue\check-queue-health.ts 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✅ Queue system healthy" -ForegroundColor Green
        } else {
            Write-Host "  ⚠️  Queue system issues detected" -ForegroundColor Yellow
            $warnings += "Queue health check reported issues"
        }
    } else {
        Write-Host "  ⚠️  Queue health script not found" -ForegroundColor Yellow
        $warnings += "Queue health script missing"
    }
} catch {
    Write-Host "  ⚠️  Queue health check failed" -ForegroundColor Yellow
    $warnings += "Queue check failed: $($_.Exception.Message)"
}

Write-Host ""

# =====================================================
# 5. Elasticsearch Alias Check
# =====================================================
Write-Host "[5/8] Checking Elasticsearch Aliases..." -ForegroundColor Yellow

try {
    $esResponse = Invoke-WebRequest -Uri "http://localhost:9200/_cat/aliases?format=json" -UseBasicParsing -TimeoutSec 5

    if ($esResponse.StatusCode -eq 200) {
        $aliases = $esResponse.Content | ConvertFrom-Json
        $aliasCount = ($aliases | Measure-Object).Count

        Write-Host "  ✅ Elasticsearch responding ($aliasCount aliases)" -ForegroundColor Green

        # Check for tenant aliases
        $tenantAliases = $aliases | Where-Object { $_.alias -like "*-alias" }
        if ($tenantAliases) {
            Write-Host "    Tenant aliases: $($tenantAliases.Count)" -ForegroundColor Gray
        }
    } else {
        Write-Host "  ❌ Elasticsearch returned $($esResponse.StatusCode)" -ForegroundColor Red
        $errors += "Elasticsearch health check failed"
    }
} catch {
    Write-Host "  ❌ Elasticsearch not responding" -ForegroundColor Red
    $errors += "Elasticsearch check failed: $($_.Exception.Message)"
}

Write-Host ""

# =====================================================
# 6. Module System Check
# =====================================================
Write-Host "[6/8] Checking Module System..." -ForegroundColor Yellow

$moduleFiles = @(
    "backend\core\modules\ModuleRegistry.ts"
    "backend\core\modules\ModuleContract.ts"
    "backend\core\modules\EventBus.ts"
    "backend\core\modules\FeatureFlags.ts"
)

$modulesMissing = @()
foreach ($file in $moduleFiles) {
    if (Test-Path $file) {
        Write-Host "  ✅ $(Split-Path $file -Leaf)" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $(Split-Path $file -Leaf) MISSING" -ForegroundColor Red
        $modulesMissing += $file
    }
}

if ($modulesMissing.Count -gt 0) {
    $errors += "Missing module system files: $($modulesMissing -join ', ')"
}

Write-Host ""

# =====================================================
# 7. Import Path Verification
# =====================================================
Write-Host "[7/8] Checking Critical Import Paths..." -ForegroundColor Yellow

# Check for broken imports (common issue after reorg)
try {
    # TypeScript check
    Push-Location backend
    $tscCheck = npx tsc --noEmit 2>&1
    Pop-Location

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✅ TypeScript compilation check passed" -ForegroundColor Green
    } else {
        Write-Host "  ❌ TypeScript errors detected" -ForegroundColor Red
        $errors += "TypeScript compilation failed"
        Write-Host "    Run 'npm run typecheck' for details" -ForegroundColor Gray
    }
} catch {
    Write-Host "  ⚠️  TypeScript check skipped" -ForegroundColor Yellow
    $warnings += "Could not run TypeScript check"
}

Write-Host ""

# =====================================================
# 8. Directory Structure Check
# =====================================================
Write-Host "[8/8] Checking Core Directories..." -ForegroundColor Yellow

$coreDirs = @(
    "backend\core\modules"
    "backend\modules"
    "backend\middleware\search"
    "database\migrations"
    "config\security"
    "infrastructure\nginx"
    "archive\reorg_20251111"
)

$dirsMissing = @()
foreach ($dir in $coreDirs) {
    if (Test-Path $dir) {
        Write-Host "  ✅ $dir\" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $dir\ MISSING" -ForegroundColor Red
        $dirsMissing += $dir
    }
}

if ($dirsMissing.Count -gt 0) {
    $errors += "Missing directories: $($dirsMissing -join ', ')"
}

Write-Host ""

# =====================================================
# Summary
# =====================================================
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "📊 Verification Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if ($errors.Count -eq 0 -and $warnings.Count -eq 0) {
    Write-Host "✅ ALL CHECKS PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "System Status: HEALTHY" -ForegroundColor Green
    exit 0
} elseif ($errors.Count -eq 0) {
    Write-Host "⚠️  $($warnings.Count) WARNINGS DETECTED" -ForegroundColor Yellow
    Write-Host ""
    foreach ($warning in $warnings) {
        Write-Host "  ⚠️  $warning" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "System Status: OPERATIONAL (with warnings)" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ $($errors.Count) ERRORS DETECTED" -ForegroundColor Red
    Write-Host ""
    foreach ($error in $errors) {
        Write-Host "  ❌ $error" -ForegroundColor Red
    }

    if ($warnings.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️  $($warnings.Count) WARNINGS:" -ForegroundColor Yellow
        foreach ($warning in $warnings) {
            Write-Host "  ⚠️  $warning" -ForegroundColor Yellow
        }
    }

    Write-Host ""
    Write-Host "System Status: DEGRADED" -ForegroundColor Red
    Write-Host ""
    Write-Host "Recommended Actions:" -ForegroundColor Cyan
    Write-Host "  1. Run 'npm run dev:backend' to start backend" -ForegroundColor Gray
    Write-Host "  2. Check Docker Desktop for database services" -ForegroundColor Gray
    Write-Host "  3. Review error messages above for specific issues" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
