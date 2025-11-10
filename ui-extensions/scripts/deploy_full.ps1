# Elaria ClientForge - Full Deployment Pipeline
# Runs: Tests → Build → Deploy

Write-Host ""
Write-Host "🚀 ============================================" -ForegroundColor Cyan
Write-Host "   CLIENTFORGE FULL DEPLOYMENT PIPELINE" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

Set-Location "D:\clientforge-crm"

# Stage 1: Type Check
Write-Host "[1/5] TypeScript Type Check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Type check failed" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Type check passed" -ForegroundColor Green
Write-Host ""

# Stage 2: Lint
Write-Host "[2/5] ESLint..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Lint failed" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Lint passed" -ForegroundColor Green
Write-Host ""

# Stage 3: Tests
Write-Host "[3/5] Running Tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ All tests passed" -ForegroundColor Green
Write-Host ""

# Stage 4: Build
Write-Host "[4/5] Building..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Build successful" -ForegroundColor Green
Write-Host ""

# Stage 5: Deploy (Example - modify for your deployment method)
Write-Host "[5/5] Deploying..." -ForegroundColor Yellow
Write-Host "→ Committing changes..." -ForegroundColor Gray
git add .
git commit -m "Deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -m "Automated deployment from Elaria Command Center"

Write-Host "→ Pushing to repository..." -ForegroundColor Gray
git push origin main
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deploy failed" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}
Write-Host "✓ Deployed successfully" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pipeline Results:" -ForegroundColor Yellow
Write-Host "  ✓ Type Check" -ForegroundColor Green
Write-Host "  ✓ Lint" -ForegroundColor Green
Write-Host "  ✓ Tests" -ForegroundColor Green
Write-Host "  ✓ Build" -ForegroundColor Green
Write-Host "  ✓ Deploy" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Application deployed to production" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to close"
