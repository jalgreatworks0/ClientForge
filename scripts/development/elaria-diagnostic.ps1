# Elaria LM Studio System Diagnostic & Initialization
# Advanced ScrollForge Integration for ClientForge CRM

param(
    [switch]$Diagnostic,
    [switch]$Initialize,
    [switch]$Monitor,
    [switch]$Repair
)

$ErrorActionPreference = "Stop"
$VerbosePreference = "Continue"

# Configuration
$config = @{
    ScrollForgePath = "D:\scrollforge\apps\LMStudio"
    ClientForgePath = "D:\clientforge-crm"
    LMStudioExe = "LM Studio.exe"
    ServerPort = 1234
    Models = @{
        "qwen-coder-30b" = @{
            File = "qwen-coder-30b.Q4_K_M.gguf"
            Purpose = "Code generation and analysis"
            GpuLayers = 35
        }
        "llama-3.1-70b" = @{
            File = "llama-3.1-70b-instruct.Q3_K_S.gguf"
            Purpose = "Complex reasoning and planning"
            GpuLayers = 40
        }
        "mistral-7b" = @{
            File = "mistral-7b-instruct-v0.3.Q5_K_M.gguf"
            Purpose = "Fast chat and responses"
            GpuLayers = 33
        }
    }
}

# Diagnostic Functions
function Test-LMStudioInstallation {
    Write-Host "🔍 Checking LM Studio Installation..." -ForegroundColor Cyan
    
    $lmStudioPath = Join-Path $config.ScrollForgePath $config.LMStudioExe
    
    if (Test-Path $lmStudioPath) {
        Write-Host "✅ LM Studio found at: $($config.ScrollForgePath)" -ForegroundColor Green
        
        # Get version info
        $versionInfo = (Get-Item $lmStudioPath).VersionInfo
        Write-Host "   Version: $($versionInfo.FileVersion)" -ForegroundColor Gray
        Write-Host "   Product: $($versionInfo.ProductName)" -ForegroundColor Gray
        
        return $true
    } else {
        Write-Host "❌ LM Studio NOT found at: $($config.ScrollForgePath)" -ForegroundColor Red
        Write-Host "   Expected: $lmStudioPath" -ForegroundColor Yellow
        return $false
    }
}

function Test-ModelAvailability {
    Write-Host "`n🔍 Checking Model Availability..." -ForegroundColor Cyan
    
    $modelsPath = Join-Path $config.ScrollForgePath "models"
    $availableModels = @()
    $missingModels = @()
    
    foreach ($modelName in $config.Models.Keys) {
        $modelConfig = $config.Models[$modelName]
        $modelPath = Join-Path $modelsPath $modelConfig.File
        
        if (Test-Path $modelPath) {
            $size = (Get-Item $modelPath).Length / 1GB
            Write-Host "✅ $modelName`: $([math]::Round($size, 2))GB" -ForegroundColor Green
            Write-Host "   Purpose: $($modelConfig.Purpose)" -ForegroundColor Gray
            $availableModels += $modelName
        } else {
            Write-Host "⚠️ $modelName`: MISSING" -ForegroundColor Yellow
            Write-Host "   Expected: $($modelConfig.File)" -ForegroundColor Gray
            $missingModels += $modelName
        }
    }
    
    return @{
        Available = $availableModels
        Missing = $missingModels
    }
}

