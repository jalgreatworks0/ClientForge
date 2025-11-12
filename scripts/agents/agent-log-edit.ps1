#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Log GPT agent file modifications to audit trail

.DESCRIPTION
    Records all file changes made by the GPT Architect agent across all drives.
    Creates daily log files with timestamp, path, reason, and task ID.

.PARAMETER PathTouched
    Absolute path to the file that was created/modified

.PARAMETER Reason
    Brief description of why the file was changed

.PARAMETER TaskId
    Optional unique task identifier for tracking

.EXAMPLE
    .\agent-log-edit.ps1 -PathTouched "C:\Dev\test.txt" -Reason "Testing" -TaskId "req_abc123"

.NOTES
    Called automatically by GPT agent after cross-drive writes
    Logs stored in: logs/agent-change-log/YYYY-MM-DD.log
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$PathTouched,

    [Parameter(Mandatory=$true)]
    [string]$Reason,

    [Parameter(Mandatory=$false)]
    [string]$TaskId = ""
)

# Timestamp for log entry
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Daily log file (one per day)
$day = Get-Date -Format "yyyy-MM-dd"
$logDir = Join-Path $PSScriptRoot "..\..\logs\agent-change-log"
$logPath = Join-Path $logDir "$day.log"

# Ensure log directory exists
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}

# Format log entry
$taskPart = if ($TaskId) { "TASK=$TaskId " } else { "" }
$logEntry = "[$timestamp] ${taskPart}PATH=$PathTouched REASON=$Reason"

# Append to daily log
Add-Content -Path $logPath -Value $logEntry -Encoding UTF8

# Output confirmation
Write-Host "✅ Logged: $PathTouched" -ForegroundColor Green
Write-Host "   Log file: $logPath" -ForegroundColor Gray
Write-Host "   Reason: $Reason" -ForegroundColor Gray

# Return success
exit 0
