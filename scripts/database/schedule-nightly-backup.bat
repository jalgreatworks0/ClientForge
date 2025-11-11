@echo off
REM Schedule Nightly Database Backup
REM Creates a Windows Task Scheduler task to run database backups daily at 2 AM
REM
REM Usage:
REM   Run this script as Administrator to schedule nightly backups
REM   scripts\database\schedule-nightly-backup.bat

echo ========================================================================
echo     Schedule Nightly Database Backup - ClientForge CRM
echo ========================================================================
echo.

REM Get the script directory
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..\..
set BACKUP_SCRIPT=%PROJECT_ROOT%\scripts\database\backup-database.ts

echo Project Root: %PROJECT_ROOT%
echo Backup Script: %BACKUP_SCRIPT%
echo.

REM Check if backup script exists
if not exist "%BACKUP_SCRIPT%" (
    echo ERROR: Backup script not found at %BACKUP_SCRIPT%
    exit /b 1
)

echo Creating Windows Task Scheduler task...
echo.

REM Create the task to run daily at 2:00 AM
schtasks /create ^
    /tn "ClientForge-DatabaseBackup" ^
    /tr "cmd /c \"cd /d %PROJECT_ROOT% && npx tsx scripts\database\backup-database.ts >> logs\backup.log 2>&1\"" ^
    /sc daily ^
    /st 02:00 ^
    /rl highest ^
    /f

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================================
    echo SUCCESS: Nightly backup scheduled successfully!
    echo ========================================================================
    echo.
    echo Task Name: ClientForge-DatabaseBackup
    echo Schedule: Daily at 2:00 AM
    echo Log File: %PROJECT_ROOT%\logs\backup.log
    echo.
    echo To view the task:
    echo   schtasks /query /tn "ClientForge-DatabaseBackup" /fo LIST /v
    echo.
    echo To run the task manually:
    echo   schtasks /run /tn "ClientForge-DatabaseBackup"
    echo.
    echo To delete the task:
    echo   schtasks /delete /tn "ClientForge-DatabaseBackup" /f
    echo.
) else (
    echo.
    echo ERROR: Failed to create scheduled task
    echo Make sure you are running this script as Administrator
    exit /b 1
)

pause
