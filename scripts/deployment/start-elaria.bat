@echo off
:: Elaria LM Studio Initialization Script
:: Bridges ClientForge CRM with ScrollForge LM Studio

echo ========================================
echo   ELARIA COMMAND CENTER INITIALIZATION
echo   ScrollForge LM Studio Bridge v1.0
echo ========================================
echo.

:: Set paths
set SCROLLFORGE_PATH=D:\scrollforge\apps\LMStudio
set CLIENTFORGE_PATH=D:\clientforge-crm
set LMSTUDIO_EXE=%SCROLLFORGE_PATH%\LM Studio.exe

:: Check if LM Studio exists
if not exist "%LMSTUDIO_EXE%" (
    echo [ERROR] LM Studio not found at: %SCROLLFORGE_PATH%
    echo Please verify installation path.
    pause
    exit /b 1
)

echo [✓] LM Studio found at ScrollForge location
echo.

:: Check if server is already running
echo Checking LM Studio server status...
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:1234/health' -Method GET -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"

if %ERRORLEVEL% EQU 0 (
    echo [✓] LM Studio server already running
) else (
    echo [!] Starting LM Studio server...
    start "" "%LMSTUDIO_EXE%" server start --port 1234 --cors --api openai
    
    :: Wait for server to start
    timeout /t 5 /nobreak > nul
    
    :: Verify server started
    powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:1234/health' -Method GET -TimeoutSec 5; if ($response.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
    
    if %ERRORLEVEL% EQU 0 (
        echo [✓] LM Studio server started successfully
    ) else (
        echo [ERROR] Failed to start LM Studio server
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo   SYSTEM STATUS
echo ========================================
echo.
echo [✓] ScrollForge Path: %SCROLLFORGE_PATH%
echo [✓] ClientForge Path: %CLIENTFORGE_PATH%
echo [✓] LM Studio Server: http://localhost:1234
echo [✓] OpenAI Compatible API: Enabled
echo.

:: Initialize ClientForge AI Router connection
echo Configuring ClientForge AI Router...
cd /d %CLIENTFORGE_PATH%

:: Update environment variables
setx LMSTUDIO_ENDPOINT "http://localhost:1234/v1" > nul 2>&1
setx LMSTUDIO_PATH "%SCROLLFORGE_PATH%" > nul 2>&1
setx ELARIA_ENABLED "true" > nul 2>&1

echo [✓] Environment variables configured
echo.

:: Start Elaria orchestrator
echo Starting Elaria Orchestrator...
start /B node ai\orchestration\elaria-controller.js

echo.
echo ========================================
echo   ELARIA COMMAND CENTER READY
echo ========================================
echo.
echo Available Models:
echo   • Coding: qwen-coder-30b (Q4_K_M)
echo   • Reasoning: llama-3.1-70b (Q3_K_S)
echo   • Chat: mistral-7b (Q5_K_M)
echo.
echo API Endpoints:
echo   • Chat: http://localhost:1234/v1/chat/completions
echo   • Completions: http://localhost:1234/v1/completions
echo   • Models: http://localhost:1234/v1/models
echo.
echo Press any key to continue...
pause > nul
