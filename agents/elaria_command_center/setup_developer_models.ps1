# LM Studio Developer Mode - Small Models Setup
# Purpose: Configure 6 efficient small models for development/testing

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "LM STUDIO DEVELOPER MODE SETUP" -ForegroundColor Cyan
Write-Host "6 Small Models for Fast Development" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Recommended small models for development
$developmentModels = @(
    @{
        Name = "Qwen2.5 7B Instruct"
        Identifier = "qwen2.5-7b-instruct"
        Size = "~4GB"
        Speed = "Very Fast"
        Purpose = "General development, quick testing"
        HuggingFace = "Qwen/Qwen2.5-7B-Instruct-GGUF"
    },
    @{
        Name = "Phi-3 Mini 4K"
        Identifier = "phi-3-mini-4k"
        Size = "~2GB"
        Speed = "Extremely Fast"
        Purpose = "Rapid prototyping, simple tasks"
        HuggingFace = "microsoft/Phi-3-mini-4k-instruct-gguf"
    },
    @{
        Name = "TinyLlama 1.1B"
        Identifier = "tinyllama-1.1b"
        Size = "~700MB"
        Speed = "Lightning Fast"
        Purpose = "Ultra-fast testing, debugging"
        HuggingFace = "TinyLlama/TinyLlama-1.1B-Chat-v1.0-GGUF"
    },
    @{
        Name = "Gemma 2B"
        Identifier = "gemma-2b"
        Size = "~1.5GB"
        Speed = "Very Fast"
        Purpose = "Code generation, quick responses"
        HuggingFace = "google/gemma-2b-it-GGUF"
    },
    @{
        Name = "Mistral 7B v0.3"
        Identifier = "mistral-7b-v0.3"
        Size = "~4GB"
        Speed = "Fast"
        Purpose = "Balanced performance, tool use"
        HuggingFace = "mistralai/Mistral-7B-Instruct-v0.3-GGUF"
    },
    @{
        Name = "DeepSeek Coder 1.3B"
        Identifier = "deepseek-coder-1.3b"
        Size = "~800MB"
        Speed = "Extremely Fast"
        Purpose = "Code-specific tasks, debugging"
        HuggingFace = "deepseek-ai/deepseek-coder-1.3b-instruct-GGUF"
    }
)

Write-Host "Recommended Models for Development:`n" -ForegroundColor Yellow

