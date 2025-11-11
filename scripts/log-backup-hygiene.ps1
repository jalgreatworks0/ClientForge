# =====================================================
# ClientForge CRM - Log & Backup Hygiene Script
# =====================================================
# Automates log rotation, compression, and backup management
#
# Features:
# - Archives logs older than 7 days
# - Compresses archived logs to .zip (saves ~96% space)
# - Keeps only last 5 database dumps
# - Maintains clean log structure
#
# Usage: Run manually or via scheduled task
# =====================================================

param(
    [int]$LogRetentionDays = 7,
    [int]$MaxDatabaseBackups = 5,
    [switch]$DryRun = $false
)

$RootPath = "d:\clientforge-crm"
$LogsPath = "$RootPath\logs"
$ArchivePath = "$RootPath\archive\logs"
$BackupsPath = "$RootPath\database\backups"
$Date = Get-Date -Format "yyyy-MM-dd"
$CutoffDate = (Get-Date).AddDays(-$LogRetentionDays)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Log & Backup Hygiene Script" -ForegroundColor Cyan
Write-Host "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

if ($DryRun) {
    Write-Host "[DRY RUN MODE] No files will be modified`n" -ForegroundColor Yellow
}

# =====================================================
# PHASE 1: Archive Old Logs
# =====================================================
Write-Host "[PHASE 1] Archiving logs older than $LogRetentionDays days..." -ForegroundColor Green

# Find logs older than cutoff date (excluding session-logs)
$OldLogs = Get-ChildItem -Path $LogsPath -Filter "*.log" -Recurse -File |
    Where-Object {
        $_.LastWriteTime -lt $CutoffDate -and
        $_.FullName -notlike "*session-logs*" -and
        $_.FullName -notlike "*archive*"
    }

if ($OldLogs.Count -eq 0) {
    Write-Host "  No logs older than $LogRetentionDays days found." -ForegroundColor Gray
} else {
    Write-Host "  Found $($OldLogs.Count) log(s) to archive:" -ForegroundColor Yellow
    foreach ($log in $OldLogs) {
        $age = [math]::Round(((Get-Date) - $log.LastWriteTime).TotalDays, 1)
        $size = [math]::Round($log.Length / 1MB, 2)
        Write-Host "    - $($log.Name) (${age} days old, ${size} MB)" -ForegroundColor Gray
    }

    if (-not $DryRun) {
        # Group logs by month for compression
        $LogsByMonth = $OldLogs | Group-Object { $_.LastWriteTime.ToString("yyyy-MM") }

        foreach ($group in $LogsByMonth) {
            $monthFolder = $group.Name
            $archiveFile = "$ArchivePath\logs-$monthFolder.zip"

            Write-Host "`n  Compressing logs from $monthFolder..." -ForegroundColor Cyan

            # Create temp directory for logs to compress
            $tempPath = "$env:TEMP\clientforge-logs-$monthFolder"
            New-Item -ItemType Directory -Path $tempPath -Force | Out-Null

            foreach ($log in $group.Group) {
                Copy-Item -Path $log.FullName -Destination $tempPath
            }

            # Compress the logs
            Compress-Archive -Path "$tempPath\*" -DestinationPath $archiveFile -CompressionLevel Optimal -Force

            # Get compression stats
            $originalSize = ($group.Group | Measure-Object -Property Length -Sum).Sum
            $compressedSize = (Get-Item $archiveFile).Length
            $compressionRatio = [math]::Round((1 - ($compressedSize / $originalSize)) * 100, 1)

            Write-Host "    Created: $(Split-Path $archiveFile -Leaf)" -ForegroundColor Green
            Write-Host "    Original: $([math]::Round($originalSize / 1MB, 2)) MB" -ForegroundColor Gray
            Write-Host "    Compressed: $([math]::Round($compressedSize / 1KB, 2)) KB" -ForegroundColor Gray
            Write-Host "    Saved: $compressionRatio%" -ForegroundColor Green

            # Remove original logs
            foreach ($log in $group.Group) {
                Remove-Item -Path $log.FullName -Force
                Write-Host "    Removed: $($log.Name)" -ForegroundColor Gray
            }

            # Clean up temp directory
            Remove-Item -Path $tempPath -Recurse -Force
        }
    }
}

# =====================================================
# PHASE 2: Archive Old Session Logs
# =====================================================
Write-Host "`n[PHASE 2] Archiving session logs older than $LogRetentionDays days..." -ForegroundColor Green

$SessionLogsPath = "$LogsPath\session-logs"
if (Test-Path $SessionLogsPath) {
    $OldSessionLogs = Get-ChildItem -Path $SessionLogsPath -Filter "*.md" -File |
        Where-Object { $_.LastWriteTime -lt $CutoffDate }

    if ($OldSessionLogs.Count -eq 0) {
        Write-Host "  No session logs older than $LogRetentionDays days found." -ForegroundColor Gray
    } else {
        Write-Host "  Found $($OldSessionLogs.Count) session log(s) to archive:" -ForegroundColor Yellow
        foreach ($log in $OldSessionLogs) {
            $age = [math]::Round(((Get-Date) - $log.LastWriteTime).TotalDays, 1)
            $size = [math]::Round($log.Length / 1KB, 2)
            Write-Host "    - $($log.Name) (${age} days old, ${size} KB)" -ForegroundColor Gray
        }

        if (-not $DryRun) {
            $sessionArchive = "$ArchivePath\session-logs-$Date.zip"

            # Create temp directory
            $tempPath = "$env:TEMP\clientforge-session-logs"
            New-Item -ItemType Directory -Path $tempPath -Force | Out-Null

            foreach ($log in $OldSessionLogs) {
                Copy-Item -Path $log.FullName -Destination $tempPath
            }

            # Compress
            Compress-Archive -Path "$tempPath\*" -DestinationPath $sessionArchive -CompressionLevel Optimal -Force

            Write-Host "    Created: $(Split-Path $sessionArchive -Leaf)" -ForegroundColor Green

            # Remove originals
            foreach ($log in $OldSessionLogs) {
                Remove-Item -Path $log.FullName -Force
            }

            # Clean up temp
            Remove-Item -Path $tempPath -Recurse -Force

            Write-Host "    Archived $($OldSessionLogs.Count) session logs" -ForegroundColor Green
        }
    }
} else {
    Write-Host "  Session logs directory not found." -ForegroundColor Gray
}

