# LM Studio CLI - Advanced Features Integration
# Location: D:\ClientForge\03_BOTS\elaria_command_center\cli_advanced.ps1
# Purpose: Demonstrate and utilize advanced lms CLI capabilities

param(
    [Parameter(Position = 0)]
    [string]$Command = "menu",

    [Parameter(Position = 1)]
    [string]$Param1 = "",

    [Parameter(Position = 2)]
    [string]$Param2 = ""
)

Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   LM STUDIO CLI - ADVANCED FEATURES            ║" -ForegroundColor Cyan
Write-Host "╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host ""

# ============================================================
# UTILITY FUNCTIONS
# ============================================================

function Show-Success {
    param([string]$Message)
    Write-Host "✓ " -ForegroundColor Green -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Show-Error {
    param([string]$Message)
    Write-Host "✗ " -ForegroundColor Red -NoNewline
    Write-Host $Message -ForegroundColor White
}

function Show-Info {
    param([string]$Message)
    Write-Host "ℹ " -ForegroundColor Cyan -NoNewline
    Write-Host $Message -ForegroundColor Gray
}

function Show-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "═══ $Title ═══" -ForegroundColor Cyan
    Write-Host ""
}

# ============================================================
# LMS CLI COMMANDS
# ============================================================

function Get-LMSStatus {
    Show-Section "LM Studio Status"

    try {
        $status = lms status --json 2>&1 | ConvertFrom-Json

        if ($status) {
            Show-Success "LM Studio is running"
            Write-Host "  Server: " -NoNewline -ForegroundColor Gray
            Write-Host "$($status.serverRunning)" -ForegroundColor White
            Write-Host "  Port: " -NoNewline -ForegroundColor Gray
            Write-Host "$($status.port)" -ForegroundColor White
        }
    } catch {
        Show-Error "Failed to get status"
        Write-Host "  Make sure LM Studio is running" -ForegroundColor Gray
    }
}

function Get-LoadedModels {
    Show-Section "Loaded Models"

    try {
        $models = lms ps --json 2>&1 | ConvertFrom-Json

        if ($models) {
            Show-Success "Models loaded: $($models.Count)"
            foreach ($model in $models) {
                Write-Host "  • " -NoNewline -ForegroundColor Yellow
                Write-Host $model.identifier -ForegroundColor White
                Write-Host "    Path: " -NoNewline -ForegroundColor Gray
                Write-Host $model.path -ForegroundColor Gray
            }
        } else {
            Show-Info "No models currently loaded"
            Write-Host "  Use: lms load <model-name>" -ForegroundColor Gray
        }
    } catch {
        Show-Error "Failed to get loaded models"
    }
}

function Get-AvailableModels {
    Show-Section "Available Models"

    Show-Info "Listing downloaded models..."

    try {
        lms ls
    } catch {
        Show-Error "Failed to list models"
    }
}

function Get-ServerLogs {
    Show-Section "Server Logs (Live Stream)"

    Show-Info "Streaming server logs... Press Ctrl+C to stop"
    Write-Host ""

    try {
        lms log stream --source server
    } catch {
        Show-Error "Failed to stream logs"
    }
}

function Get-ModelLogs {
    param([string]$Filter = "input,output")

    Show-Section "Model I/O Logs (Live Stream)"

    Show-Info "Streaming model logs (filter: $Filter)... Press Ctrl+C to stop"
    Write-Host ""

    try {
        lms log stream --source model --filter $Filter
    } catch {
        Show-Error "Failed to stream model logs"
    }
}

function Load-Model {
    param([string]$ModelName)

    if (-not $ModelName) {
        Show-Error "Model name required"
        Write-Host "  Usage: .\cli_advanced.ps1 load <model-name>" -ForegroundColor Gray
        return
    }

    Show-Section "Loading Model: $ModelName"

    try {
        Show-Info "Loading model... This may take a moment"
        lms load $ModelName

        Show-Success "Model loaded successfully"
    } catch {
        Show-Error "Failed to load model"
        Write-Host "  Use 'lms ls' to see available models" -ForegroundColor Gray
    }
}

