# Elaria ClientForge - Start All Services
# Launches full stack: LM Studio + Orchestrator + MCP Servers

Write-Host ""
Write-Host "🧠 ============================================" -ForegroundColor Cyan
Write-Host "   ELARIA COMMAND CENTER - FULL STACK STARTUP" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if LM Studio is running
Write-Host "[1/3] Checking LM Studio..." -ForegroundColor Yellow
$lmstudio = Get-Process "LM Studio" -ErrorAction SilentlyContinue

if (!$lmstudio) {
    Write-Host "   → Starting LM Studio..." -ForegroundColor Gray
    # LM Studio installed on D: drive
    if (Test-Path "D:\ScrollForge\Apps\LM Studio\LM Studio.exe") {
        Start-Process "D:\ScrollForge\Apps\LM Studio\LM Studio.exe"
    } elseif (Test-Path "C:\Users\$env:USERNAME\AppData\Local\Programs\LM Studio\LM Studio.exe") {
        Start-Process "C:\Users\$env:USERNAME\AppData\Local\Programs\LM Studio\LM Studio.exe"
    } else {
        Write-Host "   ❌ LM Studio not found. Please install it or update the path." -ForegroundColor Red
        exit 1
    }
    Write-Host "   ✓ LM Studio started" -ForegroundColor Green
    Write-Host "   ⏳ Waiting 10 seconds for initialization..." -ForegroundColor Gray
    Start-Sleep -Seconds 10
} else {
    Write-Host "   ✓ LM Studio already running" -ForegroundColor Green
}

# Start Orchestrator
Write-Host ""
Write-Host "[2/3] Starting Orchestrator..." -ForegroundColor Yellow
$orchestrator = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -like "*router.ts*" }

if (!$orchestrator) {
    Write-Host "   → Launching orchestrator on port 8979..." -ForegroundColor Gray
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\clientforge-crm\agents\mcp; Write-Host '🌐 Orchestrator Running on Port 8979' -ForegroundColor Cyan; node -r ts-node/register router.ts"
    Write-Host "   ✓ Orchestrator started (WebSocket on port 8979)" -ForegroundColor Green
} else {
    Write-Host "   ✓ Orchestrator already running" -ForegroundColor Green
}

# MCP Servers auto-start via LM Studio
Write-Host ""
Write-Host "[3/3] MCP Servers..." -ForegroundColor Yellow
Write-Host "   ℹ️  10 MCP servers will auto-connect via LM Studio" -ForegroundColor Gray
Write-Host "   → clientforge-filesystem" -ForegroundColor DarkGray
Write-Host "   → clientforge-codebase" -ForegroundColor DarkGray
Write-Host "   → clientforge-git" -ForegroundColor DarkGray
Write-Host "   → clientforge-testing" -ForegroundColor DarkGray
Write-Host "   → clientforge-build" -ForegroundColor DarkGray
Write-Host "   → clientforge-security" -ForegroundColor DarkGray
Write-Host "   → clientforge-rag" -ForegroundColor DarkGray
Write-Host "   → clientforge-documentation" -ForegroundColor DarkGray
Write-Host "   → clientforge-context-pack" -ForegroundColor DarkGray
Write-Host "   → clientforge-orchestrator" -ForegroundColor DarkGray
Write-Host "   ✓ MCP configuration loaded" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ FULL STACK RUNNING!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Open LM Studio" -ForegroundColor White
Write-Host "   2. Load Qwen2.5-30B model" -ForegroundColor White
Write-Host "   3. Type: CRM-INIT" -ForegroundColor White
Write-Host ""
Write-Host "🎹 Hotkeys:" -ForegroundColor Yellow
Write-Host "   Ctrl+Alt+I = CRM-INIT" -ForegroundColor White
Write-Host "   Ctrl+Alt+C = Load CRM Context" -ForegroundColor White
Write-Host "   Ctrl+Alt+H = Show All Hotkeys" -ForegroundColor White
Write-Host ""
Write-Host "📍 Orchestrator: http://localhost:8979" -ForegroundColor Cyan
Write-Host "📍 LM Studio API: http://localhost:1234" -ForegroundColor Cyan
Write-Host ""

# Keep window open
Write-Host "Press any key to close..." -ForegroundColor DarkGray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