# =====================================================
# PHASE 3: Manage Database Backups
# =====================================================
Write-Host "`n[PHASE 3] Managing database backups (keep last $MaxDatabaseBackups)..." -ForegroundColor Green

if (Test-Path $BackupsPath) {
    # Find all database backup files
    $BackupFiles = Get-ChildItem -Path $BackupsPath -Include @("*.sql", "*.dump", "*.sql.gz", "*.backup") -Recurse -File |
        Sort-Object LastWriteTime -Descending

    if ($BackupFiles.Count -eq 0) {
        Write-Host "  No database backups found." -ForegroundColor Gray
    } elseif ($BackupFiles.Count -le $MaxDatabaseBackups) {
        Write-Host "  Found $($BackupFiles.Count) backup(s) - within retention limit." -ForegroundColor Gray
    } else {
        $ToKeep = $BackupFiles | Select-Object -First $MaxDatabaseBackups
        $ToDelete = $BackupFiles | Select-Object -Skip $MaxDatabaseBackups

        Write-Host "  Found $($BackupFiles.Count) backup(s):" -ForegroundColor Yellow
        Write-Host "    Keeping: $($ToKeep.Count)" -ForegroundColor Green
        Write-Host "    Removing: $($ToDelete.Count)" -ForegroundColor Red

        foreach ($backup in $ToDelete) {
            $age = [math]::Round(((Get-Date) - $backup.LastWriteTime).TotalDays, 1)
            $size = [math]::Round($backup.Length / 1MB, 2)
            Write-Host "    - $($backup.Name) (${age} days old, ${size} MB)" -ForegroundColor Gray

            if (-not $DryRun) {
                Remove-Item -Path $backup.FullName -Force
                Write-Host "      Deleted" -ForegroundColor Red
            }
        }
    }
} else {
    Write-Host "  Database backups directory not found." -ForegroundColor Gray
}

# =====================================================
# PHASE 4: Clean Up Empty Archive Subdirectories
# =====================================================
Write-Host "`n[PHASE 4] Cleaning up empty archive directories..." -ForegroundColor Green

if (Test-Path "$LogsPath\archive") {
    $emptyDirs = Get-ChildItem -Path "$LogsPath\archive" -Directory -Recurse |
        Where-Object { (Get-ChildItem -Path $_.FullName -Force | Measure-Object).Count -eq 0 }

    if ($emptyDirs.Count -eq 0) {
        Write-Host "  No empty directories found." -ForegroundColor Gray
    } else {
        Write-Host "  Found $($emptyDirs.Count) empty director(ies):" -ForegroundColor Yellow
        foreach ($dir in $emptyDirs) {
            Write-Host "    - $($dir.FullName)" -ForegroundColor Gray
            if (-not $DryRun) {
                Remove-Item -Path $dir.FullName -Force
                Write-Host "      Removed" -ForegroundColor Red
            }
        }
    }
}

# =====================================================
# SUMMARY
# =====================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Calculate current sizes
$currentLogsSize = (Get-ChildItem -Path $LogsPath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
$archiveSize = 0
if (Test-Path $ArchivePath) {
    $archiveSize = (Get-ChildItem -Path $ArchivePath -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB
}

Write-Host "Current Logs Size: $([math]::Round($currentLogsSize, 2)) MB" -ForegroundColor White
Write-Host "Archive Size: $([math]::Round($archiveSize, 2)) MB" -ForegroundColor White

if (Test-Path $BackupsPath) {
    $backupCount = (Get-ChildItem -Path $BackupsPath -Include @("*.sql", "*.dump", "*.sql.gz", "*.backup") -Recurse -File).Count
    Write-Host "Database Backups: $backupCount file(s)" -ForegroundColor White
}

Write-Host "`nCompleted: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

# =====================================================
# SCHEDULING INSTRUCTIONS
# =====================================================
<#
To schedule this script to run automatically:

1. Open Task Scheduler (taskschd.msc)
2. Create Basic Task
3. Name: "ClientForge CRM - Log Hygiene"
4. Trigger: Daily at 2:00 AM
5. Action: Start a program
   - Program: powershell.exe
   - Arguments: -ExecutionPolicy Bypass -File "d:\clientforge-crm\scripts\log-backup-hygiene.ps1"
6. Save the task

Or use PowerShell to create the task:

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-ExecutionPolicy Bypass -File "d:\clientforge-crm\scripts\log-backup-hygiene.ps1"'
$Trigger = New-ScheduledTaskTrigger -Daily -At 2am
Register-ScheduledTask -TaskName "ClientForge-LogHygiene" -Action $Action -Trigger $Trigger -Description "Daily log rotation and cleanup for ClientForge CRM"
#>