function Test-ServerStatus {
    Write-Host "`n🔍 Checking LM Studio Server Status..." -ForegroundColor Cyan
    
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$($config.ServerPort)/health" -Method GET -TimeoutSec 2
        
        if ($response.StatusCode -eq 200) {
            Write-Host "✅ Server is RUNNING on port $($config.ServerPort)" -ForegroundColor Green
            
            # Get loaded models
            try {
                $modelsResponse = Invoke-WebRequest -Uri "http://localhost:$($config.ServerPort)/v1/models" -Method GET
                $models = ($modelsResponse.Content | ConvertFrom-Json).data
                
                if ($models.Count -gt 0) {
                    Write-Host "   Loaded models:" -ForegroundColor Gray
                    foreach ($model in $models) {
                        Write-Host "   • $($model.id)" -ForegroundColor Cyan
                    }
                } else {
                    Write-Host "   No models currently loaded" -ForegroundColor Yellow
                }
            } catch {
                Write-Host "   Could not retrieve model list" -ForegroundColor Yellow
            }
            
            return $true
        }
    } catch {
        Write-Host "❌ Server is NOT running" -ForegroundColor Red
        Write-Host "   Error: $_" -ForegroundColor Gray
        return $false
    }
    
    return $false
}

function Test-GPUStatus {
    Write-Host "`n🔍 Checking GPU Status..." -ForegroundColor Cyan
    
    try {
        # Check for NVIDIA GPU
        $gpu = Get-WmiObject Win32_VideoController | Where-Object { $_.Name -like "*NVIDIA*" }
        
        if ($gpu) {
            Write-Host "✅ GPU Detected: $($gpu.Name)" -ForegroundColor Green
            Write-Host "   Driver Version: $($gpu.DriverVersion)" -ForegroundColor Gray
            Write-Host "   VRAM: $([math]::Round($gpu.AdapterRAM / 1GB, 2))GB" -ForegroundColor Gray
            
            # Check CUDA availability
            $nvidiaSmi = Get-Command nvidia-smi -ErrorAction SilentlyContinue
            if ($nvidiaSmi) {
                Write-Host "✅ CUDA Support Available" -ForegroundColor Green
            } else {
                Write-Host "⚠️ nvidia-smi not found (CUDA status unknown)" -ForegroundColor Yellow
            }
            
            return $true
        } else {
            Write-Host "⚠️ No NVIDIA GPU detected" -ForegroundColor Yellow
            Write-Host "   LM Studio will run in CPU mode (slower)" -ForegroundColor Gray
            return $false
        }
    } catch {
        Write-Host "⚠️ Could not detect GPU status" -ForegroundColor Yellow
        return $false
    }
}

function Test-SystemResources {
    Write-Host "`n🔍 Checking System Resources..." -ForegroundColor Cyan
    
    # RAM Check
    $totalRAM = (Get-WmiObject Win32_ComputerSystem).TotalPhysicalMemory / 1GB
    $freeRAM = (Get-WmiObject Win32_OperatingSystem).FreePhysicalMemory / 1MB / 1024
    
    Write-Host "💾 RAM: $([math]::Round($freeRAM, 2))GB free / $([math]::Round($totalRAM, 2))GB total" -ForegroundColor $(if ($freeRAM -gt 16) {"Green"} else {"Yellow"})
    
    # Disk Check for ScrollForge
    $drive = Get-PSDrive -Name "D" -ErrorAction SilentlyContinue
    if ($drive) {
        $freeSpace = $drive.Free / 1GB
        Write-Host "💿 D: Drive: $([math]::Round($freeSpace, 2))GB free" -ForegroundColor $(if ($freeSpace -gt 50) {"Green"} else {"Yellow"})
    }
    
    # CPU Check
    $cpu = Get-WmiObject Win32_Processor
    Write-Host "🖥️ CPU: $($cpu.Name)" -ForegroundColor Cyan
    Write-Host "   Cores: $($cpu.NumberOfCores) | Threads: $($cpu.NumberOfLogicalProcessors)" -ForegroundColor Gray
}

