# Elaria ClientForge - Session Backup
# Creates timestamped backup of current session state

Write-Host ""
Write-Host "💾 Creating session backup..." -ForegroundColor Cyan

$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "D:\clientforge-crm\06_BACKUPS\sessions\$timestamp"

# Create backup directory
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Write-Host "✓ Backup directory created: $backupDir" -ForegroundColor Green

# Backup LM Studio chat history
Write-Host "→ Backing up LM Studio chat history..." -ForegroundColor Gray
$lmstudioData = "$env:APPDATA\LM Studio"
if (Test-Path "$lmstudioData\chat_history.json") {
    Copy-Item "$lmstudioData\chat_history.json" "$backupDir\chat_history.json" -ErrorAction SilentlyContinue
    Write-Host "  ✓ Chat history backed up" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  Chat history not found" -ForegroundColor Yellow
}

# Backup MCP logs
Write-Host "→ Backing up MCP logs..." -ForegroundColor Gray
if (Test-Path "D:\clientforge-crm\logs\mcp") {
    New-Item -ItemType Directory -Path "$backupDir\mcp_logs" -Force | Out-Null
    Copy-Item "D:\clientforge-crm\logs\mcp\*.log" "$backupDir\mcp_logs\" -Recurse -ErrorAction SilentlyContinue
    Write-Host "  ✓ MCP logs backed up" -ForegroundColor Green
} else {
    Write-Host "  ⚠️  MCP logs not found" -ForegroundColor Yellow
}

# Backup git status
Write-Host "→ Capturing git status..." -ForegroundColor Gray
Set-Location "D:\clientforge-crm"
git status > "$backupDir\git_status.txt" 2>&1
git log -5 --oneline > "$backupDir\git_recent_commits.txt" 2>&1
git diff --stat > "$backupDir\git_diff_stat.txt" 2>&1
Write-Host "  ✓ Git state captured" -ForegroundColor Green

# Backup context pack info
Write-Host "→ Saving context pack info..." -ForegroundColor Gray
if (Test-Path "D:\clientforge-crm\docs\claude\11_CONTEXT_PACKS.md") {
    Copy-Item "D:\clientforge-crm\docs\claude\11_CONTEXT_PACKS.md" "$backupDir\context_packs.md"
    Write-Host "  ✓ Context pack info saved" -ForegroundColor Green
}

# Create manifest
Write-Host "→ Creating backup manifest..." -ForegroundColor Gray
$manifest = @"
ClientForge Session Backup
==========================
Timestamp: $timestamp
Backup Location: $backupDir

Contents:
- chat_history.json (LM Studio conversations)
- mcp_logs/ (MCP server logs)
- git_status.txt (Current git state)
- git_recent_commits.txt (Last 5 commits)
- git_diff_stat.txt (Uncommitted changes)
- context_packs.md (Context pack definitions)

Restore Instructions:
1. Copy chat_history.json to %APPDATA%\LM Studio\
2. Review git status and restore needed changes
3. Check MCP logs for any errors
"@

$manifest | Out-File "$backupDir\MANIFEST.txt" -Encoding UTF8
Write-Host "  ✓ Manifest created" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ SESSION BACKED UP SUCCESSFULLY" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📁 Location: $backupDir" -ForegroundColor White
Write-Host ""
Write-Host "Files backed up:" -ForegroundColor Yellow
Get-ChildItem $backupDir -Recurse | ForEach-Object {
    $size = if ($_.PSIsContainer) { "DIR" } else { "$([math]::Round($_.Length/1KB, 2)) KB" }
    Write-Host "   $($_.Name) - $size" -ForegroundColor Gray
}
Write-Host ""

# Open backup folder
$openFolder = Read-Host "Open backup folder? (Y/N)"
if ($openFolder -eq "Y" -or $openFolder -eq "y") {
    Start-Process explorer.exe $backupDir
}
