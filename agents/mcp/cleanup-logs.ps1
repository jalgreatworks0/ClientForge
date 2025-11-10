#!/usr/bin/env pwsh
# ============================================================================
# MCP Log Cleanup Script
# Purpose: Remove log files older than specified retention period
# Usage: .\cleanup-logs.ps1 [-RetentionDays 7]
# ============================================================================

param(
    [int]$RetentionDays = 7
)

$logDir = "D:\clientforge-crm\logs\mcp"
$cutoffDate = (Get-Date).AddDays(-$RetentionDays)

Write-Host "MCP Log Cleanup - Removing files older than $RetentionDays days" -ForegroundColor Cyan
Write-Host "Log Directory: $logDir" -ForegroundColor Gray
Write-Host "Cutoff Date: $cutoffDate" -ForegroundColor Gray
Write-Host ""

if (-not (Test-Path $logDir)) {
    Write-Host "[WARNING] Log directory does not exist: $logDir" -ForegroundColor Yellow
    exit 0
}

$oldFiles = Get-ChildItem $logDir -Filter "*.log" | Where-Object {
    $_.LastWriteTime -lt $cutoffDate
}

if ($oldFiles.Count -eq 0) {
    Write-Host "[OK] No old log files to clean up" -ForegroundColor Green
    exit 0
}

Write-Host "Found $($oldFiles.Count) files to delete:" -ForegroundColor Yellow
foreach ($file in $oldFiles) {
    $ageInDays = [math]::Round(((Get-Date) - $file.LastWriteTime).TotalDays, 1)
    $sizeKB = [math]::Round($file.Length / 1KB, 1)
    Write-Host "  - $($file.Name) (${ageInDays} days old, ${sizeKB} KB)" -ForegroundColor Gray
}

Write-Host ""
$confirm = Read-Host "Delete these files? (y/n)"
if ($confirm -ne 'y') {
    Write-Host "[CANCELLED] No files deleted" -ForegroundColor Yellow
    exit 0
}

$deletedCount = 0
$deletedSizeKB = 0

foreach ($file in $oldFiles) {
    try {
        $deletedSizeKB += $file.Length / 1KB
        Remove-Item $file.FullName -Force
        $deletedCount++
    } catch {
        Write-Host "[ERROR] Failed to delete $($file.Name): $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "[OK] Deleted $deletedCount files ($([math]::Round($deletedSizeKB, 1)) KB freed)" -ForegroundColor Green
