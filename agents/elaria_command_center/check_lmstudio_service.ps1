# Quick LM Studio Service Check
# Location: D:\ClientForge\03_BOTS\elaria_command_center\check_lmstudio_service.ps1

Write-Host "Checking LM Studio service..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:1234/v1/models" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "SUCCESS - LM Studio is running on port 1234" -ForegroundColor Green
    Write-Host "Models available: $($response.data.Count)" -ForegroundColor Gray
    Write-Host ""

    if ($response.data.Count -gt 0) {
        Write-Host "Loaded models:" -ForegroundColor Cyan
        $response.data | ForEach-Object {
            Write-Host "  - $($_.id)" -ForegroundColor White
        }
    }

    Write-Host ""
    Write-Host "Service is ready!" -ForegroundColor Green
} catch {
    Write-Host "ERROR - LM Studio service is not running" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the service:" -ForegroundColor Yellow
    Write-Host "  1. Open LM Studio application" -ForegroundColor White
    Write-Host "  2. Or run: lms server start --port 1234" -ForegroundColor White
    Write-Host ""
}
