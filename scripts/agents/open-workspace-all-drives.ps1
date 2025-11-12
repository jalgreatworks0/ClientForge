#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Open VS Code workspace with all drives accessible

.DESCRIPTION
    Launches VS Code with the ClientForge-AllDrives.code-workspace configuration.
    This gives the GPT Architect agent access to C:\, D:\, E:\, etc.

.EXAMPLE
    .\open-workspace-all-drives.ps1

.NOTES
    Workspace file: .vscode/ClientForge-AllDrives.code-workspace
#>

$workspacePath = Join-Path $PSScriptRoot "..\..\. vscode\ClientForge-AllDrives.code-workspace"

if (-not (Test-Path $workspacePath)) {
    Write-Host "❌ Workspace file not found: $workspacePath" -ForegroundColor Red
    Write-Host "   Run setup script first to create workspace configuration" -ForegroundColor Yellow
    exit 1
}

Write-Host "🚀 Opening VS Code workspace with all-drives access..." -ForegroundColor Cyan
Write-Host "   Workspace: $workspacePath" -ForegroundColor Gray

# Launch VS Code with workspace
code $workspacePath

Write-Host "✅ VS Code launched successfully" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Install Continue extension (if not already installed)" -ForegroundColor Gray
Write-Host "2. Press Ctrl+L to open Continue chat" -ForegroundColor Gray
Write-Host "3. Try: 'C-G | Plan & Implement (All Drives)'" -ForegroundColor Gray
Write-Host ""
Write-Host "Documentation: docs/ai/GPT_AGENT_POLICY.md" -ForegroundColor Gray

exit 0
