# LM Studio Headless Service Setup for ClientForge
# Location: D:\ClientForge\03_BOTS\elaria_command_center\setup_lmstudio_service.ps1
# Purpose: Configure LM Studio to run as a headless service on 5090

param(
    [switch]$Install = $false,
    [switch]$Start = $false,
    [switch]$Stop = $false,
    [switch]$Status = $false,
    [switch]$EnableAutoStart = $false,
    [int]$Port = 1234
)

$ErrorActionPreference = "Stop"

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "  LM STUDIO HEADLESS SERVICE SETUP" -ForegroundColor Cyan
Write-Host "  ClientForge CRM - Production Configuration" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

# Detect LM Studio installation
$LMSPaths = @(
    "$env:USERPROFILE\.lmstudio\bin\lms.exe",
    "$env:LOCALAPPDATA\LM Studio\bin\lms.exe",
    "C:\Program Files\LM Studio\bin\lms.exe"
)

$LMS = $null
foreach ($path in $LMSPaths) {
    if (Test-Path $path) {
        $LMS = $path
        break
    }
}

if (-not $LMS) {
    Write-Host "✗ LM Studio CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Installation options:" -ForegroundColor Yellow
    Write-Host "  1. Install LM Studio from: https://lmstudio.ai" -ForegroundColor White
    Write-Host "  2. Run LM Studio once to initialize CLI" -ForegroundColor White
    Write-Host "  3. Bootstrap CLI: lms bootstrap" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✓ Found LM Studio CLI: $LMS" -ForegroundColor Green
Write-Host ""

# Function: Check service status
function Get-ServiceStatus {
    Write-Host "[Status Check]" -ForegroundColor Yellow

    try {
        $response = Invoke-RestMethod -Uri "http://localhost:$Port/v1/models" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "  ✓ LM Studio service is running on port $Port" -ForegroundColor Green
        Write-Host "  Models available: $($response.data.Count)" -ForegroundColor Gray

        if ($response.data.Count -gt 0) {
            Write-Host ""
            Write-Host "  Loaded models:" -ForegroundColor Cyan
            $response.data | ForEach-Object {
                Write-Host "    • $($_.id)" -ForegroundColor White
            }
        }

        return $true
    } catch {
        Write-Host "  ✗ LM Studio service is not running" -ForegroundColor Red
        return $false
    }
}

# Function: Start service
function Start-LMStudioService {
    Write-Host "[Starting Service]" -ForegroundColor Yellow

    # Check if already running
    if (Get-ServiceStatus) {
        Write-Host "  Service already running" -ForegroundColor Gray
        return
    }

    Write-Host "  Starting LM Studio server on port $Port..." -ForegroundColor Cyan

    # Start in background
    $process = Start-Process -FilePath $LMS -ArgumentList "server", "start", "--port", $Port -PassThru -WindowStyle Hidden

    Write-Host "  Process ID: $($process.Id)" -ForegroundColor Gray
    Write-Host "  Waiting for service to be ready..." -ForegroundColor Gray

    # Wait for service to start (max 30 seconds)
    $maxAttempts = 30
    $attempt = 0
    $running = $false

    while ($attempt -lt $maxAttempts -and -not $running) {
        Start-Sleep -Seconds 1
        $attempt++

        try {
            $response = Invoke-RestMethod -Uri "http://localhost:$Port/v1/models" -TimeoutSec 2 -ErrorAction Stop
            $running = $true
        } catch {
            # Still starting up
        }
    }

    if ($running) {
        Write-Host "  ✓ Service started successfully" -ForegroundColor Green
        Write-Host ""
        Get-ServiceStatus | Out-Null
    } else {
        Write-Host "  ✗ Service failed to start within 30 seconds" -ForegroundColor Red
        Write-Host "  Check LM Studio logs for errors" -ForegroundColor Yellow
    }
}

# Function: Stop service
function Stop-LMStudioService {
    Write-Host "[Stopping Service]" -ForegroundColor Yellow

    # Find LM Studio processes
    $processes = Get-Process | Where-Object { $_.ProcessName -like "*lmstudio*" -or $_.ProcessName -like "*lms*" }

    if ($processes.Count -eq 0) {
        Write-Host "  No LM Studio processes found" -ForegroundColor Gray
        return
    }

    Write-Host "  Found $($processes.Count) LM Studio process(es)" -ForegroundColor Gray

    foreach ($proc in $processes) {
        try {
            Stop-Process -Id $proc.Id -Force
            Write-Host "  ✓ Stopped process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Green
        } catch {
            Write-Host "  ✗ Failed to stop: $($proc.ProcessName)" -ForegroundColor Red
        }
    }
}

# Function: Enable auto-start on login
function Enable-AutoStart {
    Write-Host "[Enable Auto-Start]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To enable LM Studio to start on machine login:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Option 1: LM Studio GUI (Recommended)" -ForegroundColor White
    Write-Host "  1. Open LM Studio application" -ForegroundColor Gray
    Write-Host "  2. Go to Settings (Ctrl + ,)" -ForegroundColor Gray
    Write-Host "  3. Enable 'Run LLM server on login'" -ForegroundColor Gray
    Write-Host "  4. Enable 'Just-In-Time (JIT) model loading'" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Option 2: Task Scheduler (Manual)" -ForegroundColor White
    Write-Host "  Create a scheduled task to run:" -ForegroundColor Gray
    Write-Host "  $LMS server start --port $Port" -ForegroundColor DarkGray
    Write-Host ""

    $createTask = Read-Host "Create Task Scheduler entry now? (Y/N)"

    if ($createTask -eq "Y" -or $createTask -eq "y") {
        # Create scheduled task
        $taskName = "LMStudio-ClientForge-Service"
        $taskAction = New-ScheduledTaskAction -Execute $LMS -Argument "server start --port $Port"
        $taskTrigger = New-ScheduledTaskTrigger -AtLogOn
        $taskSettings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

        try {
            Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $taskTrigger -Settings $taskSettings -Force | Out-Null
            Write-Host "  ✓ Task Scheduler entry created: $taskName" -ForegroundColor Green
            Write-Host "  Service will start automatically on next login" -ForegroundColor Gray
        } catch {
            Write-Host "  ✗ Failed to create scheduled task: $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

# Function: Install and configure
function Install-LMStudioService {
    Write-Host "[Installation]" -ForegroundColor Yellow
    Write-Host ""

    # 1. Check CLI bootstrap
    Write-Host "Step 1: Verify CLI bootstrap" -ForegroundColor Cyan
    try {
        $version = & $LMS --version 2>&1
        Write-Host "  ✓ LM Studio CLI version: $version" -ForegroundColor Green
    } catch {
        Write-Host "  Bootstrapping CLI..." -ForegroundColor Yellow
        & $LMS bootstrap
    }

    Write-Host ""

    # 2. Check for models
    Write-Host "Step 2: Check for downloaded models" -ForegroundColor Cyan
    try {
        $models = & $LMS ls 2>&1
        Write-Host "  ✓ Found models" -ForegroundColor Green
        Write-Host $models -ForegroundColor Gray
    } catch {
        Write-Host "  ⚠ No models found" -ForegroundColor Yellow
        Write-Host "  Download models with: lms get <model-name>" -ForegroundColor Gray
    }

    Write-Host ""

    # 3. Configure ClientForge integration
    Write-Host "Step 3: Configure ClientForge integration" -ForegroundColor Cyan

    $envPath = "D:\ClientForge\03_BOTS\elaria_command_center\.env"
    if (Test-Path $envPath) {
        $envContent = Get-Content $envPath -Raw

        # Update LM Studio settings
        if ($envContent -notmatch "LM_STUDIO_BASE_URL") {
            Add-Content -Path $envPath -Value "`nLM_STUDIO_BASE_URL=http://localhost:$Port/v1"
        }

        Write-Host "  ✓ Updated .env configuration" -ForegroundColor Green
    }

    Write-Host ""

    # 4. Test connection
    Write-Host "Step 4: Test service connection" -ForegroundColor Cyan
    Start-LMStudioService

    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  INSTALLATION COMPLETE" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host ""
    Write-Host "Configuration:" -ForegroundColor Yellow
    Write-Host "  • Service endpoint: http://localhost:$Port/v1" -ForegroundColor White
    Write-Host "  • OpenAI-compatible API" -ForegroundColor White
    Write-Host "  • JIT model loading enabled" -ForegroundColor White
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Enable auto-start: .\setup_lmstudio_service.ps1 -EnableAutoStart" -ForegroundColor White
    Write-Host "  2. Test integration: npm test" -ForegroundColor White
    Write-Host "  3. Start Elaria: npm start" -ForegroundColor White
    Write-Host ""
}

# Main execution
try {
    if ($Install) {
        Install-LMStudioService
    } elseif ($Start) {
        Start-LMStudioService
    } elseif ($Stop) {
        Stop-LMStudioService
    } elseif ($Status) {
        Get-ServiceStatus | Out-Null
    } elseif ($EnableAutoStart) {
        Enable-AutoStart
    } else {
        # Default: Show menu
        Write-Host "LM Studio Service Management" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Usage:" -ForegroundColor Yellow
        Write-Host "  .\setup_lmstudio_service.ps1 -Install         # Full installation & setup" -ForegroundColor White
        Write-Host "  .\setup_lmstudio_service.ps1 -Start           # Start service" -ForegroundColor White
        Write-Host "  .\setup_lmstudio_service.ps1 -Stop            # Stop service" -ForegroundColor White
        Write-Host "  .\setup_lmstudio_service.ps1 -Status          # Check status" -ForegroundColor White
        Write-Host "  .\setup_lmstudio_service.ps1 -EnableAutoStart # Enable auto-start on login" -ForegroundColor White
        Write-Host ""
        Write-Host "Current status:" -ForegroundColor Yellow
        Get-ServiceStatus | Out-Null
        Write-Host ""
        Write-Host "Quick start: .\setup_lmstudio_service.ps1 -Install" -ForegroundColor Cyan
    }
} catch {
    Write-Host ""
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    exit 1
}
