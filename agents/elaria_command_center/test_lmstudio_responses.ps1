# LM Studio Responses API Test Script for Elaria
# Location: D:\ClientForge\03_BOTS\elaria_command_center\test_lmstudio_responses.ps1
# Purpose: Verify LM Studio Responses API is working with Qwen model

Write-Host "=== LM Studio Responses API Test for Elaria ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LMStudioEndpoint = "http://localhost:1234/v1/responses"
$ModelName = "qwen2.5-30b-a3b"  # Adjust to your loaded model name

# Test 1: Basic non-streaming request
Write-Host "[Test 1] Basic Response Test..." -ForegroundColor Yellow
$body1 = @{
    model = $ModelName
    input = "You are Elaria, the ClientForge command center. Respond with 'ONLINE' if you understand your role."
    reasoning = @{
        effort = "low"
    }
} | ConvertTo-Json -Depth 5

try {
    $response1 = Invoke-RestMethod -Method Post -Uri $LMStudioEndpoint -Body $body1 -ContentType "application/json"
    Write-Host "✓ Response received:" -ForegroundColor Green
    Write-Host $response1.output_text -ForegroundColor White
    $firstResponseId = $response1.id
    Write-Host "Response ID: $firstResponseId" -ForegroundColor Gray
} catch {
    Write-Host "✗ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Make sure LM Studio is running on port 1234 with a model loaded!" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 2: Stateful follow-up using previous response ID
Write-Host "[Test 2] Stateful Follow-up Test..." -ForegroundColor Yellow
$body2 = @{
    model = $ModelName
    input = "What is the root path for ClientForge?"
    previous_response_id = $firstResponseId
} | ConvertTo-Json -Depth 5

try {
    $response2 = Invoke-RestMethod -Method Post -Uri $LMStudioEndpoint -Body $body2 -ContentType "application/json"
    Write-Host "✓ Follow-up response:" -ForegroundColor Green
    Write-Host $response2.output_text -ForegroundColor White
    Write-Host "Response ID: $($response2.id)" -ForegroundColor Gray
} catch {
    Write-Host "✗ Stateful follow-up failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Higher reasoning effort
Write-Host "[Test 3] High Reasoning Effort Test..." -ForegroundColor Yellow
$body3 = @{
    model = $ModelName
    input = "List the critical files you must read on session start for ClientForge CRM, in priority order."
    reasoning = @{
        effort = "high"
    }
} | ConvertTo-Json -Depth 5

try {
    $response3 = Invoke-RestMethod -Method Post -Uri $LMStudioEndpoint -Body $body3 -ContentType "application/json"
    Write-Host "✓ High-effort response:" -ForegroundColor Green
    Write-Host $response3.output_text -ForegroundColor White
} catch {
    Write-Host "✗ High-effort test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== All Tests Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Configure MCP servers in LM Studio (Developer → Settings → Remote MCP)" -ForegroundColor White
Write-Host "2. Load Elaria system prompt: D:\ClientForge\03_BOTS\elaria_command_center\system_prompt.md" -ForegroundColor White
Write-Host "3. Run: .\test_lmstudio_mcp.ps1 to test tool calling" -ForegroundColor White
