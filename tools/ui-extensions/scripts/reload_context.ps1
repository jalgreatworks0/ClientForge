# Elaria ClientForge - Reload Context
# Sends context reload command to LM Studio

Write-Host ""
Write-Host "📚 Reloading ClientForge context..." -ForegroundColor Cyan

# Check if LM Studio API is available
try {
    $response = Invoke-RestMethod -Uri "http://localhost:1234/v1/models" -Method Get -ErrorAction Stop
    Write-Host "✓ LM Studio API accessible" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot connect to LM Studio API (http://localhost:1234)" -ForegroundColor Red
    Write-Host "   Make sure LM Studio is running and API server is enabled" -ForegroundColor Yellow
    exit 1
}

# Send reload command
Write-Host "→ Sending context reload command..." -ForegroundColor Gray

$body = @{
    model = "qwen2.5-30b"
    messages = @(
        @{
            role = "user"
            content = "Load the crm_pack context"
        }
    )
    stream = $false
} | ConvertTo-Json -Depth 10

try {
    $result = Invoke-RestMethod -Uri "http://localhost:1234/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✓ Context reload command sent" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host $result.choices[0].message.content
} catch {
    Write-Host "❌ Failed to send command: $_" -ForegroundColor Red
}

Write-Host ""
