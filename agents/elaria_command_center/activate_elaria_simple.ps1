# Elaria Simple Activation Script for LM Studio
# Location: D:\ClientForge\03_BOTS\elaria_command_center\activate_elaria_simple.ps1

param(
    [switch]$SkipTests = $false
)

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  ELARIA COMMAND CENTER - ACTIVATION" -ForegroundColor Cyan
Write-Host "  ClientForge CRM - LM Studio Integration" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check LM Studio
Write-Host "[1/5] Checking LM Studio..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:1234/v1/models" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "  OK - LM Studio is running" -ForegroundColor Green
    Write-Host "  Models loaded: $($response.data.Count)" -ForegroundColor Gray
} catch {
    Write-Host "  ERROR - LM Studio is not responding on port 1234" -ForegroundColor Red
    Write-Host "  Please start LM Studio and load the Qwen model" -ForegroundColor Yellow
    exit 1
}

# Step 2: Check directory structure
Write-Host ""
Write-Host "[2/5] Checking directories..." -ForegroundColor Yellow
$rootPath = "D:\ClientForge"
if (Test-Path $rootPath) {
    Write-Host "  OK - ClientForge root exists" -ForegroundColor Green
} else {
    Write-Host "  ERROR - ClientForge root not found at $rootPath" -ForegroundColor Red
    exit 1
}

# Step 3: Check critical files
Write-Host ""
Write-Host "[3/5] Checking critical files..." -ForegroundColor Yellow
$readmePath = Join-Path $rootPath "README.md"
if (Test-Path $readmePath) {
    $size = (Get-Item $readmePath).Length
    Write-Host "  OK - README.md found ($size bytes)" -ForegroundColor Green
} else {
    Write-Host "  WARNING - README.md not found (should be created)" -ForegroundColor Yellow
}

# Step 4: Check Node.js/NPX
Write-Host ""
Write-Host "[4/5] Checking MCP dependencies..." -ForegroundColor Yellow
try {
    $nodeVer = node --version 2>$null
    Write-Host "  OK - Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  WARNING - Node.js not found (needed for MCP servers)" -ForegroundColor Yellow
}

# Step 5: Test API
Write-Host ""
Write-Host "[5/5] Testing Responses API..." -ForegroundColor Yellow
if (-not $SkipTests) {
    $testBody = @{
        model = "qwen2.5-30b-a3b"
        input = "Respond with 'ONLINE' if you can read this."
        reasoning = @{ effort = "low" }
    } | ConvertTo-Json -Depth 5

    try {
        $testResponse = Invoke-RestMethod -Method Post `
            -Uri "http://localhost:1234/v1/responses" `
            -Body $testBody `
            -ContentType "application/json" `
            -TimeoutSec 30

        Write-Host "  OK - API Response received" -ForegroundColor Green
        Write-Host "  Response: $($testResponse.output_text)" -ForegroundColor Gray
    } catch {
        Write-Host "  ERROR - API test failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "  Make sure a model is loaded in LM Studio" -ForegroundColor Yellow
    }
} else {
    Write-Host "  SKIPPED (-SkipTests flag used)" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host "  ELARIA ACTIVATION COMPLETE" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Enable Remote MCP in LM Studio: Developer -> Settings" -ForegroundColor White
Write-Host "  2. Load system prompt (to be created)" -ForegroundColor White
Write-Host "  3. Run: .\test_lmstudio_responses.ps1" -ForegroundColor White
Write-Host "  4. Run: .\test_lmstudio_mcp.ps1" -ForegroundColor White
Write-Host "  5. Send command: CRM-INIT" -ForegroundColor White
Write-Host ""
Write-Host "Files created in: D:\ClientForge\03_BOTS\elaria_command_center\" -ForegroundColor Cyan
Write-Host ""