function Unload-Model {
    param([string]$ModelName)

    if (-not $ModelName) {
        Show-Error "Model name required"
        Write-Host "  Usage: .\cli_advanced.ps1 unload <model-name>" -ForegroundColor Gray
        return
    }

    Show-Section "Unloading Model: $ModelName"

    try {
        lms unload $ModelName
        Show-Success "Model unloaded successfully"
    } catch {
        Show-Error "Failed to unload model"
    }
}

function Download-Model {
    param([string]$ModelIdentifier)

    if (-not $ModelIdentifier) {
        Show-Error "Model identifier required"
        Write-Host "  Usage: .\cli_advanced.ps1 download <model-identifier>" -ForegroundColor Gray
        Write-Host "  Examples:" -ForegroundColor Gray
        Write-Host "    .\cli_advanced.ps1 download qwen3-30b" -ForegroundColor Gray
        Write-Host "    .\cli_advanced.ps1 download TheBloke/Llama-2-7B-GGUF" -ForegroundColor Gray
        return
    }

    Show-Section "Downloading Model: $ModelIdentifier"

    try {
        Show-Info "Downloading model... This may take several minutes"
        lms get $ModelIdentifier

        Show-Success "Model downloaded successfully"
    } catch {
        Show-Error "Failed to download model"
    }
}

function Start-Server {
    Show-Section "Starting LM Studio Server"

    try {
        Show-Info "Starting server on port 1234..."
        lms server start --port 1234 --cors true

        Show-Success "Server started successfully"
    } catch {
        Show-Error "Failed to start server"
        Write-Host "  Server may already be running" -ForegroundColor Gray
    }
}

function Stop-Server {
    Show-Section "Stopping LM Studio Server"

    try {
        lms server stop
        Show-Success "Server stopped successfully"
    } catch {
        Show-Error "Failed to stop server"
    }
}

function Get-ModelInfo {
    param([string]$ModelName)

    if (-not $ModelName) {
        Show-Error "Model name required"
        return
    }

    Show-Section "Model Information: $ModelName"

    try {
        # Get model details (if available via lms)
        Show-Info "Fetching model information..."

        # For now, show what we can get from ps
        $models = lms ps --json 2>&1 | ConvertFrom-Json
        $model = $models | Where-Object { $_.identifier -like "*$ModelName*" }

        if ($model) {
            Write-Host "  Identifier: " -NoNewline -ForegroundColor Gray
            Write-Host $model.identifier -ForegroundColor White
            Write-Host "  Path: " -NoNewline -ForegroundColor Gray
            Write-Host $model.path -ForegroundColor White
            Show-Success "Model is currently loaded"
        } else {
            Show-Info "Model is not currently loaded"
            Write-Host "  Use: lms load $ModelName" -ForegroundColor Gray
        }
    } catch {
        Show-Error "Failed to get model info"
    }
}