function Start-LMStudioServer {
    Write-Host "`n🚀 Starting LM Studio Server..." -ForegroundColor Cyan
    
    $lmStudioPath = Join-Path $config.ScrollForgePath $config.LMStudioExe
    
    if (-not (Test-Path $lmStudioPath)) {
        Write-Host "❌ Cannot start - LM Studio not found" -ForegroundColor Red
        return $false
    }
    
    # Start LM Studio with server mode
    $arguments = @(
        "server", "start",
        "--port", $config.ServerPort,
        "--cors",
        "--api", "openai"
    )
    
    try {
        Start-Process -FilePath $lmStudioPath -ArgumentList $arguments -WindowStyle Hidden
        
        # Wait for server to start
        Write-Host "   Waiting for server initialization..." -ForegroundColor Gray
        
        $attempts = 0
        while ($attempts -lt 30) {
            Start-Sleep -Seconds 1
            
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:$($config.ServerPort)/health" -Method GET -TimeoutSec 1
                if ($response.StatusCode -eq 200) {
                    Write-Host "✅ Server started successfully!" -ForegroundColor Green
                    return $true
                }
            } catch {
                # Server not ready yet
            }
            
            $attempts++
            if ($attempts % 5 -eq 0) {
                Write-Host "   Still waiting... ($attempts/30)" -ForegroundColor Gray
            }
        }
        
        Write-Host "⚠️ Server start timeout - please check manually" -ForegroundColor Yellow
        return $false
        
    } catch {
        Write-Host "❌ Failed to start server: $_" -ForegroundColor Red
        return $false
    }
}

function Initialize-ElariaSystem {
    Write-Host "`n🔮 INITIALIZING ELARIA COMMAND CENTER" -ForegroundColor Magenta
    Write-Host "="*50 -ForegroundColor DarkGray
    
    # Run diagnostics first
    $lmStudioOk = Test-LMStudioInstallation
    $modelsStatus = Test-ModelAvailability
    $serverRunning = Test-ServerStatus
    $gpuOk = Test-GPUStatus
    Test-SystemResources
    
    # Determine if we can proceed
    if (-not $lmStudioOk) {
        Write-Host "`n❌ INITIALIZATION FAILED: LM Studio not installed" -ForegroundColor Red
        Write-Host "Please install LM Studio at: $($config.ScrollForgePath)" -ForegroundColor Yellow
        return $false
    }
    
    # Start server if needed
    if (-not $serverRunning) {
        $serverStarted = Start-LMStudioServer
        if (-not $serverStarted) {
            Write-Host "`n⚠️ INITIALIZATION INCOMPLETE: Server could not be started" -ForegroundColor Yellow
            return $false
        }
    }
    
    # Set environment variables
    Write-Host "`n📝 Configuring Environment Variables..." -ForegroundColor Cyan
    [Environment]::SetEnvironmentVariable("LMSTUDIO_ENDPOINT", "http://localhost:$($config.ServerPort)/v1", "User")
    [Environment]::SetEnvironmentVariable("LMSTUDIO_PATH", $config.ScrollForgePath, "User")
    [Environment]::SetEnvironmentVariable("ELARIA_ENABLED", "true", "User")
    Write-Host "✅ Environment configured" -ForegroundColor Green
    
    # Start Elaria orchestrator
    Write-Host "`n🎭 Starting Elaria Orchestrator..." -ForegroundColor Cyan
    $orchestratorPath = Join-Path $config.ClientForgePath "ai\orchestration\elaria-controller.js"
    
    if (Test-Path $orchestratorPath) {
        Start-Process -FilePath "node" -ArgumentList $orchestratorPath -WorkingDirectory $config.ClientForgePath -WindowStyle Hidden
        Write-Host "✅ Orchestrator started" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Orchestrator script not found" -ForegroundColor Yellow
    }
    
    # Final status
    Write-Host "`n" + "="*50 -ForegroundColor DarkGray
    Write-Host "🌟 ELARIA COMMAND CENTER STATUS" -ForegroundColor Magenta
    Write-Host "="*50 -ForegroundColor DarkGray
    
    Write-Host "✅ LM Studio: OPERATIONAL" -ForegroundColor Green
    Write-Host "✅ Server: http://localhost:$($config.ServerPort)" -ForegroundColor Green
    
    if ($modelsStatus.Available.Count -gt 0) {
        Write-Host "✅ Models Available: $($modelsStatus.Available -join ', ')" -ForegroundColor Green
    }
    
    if ($modelsStatus.Missing.Count -gt 0) {
        Write-Host "⚠️ Models Missing: $($modelsStatus.Missing -join ', ')" -ForegroundColor Yellow
    }
    
    if ($gpuOk) {
        Write-Host "✅ GPU Acceleration: ENABLED" -ForegroundColor Green
    } else {
        Write-Host "⚠️ GPU Acceleration: DISABLED (CPU mode)" -ForegroundColor Yellow
    }
    
    return $true
}