$index = 1
foreach ($model in $developmentModels) {
    Write-Host "$index. $($model.Name)" -ForegroundColor White
    Write-Host "   ID: $($model.Identifier)" -ForegroundColor Gray
    Write-Host "   Size: $($model.Size) | Speed: $($model.Speed)" -ForegroundColor Gray
    Write-Host "   Purpose: $($model.Purpose)" -ForegroundColor Gray
    Write-Host "   Download: lms get $($model.Identifier)" -ForegroundColor Cyan
    Write-Host ""
    $index++
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "SETUP OPTIONS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Option 1: Download via LM Studio GUI (Recommended)" -ForegroundColor Yellow
Write-Host "  1. Open LM Studio application" -ForegroundColor White
Write-Host "  2. Click 'Search' tab" -ForegroundColor White
Write-Host "  3. Search for model names above" -ForegroundColor White
Write-Host "  4. Click 'Download' for each model" -ForegroundColor White
Write-Host "  5. Choose GGUF format (Q4_K_M for balance)" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Download via CLI" -ForegroundColor Yellow
Write-Host "  Run these commands to download all 6 models:`n" -ForegroundColor White

Write-Host "  # Small & Fast Models" -ForegroundColor Cyan
Write-Host "  lms get TinyLlama/TinyLlama-1.1B-Chat-v1.0" -ForegroundColor Gray
Write-Host "  lms get deepseek-ai/deepseek-coder-1.3b-instruct" -ForegroundColor Gray
Write-Host "  lms get google/gemma-2b-it" -ForegroundColor Gray
Write-Host ""
Write-Host "  # Medium Models" -ForegroundColor Cyan
Write-Host "  lms get microsoft/Phi-3-mini-4k-instruct" -ForegroundColor Gray
Write-Host "  lms get Qwen/Qwen2.5-7B-Instruct" -ForegroundColor Gray
Write-Host "  lms get mistralai/Mistral-7B-Instruct-v0.3" -ForegroundColor Gray
Write-Host ""

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "DEVELOPER MODE CONFIGURATION" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Recommended LM Studio Settings:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Server Settings:" -ForegroundColor White
Write-Host "    - Auto-start server on login: ON" -ForegroundColor Gray
Write-Host "    - Port: 1234 (default)" -ForegroundColor Gray
Write-Host "    - CORS: Enabled" -ForegroundColor Gray
Write-Host ""
Write-Host "  Model Settings:" -ForegroundColor White
Write-Host "    - JIT (Just-In-Time) Loading: ON" -ForegroundColor Gray
Write-Host "    - Auto-Evict JIT models: ON" -ForegroundColor Gray
Write-Host "    - Default TTL: 5 minutes (300 seconds)" -ForegroundColor Gray
Write-Host "    - Context Length: 4096 (for small models)" -ForegroundColor Gray
Write-Host ""
Write-Host "  Developer Mode:" -ForegroundColor White
Write-Host "    - Verbose logging: ON" -ForegroundColor Gray
Write-Host "    - Keep 2-3 models loaded maximum" -ForegroundColor Gray
Write-Host "    - Use Q4_K_M quantization (best speed/quality)" -ForegroundColor Gray
Write-Host ""

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "USAGE PATTERNS" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Model Selection by Task:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Quick Tests / Debugging:" -ForegroundColor White
Write-Host "    Use: TinyLlama 1.1B or Phi-3 Mini" -ForegroundColor Gray
Write-Host "    Speed: <1 second per response" -ForegroundColor Gray
Write-Host ""
Write-Host "  Code Generation:" -ForegroundColor White
Write-Host "    Use: DeepSeek Coder 1.3B or Gemma 2B" -ForegroundColor Gray
Write-Host "    Speed: 1-2 seconds per response" -ForegroundColor Gray
Write-Host ""
Write-Host "  General Development:" -ForegroundColor White
Write-Host "    Use: Qwen2.5 7B or Mistral 7B" -ForegroundColor Gray
Write-Host "    Speed: 2-5 seconds per response" -ForegroundColor Gray
Write-Host ""
Write-Host "  Tool Use / Agents:" -ForegroundColor White
Write-Host "    Use: Qwen2.5 7B or Mistral 7B" -ForegroundColor Gray
Write-Host "    Reason: Better instruction following" -ForegroundColor Gray
Write-Host ""

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TESTING AFTER SETUP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Verify models are available:" -ForegroundColor Yellow
Write-Host "   lms ls" -ForegroundColor Gray
Write-Host ""

Write-Host "2. Load a small model:" -ForegroundColor Yellow
Write-Host "   lms load tinyllama-1.1b" -ForegroundColor Gray
Write-Host ""

Write-Host "3. Test with Elaria:" -ForegroundColor Yellow
Write-Host "   npm test" -ForegroundColor Gray
Write-Host ""

Write-Host "4. Test agent with small model:" -ForegroundColor Yellow
Write-Host "   # Edit src/agent-act.js to use 'phi-3-mini-4k'" -ForegroundColor Gray
Write-Host "   npm run agent:sales" -ForegroundColor Gray
Write-Host ""

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "CONFIGURATION FILE TEMPLATE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

$configTemplate = @"
# .env - Developer Mode Configuration
# Location: D:\ClientForge\03_BOTS\elaria_command_center\.env

# LM Studio Settings
LM_STUDIO_BASE_URL=ws://localhost:1234
LM_STUDIO_HTTP_URL=http://localhost:1234

# Development Models (fast, small)
LM_STUDIO_TINY_MODEL=tinyllama-1.1b
LM_STUDIO_SMALL_MODEL=phi-3-mini-4k
LM_STUDIO_MEDIUM_MODEL=qwen2.5-7b-instruct
LM_STUDIO_CODE_MODEL=deepseek-coder-1.3b

# Default model for development
LM_STUDIO_MODEL=phi-3-mini-4k

# Performance Settings
LM_STUDIO_TTL=300
LM_STUDIO_CONTEXT_LENGTH=4096
LM_STUDIO_TEMPERATURE=0.3

# Feature Flags
LMSTUDIO_JIT_LOADING=true
LMSTUDIO_AUTO_EVICT=true
LMSTUDIO_VERBOSE=true
"@

Write-Host $configTemplate -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "MEMORY USAGE GUIDE" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Expected VRAM/RAM Usage:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  TinyLlama 1.1B:        ~1GB" -ForegroundColor Gray
Write-Host "  DeepSeek Coder 1.3B:   ~1.5GB" -ForegroundColor Gray
Write-Host "  Gemma 2B:              ~2GB" -ForegroundColor Gray
Write-Host "  Phi-3 Mini 4K:         ~2.5GB" -ForegroundColor Gray
Write-Host "  Qwen2.5 7B:            ~5GB" -ForegroundColor Gray
Write-Host "  Mistral 7B:            ~5GB" -ForegroundColor Gray
Write-Host ""
Write-Host "  Total for all 6:       ~17GB" -ForegroundColor Cyan
Write-Host "  Keep loaded (2-3):     ~5-10GB" -ForegroundColor Cyan
Write-Host ""
Write-Host "Your RTX 5090 (24GB VRAM): Plenty of space!" -ForegroundColor Green
Write-Host ""

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "QUICK COMPARISON TEST" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "After downloading, run this test:" -ForegroundColor Yellow
Write-Host ""

$testScript = @"
# Test each model's speed
`$models = @('tinyllama-1.1b', 'phi-3-mini-4k', 'qwen2.5-7b-instruct')

foreach (`$model in `$models) {
    Write-Host "Testing `$model..." -ForegroundColor Yellow
    lms load `$model
    `$start = Get-Date

    # Quick test via API
    `$body = @{
        model = `$model
        messages = @(@{ role = 'user'; content = 'Say hello' })
        max_tokens = 10
    } | ConvertTo-Json

    Invoke-RestMethod -Uri 'http://localhost:1234/v1/chat/completions' `
        -Method Post -ContentType 'application/json' -Body `$body

    `$elapsed = (Get-Date) - `$start
    Write-Host "  Time: `$(`$elapsed.TotalSeconds) seconds`n" -ForegroundColor Cyan
}
"@

Write-Host $testScript -ForegroundColor Gray

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "READY TO SETUP" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open LM Studio GUI" -ForegroundColor White
Write-Host "  2. Download the 6 models listed above" -ForegroundColor White
Write-Host "  3. Enable developer settings (JIT, Auto-Evict, TTL)" -ForegroundColor White
Write-Host "  4. Run: lms ls (verify downloads)" -ForegroundColor White
Write-Host "  5. Run: npm test (test with small model)" -ForegroundColor White
Write-Host ""
Write-Host "Verification Code: DEVELOPER-MODE-READY" -ForegroundColor Green
Write-Host ""
