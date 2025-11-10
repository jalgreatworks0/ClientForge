# LM Studio MCP Tools Test Script for Elaria
# Location: D:\ClientForge\03_BOTS\elaria_command_center\test_lmstudio_mcp.ps1
# Purpose: Test MCP server integration with LM Studio Responses API

Write-Host "=== LM Studio MCP Tools Test for Elaria ===" -ForegroundColor Cyan
Write-Host ""

# Configuration
$LMStudioEndpoint = "http://localhost:1234/v1/responses"
$ModelName = "qwen2.5-30b-a3b"  # Adjust to your loaded model name

# Test 1: File system MCP tool (read README)
Write-Host "[Test 1] MCP Files Tool - Read README..." -ForegroundColor Yellow
$body1 = @{
    model = $ModelName
    tools = @(
        @{
            type = "mcp"
            server_label = "filesystem"
            server_url = "npx -y @modelcontextprotocol/server-filesystem D:\ClientForge"
            allowed_tools = @("read_file", "list_directory", "search_files")
        }
    )
    input = "Read the file D:\ClientForge\README.md and summarize its key sections in 3 bullet points."
    reasoning = @{
        effort = "medium"
    }
} | ConvertTo-Json -Depth 10

try {
    $response1 = Invoke-RestMethod -Method Post -Uri $LMStudioEndpoint -Body $body1 -ContentType "application/json"
    Write-Host "✓ MCP Files response:" -ForegroundColor Green
    Write-Host $response1.output_text -ForegroundColor White
    Write-Host ""
    if ($response1.tool_calls) {
        Write-Host "Tools called:" -ForegroundColor Gray
        $response1.tool_calls | ForEach-Object {
            Write-Host "  - $($_.function.name)" -ForegroundColor DarkGray
        }
    }
} catch {
    Write-Host "✗ MCP Files test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Ensure Remote MCP is enabled in LM Studio: Developer → Settings → Enable Remote MCP" -ForegroundColor Yellow
}

Write-Host ""

# Test 2: HTTP MCP tool (orchestrator status)
Write-Host "[Test 2] MCP HTTP Tool - Check Orchestrator..." -ForegroundColor Yellow
$body2 = @{
    model = $ModelName
    tools = @(
        @{
            type = "mcp"
            server_label = "http"
            server_url = "npx -y @modelcontextprotocol/server-http"
            allowed_tools = @("get", "post")
        }
    )
    input = "Make an HTTP GET request to http://127.0.0.1:8979/status to check if the orchestrator is running."
    reasoning = @{
        effort = "low"
    }
} | ConvertTo-Json -Depth 10

try {
    $response2 = Invoke-RestMethod -Method Post -Uri $LMStudioEndpoint -Body $body2 -ContentType "application/json"
    Write-Host "✓ MCP HTTP response:" -ForegroundColor Green
    Write-Host $response2.output_text -ForegroundColor White
} catch {
    Write-Host "✗ MCP HTTP test failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Note: This is expected if orchestrator isn't running on port 8979" -ForegroundColor Yellow
}

Write-Host ""

# Test 3: Process MCP tool (list directory)
Write-Host "[Test 3] MCP Process Tool - Execute PowerShell..." -ForegroundColor Yellow
$body3 = @{
    model = $ModelName
    tools = @(
        @{
            type = "mcp"
            server_label = "process"
            server_url = "npx -y @modelcontextprotocol/server-process"
            allowed_tools = @("execute_command")
        }
    )
    input = "Execute PowerShell command: Get-ChildItem 'D:\ClientForge' -Directory | Select-Object -First 5 Name"
    reasoning = @{
        effort = "low"
    }
} | ConvertTo-Json -Depth 10

try {
    $response3 = Invoke-RestMethod -Method Post -Uri $LMStudioEndpoint -Body $body3 -ContentType "application/json"
    Write-Host "✓ MCP Process response:" -ForegroundColor Green
    Write-Host $response3.output_text -ForegroundColor White
} catch {
    Write-Host "✗ MCP Process test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Multi-tool complex request
Write-Host "[Test 4] Multi-Tool Request - Comprehensive Check..." -ForegroundColor Yellow
$body4 = @{
    model = $ModelName
    tools = @(
        @{
            type = "mcp"
            server_label = "filesystem"
            server_url = "npx -y @modelcontextprotocol/server-filesystem D:\ClientForge"
            allowed_tools = @("read_file", "list_directory")
        },
        @{
            type = "mcp"
            server_label = "http"
            server_url = "npx -y @modelcontextprotocol/server-http"
            allowed_tools = @("get")
        }
    )
    input = @"
Perform ClientForge initialization check:
1. List directories in D:\ClientForge
2. Read D:\ClientForge\README.md (first priority)
3. Check orchestrator status at http://127.0.0.1:8979/status
4. Provide a structured report
"@
    reasoning = @{
        effort = "high"
    }
} | ConvertTo-Json -Depth 10

try {
    $response4 = Invoke-RestMethod -Method Post -Uri $LMStudioEndpoint -Body $body4 -ContentType "application/json"
    Write-Host "✓ Multi-tool response:" -ForegroundColor Green
    Write-Host $response4.output_text -ForegroundColor White
} catch {
    Write-Host "✗ Multi-tool test failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== MCP Tools Testing Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Configuration Notes:" -ForegroundColor Yellow
Write-Host "1. Enable Remote MCP in LM Studio: Developer → Settings" -ForegroundColor White
Write-Host "2. Add MCP servers to your LM Studio config if needed" -ForegroundColor White
Write-Host "3. Ensure Node.js/npx is available in PATH for MCP servers" -ForegroundColor White
Write-Host "4. Start orchestrator service on port 8979 for full functionality" -ForegroundColor White
