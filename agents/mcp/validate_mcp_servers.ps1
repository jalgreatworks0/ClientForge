Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  MCP Server Health Check - Claude Desktop" -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

$healthyCount = 0
$failedCount = 0

# Check LM Studio
Write-Host "[1/5] Checking LM Studio API..." -NoNewline
try {
    $response = Invoke-WebRequest -Uri "http://localhost:1234/v1/models" -TimeoutSec 5 -UseBasicParsing -ErrorAction Stop
    Write-Host " [OK]" -ForegroundColor Green
    $healthyCount++
} catch {
    Write-Host " [FAILED]" -ForegroundColor Red
    $failedCount++
}

# Check MCP server files
Write-Host "[2/5] Checking MCP server files..." -NoNewline
$mcpPath = "D:\clientforge-crm\agents\mcp\servers"
$mcpCount = (Get-ChildItem "$mcpPath\*-mcp-server.js" -ErrorAction SilentlyContinue).Count
if ($mcpCount -eq 13) {
    Write-Host " [OK] $mcpCount servers found" -ForegroundColor Green
    $healthyCount++
} else {
    Write-Host " [FAILED] Only $mcpCount/13 servers found" -ForegroundColor Red
    $failedCount++
}

# Check package.json
Write-Host "[3/5] Checking MCP dependencies..." -NoNewline
if (Test-Path "$mcpPath\package.json") {
    Write-Host " [OK]" -ForegroundColor Green
    $healthyCount++
} else {
    Write-Host " [FAILED]" -ForegroundColor Red
    $failedCount++
}

# Check Claude config
Write-Host "[4/5] Checking Claude Desktop config..." -NoNewline
$configPath = "C:\Users\ScrollForge\AppData\Roaming\Claude\claude_desktop_config.json"
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
    $serverCount = ($config.mcpServers | Get-Member -MemberType NoteProperty).Count
    Write-Host " [OK] $serverCount servers configured" -ForegroundColor Green
    $healthyCount++
} else {
    Write-Host " [FAILED]" -ForegroundColor Red
    $failedCount++
}

# Check GPUs
Write-Host "[5/5] Checking NVIDIA GPUs..." -NoNewline
try {
    $gpuInfo = & nvidia-smi --query-gpu=name --format=csv,noheader 2>$null
    $gpuCount = ($gpuInfo -split "`n").Count
    Write-Host " [OK] $gpuCount GPUs detected" -ForegroundColor Green
    $healthyCount++
} catch {
    Write-Host " [WARNING] nvidia-smi not available" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "  Summary: $healthyCount passed, $failedCount failed" -ForegroundColor White
Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host ""

if ($failedCount -eq 0) {
    Write-Host "[OK] All checks passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[WARNING] Some checks failed. See above for details." -ForegroundColor Yellow
    exit 0
}
