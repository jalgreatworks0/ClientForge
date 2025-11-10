# ClientForge CRM Audit Analysis Script
# Phase 1: Codebase Structure Analysis

Write-Host "=== CLIENTFORGE CRM AUDIT - PHASE 1: CODEBASE ANALYSIS ===" -ForegroundColor Cyan
Write-Host ""

# Get all files excluding build artifacts
$files = Get-ChildItem -Path "D:\clientforge-crm" -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notmatch 'node_modules|\.git|dist|build|coverage|\.next' }

# File counts by extension
Write-Host "File Counts by Extension:" -ForegroundColor Yellow
$byExt = $files | Group-Object Extension | Sort-Object Count -Descending | Select-Object -First 20
$byExt | ForEach-Object {
    Write-Host "  $($_.Name.PadRight(15)): $($_.Count)"
}

Write-Host ""
Write-Host "Total Files: $($files.Count)" -ForegroundColor Green

# Code files
$codeFiles = $files | Where-Object { $_.Extension -match '\.(ts|tsx|js|jsx|py|sql)$' }
Write-Host "Code Files: $($codeFiles.Count)" -ForegroundColor Green

# Documentation files
$docFiles = $files | Where-Object { $_.Extension -eq '.md' }
Write-Host "Documentation Files: $($docFiles.Count)" -ForegroundColor Green

# Configuration files
$configFiles = $files | Where-Object { $_.Extension -match '\.(json|yaml|yml|toml|env|ini)$' }
Write-Host "Configuration Files: $($configFiles.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "Top-level Directory Structure:" -ForegroundColor Yellow
Get-ChildItem -Path "D:\clientforge-crm" -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -notmatch 'node_modules|\.git|dist|build|coverage' } |
    ForEach-Object { Write-Host "  - $($_.Name)" }

Write-Host ""
Write-Host "=== PHASE 1 COMPLETE ===" -ForegroundColor Green
