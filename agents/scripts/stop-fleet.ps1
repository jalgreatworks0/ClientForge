# ClientForge CRM - Stop Ollama Fleet

Write-Host "Stopping Ollama Fleet..." -ForegroundColor Yellow

# Kill all Ollama processes
$ollamaProcesses = Get-Process | Where-Object { $_.ProcessName -like "ollama*" }

if ($ollamaProcesses) {
    foreach ($process in $ollamaProcesses) {
        Write-Host "  [OK] Stopping process: $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Cyan
        Stop-Process -Id $process.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Host "[SUCCESS] Fleet stopped" -ForegroundColor Green
} else {
    Write-Host "[INFO] No Ollama processes running" -ForegroundColor Gray
}

Write-Host ""