function Show-QuickCommands {
    Show-Section "Quick Commands Reference"

    Write-Host "Status & Info:" -ForegroundColor Yellow
    Write-Host "  lms status                    # Check if LM Studio is running" -ForegroundColor White
    Write-Host "  lms ps                        # List loaded models" -ForegroundColor White
    Write-Host "  lms ls                        # List all downloaded models" -ForegroundColor White
    Write-Host "  lms version                   # Show LM Studio version" -ForegroundColor White
    Write-Host ""

    Write-Host "Model Management:" -ForegroundColor Yellow
    Write-Host "  lms load <model>              # Load a model for inferencing" -ForegroundColor White
    Write-Host "  lms unload <model>            # Unload a model" -ForegroundColor White
    Write-Host "  lms get <model>               # Download a model" -ForegroundColor White
    Write-Host "  lms get --mlx                 # Download MLX models (Mac)" -ForegroundColor White
    Write-Host ""

    Write-Host "Server Management:" -ForegroundColor Yellow
    Write-Host "  lms server start              # Start the API server" -ForegroundColor White
    Write-Host "  lms server stop               # Stop the API server" -ForegroundColor White
    Write-Host ""

    Write-Host "Advanced - Log Streaming:" -ForegroundColor Yellow
    Write-Host "  lms log stream --source server          # Stream server logs" -ForegroundColor White
    Write-Host "  lms log stream --source model --filter input      # Model input logs" -ForegroundColor White
    Write-Host "  lms log stream --source model --filter output     # Model output logs" -ForegroundColor White
    Write-Host "  lms log stream --source model --filter input,output  # Both I/O" -ForegroundColor White
    Write-Host ""

    Write-Host "PowerShell Script Shortcuts:" -ForegroundColor Yellow
    Write-Host "  .\cli_advanced.ps1 status               # Show LM Studio status" -ForegroundColor White
    Write-Host "  .\cli_advanced.ps1 models               # List loaded models" -ForegroundColor White
    Write-Host "  .\cli_advanced.ps1 available            # List all models" -ForegroundColor White
    Write-Host "  .\cli_advanced.ps1 load <model>         # Load a model" -ForegroundColor White
    Write-Host "  .\cli_advanced.ps1 unload <model>       # Unload a model" -ForegroundColor White
    Write-Host "  .\cli_advanced.ps1 download <model>     # Download a model" -ForegroundColor White
    Write-Host "  .\cli_advanced.ps1 logs-server          # Stream server logs" -ForegroundColor White
    Write-Host "  .\cli_advanced.ps1 logs-model           # Stream model I/O logs" -ForegroundColor White
    Write-Host ""
}

function Show-Menu {
    Write-Host "Select an option:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  1. Show Status" -ForegroundColor White
    Write-Host "  2. List Loaded Models" -ForegroundColor White
    Write-Host "  3. List Available Models" -ForegroundColor White
    Write-Host "  4. Load Model" -ForegroundColor White
    Write-Host "  5. Unload Model" -ForegroundColor White
    Write-Host "  6. Download Model" -ForegroundColor White
    Write-Host "  7. Stream Server Logs" -ForegroundColor White
    Write-Host "  8. Stream Model Logs" -ForegroundColor White
    Write-Host "  9. Quick Commands Reference" -ForegroundColor White
    Write-Host "  0. Exit" -ForegroundColor White
    Write-Host ""

    $choice = Read-Host "Enter choice (0-9)"

    switch ($choice) {
        "1" { Get-LMSStatus }
        "2" { Get-LoadedModels }
        "3" { Get-AvailableModels }
        "4" {
            $model = Read-Host "Enter model name"
            Load-Model -ModelName $model
        }
        "5" {
            $model = Read-Host "Enter model name"
            Unload-Model -ModelName $model
        }
        "6" {
            $model = Read-Host "Enter model identifier"
            Download-Model -ModelIdentifier $model
        }
        "7" { Get-ServerLogs }
        "8" { Get-ModelLogs }
        "9" { Show-QuickCommands }
        "0" {
            Write-Host ""
            Write-Host "Goodbye!" -ForegroundColor Cyan
            exit
        }
        default {
            Show-Error "Invalid choice"
        }
    }

    Write-Host ""
    Write-Host "Press any key to continue..." -ForegroundColor Gray
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    Show-Menu
}

# ============================================================
# MAIN EXECUTION
# ============================================================

switch ($Command.ToLower()) {
    "status" { Get-LMSStatus }
    "models" { Get-LoadedModels }
    "available" { Get-AvailableModels }
    "load" { Load-Model -ModelName $Param1 }
    "unload" { Unload-Model -ModelName $Param1 }
    "download" { Download-Model -ModelIdentifier $Param1 }
    "logs-server" { Get-ServerLogs }
    "logs-model" { Get-ModelLogs -Filter $Param1 }
    "start-server" { Start-Server }
    "stop-server" { Stop-Server }
    "info" { Get-ModelInfo -ModelName $Param1 }
    "commands" { Show-QuickCommands }
    "menu" { Show-Menu }
    default {
        Show-Error "Unknown command: $Command"
        Write-Host ""
        Write-Host "Usage: .\cli_advanced.ps1 [command] [params]" -ForegroundColor Gray
        Write-Host "Run without arguments to show interactive menu" -ForegroundColor Gray
        Write-Host ""
        Show-QuickCommands
    }
}

Write-Host ""