function Start-Monitoring {
    Write-Host "`n📊 STARTING ELARIA MONITORING" -ForegroundColor Cyan
    Write-Host "Press Ctrl+C to stop monitoring`n" -ForegroundColor Gray
    
    while ($true) {
        Clear-Host
        Write-Host "🔮 ELARIA COMMAND CENTER - LIVE MONITOR" -ForegroundColor Magenta
        Write-Host "="*50 -ForegroundColor DarkGray
        Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Gray
        Write-Host ""
        
        # Server status
        $serverUp = Test-ServerStatus
        
        # Resource usage
        $ram = (Get-WmiObject Win32_OperatingSystem)
        $usedRAM = ($ram.TotalVisibleMemorySize - $ram.FreePhysicalMemory) / 1MB / 1024
        $totalRAM = $ram.TotalVisibleMemorySize / 1MB / 1024
        
        Write-Host "`n📊 System Resources:" -ForegroundColor Cyan
        Write-Host "   RAM Usage: $([math]::Round($usedRAM, 2))GB / $([math]::Round($totalRAM, 2))GB" -ForegroundColor Gray
        
        # CPU usage
        $cpu = Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue
        if ($cpu) {
            Write-Host "   CPU Usage: $([math]::Round($cpu.CounterSamples[0].CookedValue, 2))%" -ForegroundColor Gray
        }
        
        Start-Sleep -Seconds 5
    }
}

function Repair-Installation {
    Write-Host "`n🔧 REPAIRING ELARIA INSTALLATION" -ForegroundColor Yellow
    
    # Kill existing processes
    Write-Host "Stopping existing processes..." -ForegroundColor Gray
    Get-Process | Where-Object { $_.Name -like "*LM Studio*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    Get-Process | Where-Object { $_.ProcessName -eq "node" -and $_.CommandLine -like "*elaria*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Start-Sleep -Seconds 2
    
    # Clear cache
    Write-Host "Clearing cache..." -ForegroundColor Gray
    $cachePath = Join-Path $config.ScrollForgePath "cache"
    if (Test-Path $cachePath) {
        Remove-Item -Path $cachePath -Recurse -Force -ErrorAction SilentlyContinue
    }
    
    # Restart services
    Write-Host "Restarting services..." -ForegroundColor Gray
    Initialize-ElariaSystem
}

# Main execution
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════╗" -ForegroundColor Magenta
Write-Host "║          ELARIA COMMAND CENTER DIAGNOSTIC             ║" -ForegroundColor Magenta
Write-Host "║           ScrollForge × ClientForge Bridge            ║" -ForegroundColor Magenta
Write-Host "╚═══════════════════════════════════════════════════════╝" -ForegroundColor Magenta
Write-Host ""

if ($Diagnostic -or (-not $Initialize -and -not $Monitor -and -not $Repair)) {
    # Run diagnostic by default
    Test-LMStudioInstallation
    Test-ModelAvailability
    Test-ServerStatus
    Test-GPUStatus
    Test-SystemResources
}

if ($Initialize) {
    Initialize-ElariaSystem
}

if ($Monitor) {
    Start-Monitoring
}

if ($Repair) {
    Repair-Installation
}
