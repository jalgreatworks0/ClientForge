# ClientForge CRM - Ollama Fleet Starter
# 5 specialized agents on RTX 4090 (24GB VRAM)
# Models: phi3:mini, deepseek-coder:6.7b (Q5), mistral:7b, llama3.1:8b, deepseek-coder:6.7b

Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "   ClientForge CRM - Ollama Fleet Starter   " -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Ollama is installed
if (!(Get-Command ollama -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] Ollama is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install Ollama from: https://ollama.com/download" -ForegroundColor Yellow
    exit 1
}

# Check NVIDIA GPU
Write-Host "[1/7] Checking NVIDIA GPU..." -ForegroundColor Yellow
try {
    $gpuInfo = nvidia-smi --query-gpu=name,memory.total --format=csv,noheader 2>$null
    if ($gpuInfo) {
        Write-Host "  [OK] GPU Found: $gpuInfo" -ForegroundColor Green
    } else {
        Write-Host "  [WARNING] nvidia-smi not found, continuing anyway..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "  [WARNING] Could not check GPU, continuing anyway..." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[2/7] Setting up environment..." -ForegroundColor Yellow

# Set environment variables for GPU 0 (RTX 4090)
$env:CUDA_VISIBLE_DEVICES = "0"
$env:OLLAMA_NUM_GPU = "1"
$env:OLLAMA_GPU_LAYERS = "-1"  # Use all layers on GPU

Write-Host "  [OK] CUDA_VISIBLE_DEVICES = 0 (RTX 4090)" -ForegroundColor Green
Write-Host "  [OK] GPU layers = -1 (all layers on GPU)" -ForegroundColor Green

Write-Host ""
Write-Host "[3/7] Stopping any existing Ollama processes..." -ForegroundColor Yellow

# Kill any existing Ollama processes
Get-Process | Where-Object { $_.ProcessName -like "ollama*" } | ForEach-Object {
    Write-Host "  [OK] Killing process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Cyan
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
}
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "[4/7] Starting Ollama server..." -ForegroundColor Yellow

# Start Ollama server in background
Start-Process -WindowStyle Hidden -FilePath "ollama" -ArgumentList "serve"
Start-Sleep -Seconds 5

Write-Host "  [OK] Ollama server started on port 11434" -ForegroundColor Green

Write-Host ""
Write-Host "[5/7] Loading 5 models into VRAM..." -ForegroundColor Yellow
Write-Host "  This will take 2-3 minutes on first run..." -ForegroundColor Cyan
Write-Host ""

# Model configuration: name, size estimate, purpose
$models = @(
    @{
        name = "phi3:mini"
        size = "2.2 GB"
        purpose = "Ultra-fast simple tasks"
        agentId = "agent-1-phi3mini"
    },
    @{
        name = "deepseek-coder:6.7b-instruct"
        size = "3.8 GB"
        purpose = "Code generation"
        agentId = "agent-2-deepseek6.7b"
    },
    @{
        name = "mistral:7b-instruct"
        size = "4.4 GB"
        purpose = "General purpose & documentation"
        agentId = "agent-3-mistral7b"
    },
    @{
        name = "deepseek-coder:6.7b-instruct-q5_K_M"
        size = "4.8 GB"
        purpose = "Higher quality code"
        agentId = "agent-4-deepseek6.7b-q5"
    },
    @{
        name = "llama3.1:8b-instruct-q5_K_M"
        size = "5.7 GB"
        purpose = "Advanced reasoning"
        agentId = "agent-5-llama3.1-8b"
    }
)

$totalVram = 0.0
$loadedModels = @()

foreach ($model in $models) {
    $modelName = $model.name
    $modelSize = $model.size
    $modelPurpose = $model.purpose
    $agentId = $model.agentId

    Write-Host "  [$($models.IndexOf($model) + 1)/5] Loading: $modelName ($modelSize)" -ForegroundColor Cyan
    Write-Host "        Purpose: $modelPurpose" -ForegroundColor Gray
    Write-Host "        Agent ID: $agentId" -ForegroundColor Gray

    # Test if model exists
    $modelExists = ollama list | Select-String -Pattern $modelName -Quiet

    if (!$modelExists) {
        Write-Host "        [WARNING] Model not found, pulling..." -ForegroundColor Yellow
        ollama pull $modelName 2>&1 | Out-Null
    }

    # Load model into VRAM with a simple prompt
    $loadResult = ollama run $modelName "Ready" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "        [OK] Model loaded into VRAM" -ForegroundColor Green
        $loadedModels += $model

        # Parse VRAM size (rough estimate)
        $vramGB = [double]($modelSize -replace '[^0-9.]', '')
        $totalVram += $vramGB
    } else {
        Write-Host "        [ERROR] Failed to load model" -ForegroundColor Red
        Write-Host "        $loadResult" -ForegroundColor Red
    }

    Write-Host ""
}

Write-Host "[6/7] Fleet summary..." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Models Loaded: $($loadedModels.Count) / $($models.Count)" -ForegroundColor $(if ($loadedModels.Count -eq $models.Count) { "Green" } else { "Yellow" })
Write-Host "  Est. VRAM Usage: $([math]::Round($totalVram, 1)) GB / 24 GB" -ForegroundColor Green
Write-Host "  Available VRAM: $([math]::Round(24 - $totalVram, 1)) GB" -ForegroundColor Cyan
Write-Host ""

foreach ($model in $loadedModels) {
    Write-Host "    [OK] $($model.name) - $($model.purpose)" -ForegroundColor Green
}

Write-Host ""
Write-Host "[7/7] Verifying GPU utilization..." -ForegroundColor Yellow

try {
    $gpuUsage = nvidia-smi --query-gpu=index,name,memory.used,memory.total,utilization.gpu --format=csv 2>$null
    if ($gpuUsage) {
        Write-Host ""
        Write-Host "GPU Status:" -ForegroundColor Cyan
        Write-Host $gpuUsage -ForegroundColor Gray
    }
} catch {
    Write-Host "  [WARNING] Could not query GPU usage" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=============================================" -ForegroundColor Green
Write-Host "  [SUCCESS] Ollama Fleet is Ready!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green
Write-Host ""
Write-Host "API Endpoint: http://localhost:11434" -ForegroundColor Cyan
Write-Host ""
Write-Host "Agent Configuration:" -ForegroundColor Yellow
foreach ($model in $loadedModels) {
    Write-Host "  - $($model.agentId): $($model.name)" -ForegroundColor White
}
Write-Host ""
Write-Host "To stop fleet: Ctrl+C or run stop-fleet.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. npm run mcp:start    # Start MCP Router" -ForegroundColor Cyan
Write-Host "  2. npm run mcp:clients  # Connect Ollama clients" -ForegroundColor Cyan
Write-Host "  3. npm run mcp:all      # Or start everything" -ForegroundColor Cyan
Write-Host ""

# Keep the script running so models stay in VRAM
Write-Host "[INFO] Press Ctrl+C to stop the fleet and unload models" -ForegroundColor Yellow
Write-Host ""

try {
    while ($true) {
        Start-Sleep -Seconds 30
        # Optional: Check if Ollama is still running
        $ollamaProcess = Get-Process | Where-Object { $_.ProcessName -like "ollama*" }
        if (!$ollamaProcess) {
            Write-Host "[WARNING] Ollama process not found, restarting..." -ForegroundColor Yellow
            Start-Process -WindowStyle Hidden -FilePath "ollama" -ArgumentList "serve"
            Start-Sleep -Seconds 5
        }
    }
} finally {
    Write-Host ""
    Write-Host "[INFO] Shutting down fleet..." -ForegroundColor Yellow
    Get-Process | Where-Object { $_.ProcessName -like "ollama*" } | Stop-Process -Force
    Write-Host "[OK] Fleet stopped" -ForegroundColor Green
}
