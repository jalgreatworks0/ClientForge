# Elaria Activation Script for LM Studio
# Location: D:\ClientForge\03_BOTS\elaria_command_center\activate_elaria.ps1
# Purpose: Set up and verify Elaria command center is ready

param(
    [switch]$SkipTests = $false,
    [switch]$StartOrchestrator = $false
)

$ErrorActionPreference = "Stop"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ELARIA COMMAND CENTER - ACTIVATION SEQUENCE            ║" -ForegroundColor Cyan
Write-Host "║     ClientForge CRM - LM Studio Integration                ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Step 1: Verify LM Studio is running
Write-Host "[1/7] Checking LM Studio availability..." -ForegroundColor Yellow
try {
    $lmStudioCheck = Invoke-RestMethod -Uri "http://localhost:1234/v1/models" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  ✓ LM Studio is running on port 1234" -ForegroundColor Green
    Write-Host "  Models loaded: $($lmStudioCheck.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "  ✗ LM Studio is not responding on port 1234" -ForegroundColor Red
    Write-Host "  Please start LM Studio and load the Qwen 2.5 30B model" -ForegroundColor Yellow
    exit 1
}

# Step 2: Verify ClientForge directory structure
Write-Host ""
Write-Host "[2/7] Verifying ClientForge directory structure..." -ForegroundColor Yellow
$requiredDirs = @(
    "D:\ClientForge\00_CORE",
    "D:\ClientForge\01_PROJECTS",
    "D:\ClientForge\02_CODE",
    "D:\ClientForge\03_BOTS",
    "D:\ClientForge\04_MCP_SKILLS",
    "D:\ClientForge\05_SHARED_AI",
    "D:\ClientForge\06_BACKUPS",
    "D:\ClientForge\_staging"
)

$missingDirs = @()
foreach ($dir in $requiredDirs) {
    if (Test-Path $dir) {
        Write-Host "  ✓ $dir" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $dir (missing)" -ForegroundColor Red
        $missingDirs += $dir
    }
}

if ($missingDirs.Count -gt 0) {
    Write-Host ""
    $create = Read-Host "Create missing directories? (Y/N)"
    if ($create -eq "Y" -or $create -eq "y") {
        foreach ($dir in $missingDirs) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
            Write-Host "  Created: $dir" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  Cannot proceed without required directories" -ForegroundColor Red
        exit 1
    }
}

# Step 3: Verify critical files exist
Write-Host ""
Write-Host "[3/7] Checking critical context files..." -ForegroundColor Yellow
$criticalFiles = @(
    "D:\ClientForge\README.md",
    "D:\ClientForge\05_SHARED_AI\context_pack\project_overview.md",
    "D:\ClientForge\05_SHARED_AI\context_pack\roles_rules.md"
)

foreach ($file in $criticalFiles) {
    if (Test-Path $file) {
        $size = (Get-Item $file).Length
        Write-Host "  ✓ $file ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ $file (missing - create this manually)" -ForegroundColor Yellow
    }
}

# Step 4: Check Node.js/NPX for MCP servers
Write-Host ""
Write-Host "[4/7] Verifying MCP server dependencies..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version 2>$null
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found - install from https://nodejs.org" -ForegroundColor Red
}

try {
    $npxVersion = npx --version 2>$null
    Write-Host "  ✓ npx: $npxVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ npx not found - comes with Node.js" -ForegroundColor Red
}

# Step 5: Start orchestrator if requested
Write-Host ""
Write-Host "[5/7] Orchestrator service check..." -ForegroundColor Yellow
if ($StartOrchestrator) {
    try {
        $orchestratorPath = "D:\ClientForge\orchestrator"
        if (Test-Path "$orchestratorPath\main.py") {
            Write-Host "  Starting orchestrator on port 8979..." -ForegroundColor Cyan
            Start-Process python -ArgumentList "$orchestratorPath\main.py" -WorkingDirectory $orchestratorPath -WindowStyle Minimized
            Start-Sleep -Seconds 3

            $orchCheck = Invoke-RestMethod -Uri "http://127.0.0.1:8979/status" -TimeoutSec 5
            Write-Host "  ✓ Orchestrator running: $($orchCheck.status)" -ForegroundColor Green
        } else {
            Write-Host "  ⚠ Orchestrator not found at $orchestratorPath" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "  ⚠ Orchestrator not running (optional)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Skipped (use -StartOrchestrator to launch)" -ForegroundColor Gray
}

# Step 6: Test LM Studio Responses API
Write-Host ""
Write-Host "[6/7] Testing LM Studio Responses API..." -ForegroundColor Yellow
if (-not $SkipTests) {
    & "D:\ClientForge\03_BOTS\elaria_command_center\test_lmstudio_responses.ps1"
} else {
    Write-Host "  Skipped (use without -SkipTests to run)" -ForegroundColor Gray
}

# Step 7: Display activation summary
Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║     ELARIA ACTIVATION COMPLETE                             ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration Summary:" -ForegroundColor Cyan
Write-Host "  • LM Studio endpoint: http://localhost:1234/v1/responses" -ForegroundColor White
Write-Host "  • ClientForge root: D:\ClientForge" -ForegroundColor White
Write-Host "  • Staging directory: D:\ClientForge\_staging" -ForegroundColor White
Write-Host "  • System prompt: D:\ClientForge\03_BOTS\elaria_command_center\system_prompt.md" -ForegroundColor White
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Load system prompt in LM Studio chat" -ForegroundColor White
Write-Host "  2. Enable Remote MCP: Developer → Settings → Enable Remote MCP" -ForegroundColor White
Write-Host "  3. Test MCP tools: .\test_lmstudio_mcp.ps1" -ForegroundColor White
Write-Host "  4. Send first command to Elaria: 'CRM-INIT'" -ForegroundColor White
Write-Host ""
Write-Host "Example cURL to test:" -ForegroundColor Cyan
Write-Host @"
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "CRM-INIT",
    "reasoning": { "effort": "medium" }
  }'
"@ -ForegroundColor Gray
Write-Host ""
