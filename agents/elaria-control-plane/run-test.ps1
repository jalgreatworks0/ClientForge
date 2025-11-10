# Run Elaria Control Plane Tests
Set-Location "D:\clientforge-crm\agents\elaria-control-plane"

Write-Host "[INFO] Running Elaria Control Plane Tests..." -ForegroundColor Cyan
Write-Host ""

# Run tests
node test-elaria.js

Write-Host ""
Write-Host "[INFO] Tests complete. Press any key to continue..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
