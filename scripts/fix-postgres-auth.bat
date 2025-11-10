@echo off
REM =========================================
REM Fix PostgreSQL Authentication
REM Configures PostgreSQL to use trust auth on localhost
REM =========================================

echo.
echo ========================================
echo  PostgreSQL Authentication Fix
echo ========================================
echo.
echo This script will configure PostgreSQL to allow
echo password-less connections from localhost.
echo.
echo WARNING: This is for development only!
echo.
pause

REM Find PostgreSQL installation
set PG_PATH=
for %%v in (17 16 15 14 13 12) do (
    if exist "C:\Program Files\PostgreSQL\%%v\data\pg_hba.conf" (
        set PG_PATH=C:\Program Files\PostgreSQL\%%v
        set PG_VERSION=%%v
        goto :found
    )
)

:found
if "%PG_PATH%"=="" (
    echo [ERROR] PostgreSQL installation not found!
    echo Please install PostgreSQL or locate pg_hba.conf manually.
    pause
    exit /b 1
)

echo.
echo [INFO] Found PostgreSQL %PG_VERSION% at: %PG_PATH%
echo.

REM Backup pg_hba.conf
echo [INFO] Creating backup of pg_hba.conf...
copy "%PG_PATH%\data\pg_hba.conf" "%PG_PATH%\data\pg_hba.conf.backup.%date:~-4%%date:~-7,2%%date:~-10,2%_%time:~0,2%%time:~3,2%%time:~6,2%" >nul

REM Update pg_hba.conf to use trust authentication for localhost
echo [INFO] Updating pg_hba.conf for trust authentication...
powershell -Command "(Get-Content '%PG_PATH%\data\pg_hba.conf') -replace '^(host\s+all\s+all\s+127\.0\.0\.1/32\s+)\S+', '${1}trust' -replace '^(host\s+all\s+all\s+::1/128\s+)\S+', '${1}trust' | Set-Content '%PG_PATH%\data\pg_hba.conf'"

echo.
echo [INFO] Restarting PostgreSQL service...
net stop postgresql-x64-%PG_VERSION% >nul 2>&1
timeout /t 2 /nobreak >nul
net start postgresql-x64-%PG_VERSION%

if errorlevel 1 (
    echo.
    echo [WARNING] Could not restart PostgreSQL automatically.
    echo Please restart PostgreSQL service manually:
    echo   1. Open Services (services.msc)
    echo   2. Find "postgresql-x64-%PG_VERSION%"
    echo   3. Right-click and select Restart
    echo.
    pause
    exit /b 1
)

echo.
echo ========================================
echo [SUCCESS] PostgreSQL configured!
echo ========================================
echo.
echo PostgreSQL is now configured to allow password-less
echo connections from localhost (trust authentication).
echo.
echo Backup saved to:
echo %PG_PATH%\data\pg_hba.conf.backup.*
echo.
echo You can now restart your backend server.
echo.
pause
