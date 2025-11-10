# LM Studio Network AI Server Setup
# Purpose: Configure 5090 as network-accessible AI server

param(
    [switch]$Start = $false,
    [switch]$Stop = $false,
    [switch]$Status = $false,
    [switch]$ShowIP = $false,
    [int]$Port = 1234
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  LM STUDIO NETWORK AI SERVER" -ForegroundColor Cyan
Write-Host "  NVIDIA RTX 5090 - 24GB VRAM" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Get local IP
try {
    $localIP = (Get-NetIPAddress -AddressFamily IPv4 |
        Where-Object {
            $_.InterfaceAlias -notlike "*Loopback*" -and
            $_.IPAddress -notlike "169.254.*"
        } |
        Select-Object -First 1).IPAddress
} catch {
    $localIP = "Unable to detect"
}

if ($ShowIP -or $Status) {
    Write-Host "Local IP Address: $localIP" -ForegroundColor Green
    Write-Host ""
}

if ($Status) {
    Write-Host "[Checking Service Status]" -ForegroundColor Yellow
    Write-Host ""

    # Check localhost
    try {
        $localCheck = Invoke-RestMethod -Uri "http://localhost:$Port/v1/models" -TimeoutSec 3 -ErrorAction Stop
        Write-Host "OK - Service running on localhost:$Port" -ForegroundColor Green
    } catch {
        Write-Host "ERROR - Service not running on localhost" -ForegroundColor Red
        Write-Host ""
        Write-Host "Run with -Start to start the service" -ForegroundColor Yellow
        exit 1
    }

    # Check network access
    if ($localIP -ne "Unable to detect") {
        try {
            $networkCheck = Invoke-RestMethod -Uri "http://${localIP}:$Port/v1/models" -TimeoutSec 3 -ErrorAction Stop
            Write-Host "OK - Service accessible on network" -ForegroundColor Green
            Write-Host ""
            Write-Host "Network Endpoints:" -ForegroundColor Cyan
            Write-Host "  OpenAI API:     http://${localIP}:${Port}/v1" -ForegroundColor White
            Write-Host "  LM Studio API:  http://${localIP}:${Port}/api/v0" -ForegroundColor White
            Write-Host ""
            Write-Host "Models: $($networkCheck.data.Count) available" -ForegroundColor Gray

            # Show loaded models
            $loadedModels = $networkCheck.data | Select-Object -First 5
            if ($loadedModels.Count -gt 0) {
                Write-Host ""
                Write-Host "Loaded Models:" -ForegroundColor Cyan
                foreach ($model in $loadedModels) {
                    Write-Host "  - $($model.id)" -ForegroundColor White
                }
            }

        } catch {
            Write-Host "WARNING - Service not accessible from network" -ForegroundColor Yellow
            Write-Host "Check firewall settings or use GUI to enable 'Serve on Local Network'" -ForegroundColor Gray
        }
    }

} elseif ($Start) {
    Write-Host "[Starting Network AI Server]" -ForegroundColor Yellow
    Write-Host ""

    Write-Host "Instructions:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 1: LM Studio GUI (Recommended)" -ForegroundColor White
    Write-Host "  1. Open LM Studio application" -ForegroundColor Gray
    Write-Host "  2. Go to Developer tab" -ForegroundColor Gray
    Write-Host "  3. Click 'Start Server'" -ForegroundColor Gray
    Write-Host "  4. Enable 'Serve on Local Network'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Command Line" -ForegroundColor White
    Write-Host "  Run: lms server start --port $Port --host 0.0.0.0 --cors *" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Your network URL will be: http://${localIP}:${Port}" -ForegroundColor Green
    Write-Host ""

} elseif ($Stop) {
    Write-Host "[Stopping Service]" -ForegroundColor Yellow
    Write-Host ""

    # Find LM Studio processes
    $processes = Get-Process | Where-Object {
        $_.ProcessName -like "*lms*" -or $_.ProcessName -like "*lmstudio*"
    }

    if ($processes.Count -eq 0) {
        Write-Host "No LM Studio processes found" -ForegroundColor Gray
    } else {
        foreach ($proc in $processes) {
            try {
                Stop-Process -Id $proc.Id -Force
                Write-Host "OK - Stopped: $($proc.ProcessName)" -ForegroundColor Green
            } catch {
                Write-Host "ERROR - Failed to stop: $($proc.ProcessName)" -ForegroundColor Red
            }
        }
    }

} else {
    # Show menu
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\setup_network_ai_server.ps1 -Start   # Show start instructions" -ForegroundColor White
    Write-Host "  .\setup_network_ai_server.ps1 -Status  # Check service status" -ForegroundColor White
    Write-Host "  .\setup_network_ai_server.ps1 -Stop    # Stop server" -ForegroundColor White
    Write-Host "  .\setup_network_ai_server.ps1 -ShowIP  # Show network IP" -ForegroundColor White
    Write-Host ""
    Write-Host "Your local IP: $localIP" -ForegroundColor Cyan
    Write-Host "Default port: $Port" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Quick check: .\setup_network_ai_server.ps1 -Status" -ForegroundColor Yellow
    Write-Host ""
}
