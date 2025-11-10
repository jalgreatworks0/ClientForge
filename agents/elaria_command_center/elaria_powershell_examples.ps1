# Elaria PowerShell Examples - LM Studio Responses API
# Location: D:\ClientForge\03_BOTS\elaria_command_center\elaria_powershell_examples.ps1
# Purpose: Quick reference for interacting with Elaria via PowerShell

$Endpoint = "http://localhost:1234/v1/responses"
$Model = "qwen2.5-30b-a3b"

Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     ELARIA COMMAND CENTER - PowerShell Examples            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Helper function to send requests
function Invoke-ElariaCommand {
    param(
        [string]$Input,
        [string]$ReasoningEffort = "medium",
        [array]$Tools = @(),
        [string]$PreviousResponseId = $null,
        [bool]$Stream = $false
    )

    $body = @{
        model = $Model
        input = $Input
        reasoning = @{ effort = $ReasoningEffort }
    }

    if ($Tools.Count -gt 0) {
        $body.tools = $Tools
    }

    if ($PreviousResponseId) {
        $body.previous_response_id = $PreviousResponseId
    }

    if ($Stream) {
        $body.stream = $true
    }

    $json = $body | ConvertTo-Json -Depth 10

    try {
        $response = Invoke-RestMethod -Method Post -Uri $Endpoint -Body $json -ContentType "application/json"
        return $response
    } catch {
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Example 1: CRM-INIT
Write-Host "[Example 1] CRM-INIT - Initialize Elaria" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
$filesystemTool = @{
    type = "mcp"
    server_label = "filesystem"
    server_url = "npx -y @modelcontextprotocol/server-filesystem D:\ClientForge"
    allowed_tools = @("read_file", "list_directory")
}

Write-Host "Executing..." -ForegroundColor Gray
$result1 = Invoke-ElariaCommand `
    -Input "CRM-INIT" `
    -ReasoningEffort "medium" `
    -Tools @($filesystemTool)

if ($result1) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result1.output_text -ForegroundColor White
    Write-Host "Response ID: $($result1.id)" -ForegroundColor DarkGray
}
Write-Host ""
Read-Host "Press Enter to continue to Example 2"
Write-Host ""

# Example 2: Read README
Write-Host "[Example 2] Read README.md - Priority Context" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Executing..." -ForegroundColor Gray
$result2 = Invoke-ElariaCommand `
    -Input "Read D:\ClientForge\README.md and provide a comprehensive summary of the ClientForge CRM system architecture." `
    -ReasoningEffort "high" `
    -Tools @($filesystemTool)

if ($result2) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result2.output_text -ForegroundColor White
}
Write-Host ""
Read-Host "Press Enter to continue to Example 3"
Write-Host ""

# Example 3: CRM-FEATURE
Write-Host "[Example 3] CRM-FEATURE - Scaffold Feature" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
$processTool = @{
    type = "mcp"
    server_label = "process"
    server_url = "npx -y @modelcontextprotocol/server-process"
    allowed_tools = @("execute_command")
}

Write-Host "Executing..." -ForegroundColor Gray
$result3 = Invoke-ElariaCommand `
    -Input "CRM-FEATURE email-tracking" `
    -ReasoningEffort "high" `
    -Tools @($filesystemTool, $processTool)

if ($result3) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result3.output_text -ForegroundColor White
}
Write-Host ""
Read-Host "Press Enter to continue to Example 4"
Write-Host ""

# Example 4: TEST
Write-Host "[Example 4] TEST - Execute Test Suite" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Executing..." -ForegroundColor Gray
$result4 = Invoke-ElariaCommand `
    -Input "TEST" `
    -ReasoningEffort "medium" `
    -Tools @($processTool)

if ($result4) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result4.output_text -ForegroundColor White
}
Write-Host ""
Read-Host "Press Enter to continue to Example 5"
Write-Host ""

# Example 5: DEPLOY
Write-Host "[Example 5] DEPLOY - Deploy to Production" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
$httpTool = @{
    type = "mcp"
    server_label = "http"
    server_url = "npx -y @modelcontextprotocol/server-http"
    allowed_tools = @("get", "post")
}

Write-Host "Executing..." -ForegroundColor Gray
$result5 = Invoke-ElariaCommand `
    -Input "DEPLOY main" `
    -ReasoningEffort "high" `
    -Tools @($httpTool, $processTool)

if ($result5) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result5.output_text -ForegroundColor White
}
Write-Host ""
Read-Host "Press Enter to continue to Example 6"
Write-Host ""

# Example 6: Stateful follow-up
Write-Host "[Example 6] Stateful Follow-up - Context Continuation" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host "First request..." -ForegroundColor Gray
$result6a = Invoke-ElariaCommand `
    -Input "List the top 5 critical files in ClientForge CRM" `
    -ReasoningEffort "low"

if ($result6a) {
    Write-Host "✓ First response:" -ForegroundColor Green
    Write-Host $result6a.output_text -ForegroundColor White
    Write-Host ""
    Write-Host "Follow-up request using previous context..." -ForegroundColor Gray

    $result6b = Invoke-ElariaCommand `
        -Input "Read the first file from that list and explain its purpose" `
        -ReasoningEffort "medium" `
        -PreviousResponseId $result6a.id `
        -Tools @($filesystemTool)

    if ($result6b) {
        Write-Host "✓ Follow-up response:" -ForegroundColor Green
        Write-Host $result6b.output_text -ForegroundColor White
    }
}
Write-Host ""
Read-Host "Press Enter to continue to Example 7"
Write-Host ""

# Example 7: SPEC (Complex planning)
Write-Host "[Example 7] SPEC - Complex Feature Planning" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Executing..." -ForegroundColor Gray
$result7 = Invoke-ElariaCommand `
    -Input "SPEC: Implement user activity tracking. Include: (1) database schema analysis, (2) file system check for existing tracking, (3) orchestrator status, (4) comprehensive TaskSpec with acceptance criteria" `
    -ReasoningEffort "high" `
    -Tools @($filesystemTool, $httpTool, $processTool)

if ($result7) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result7.output_text -ForegroundColor White
}
Write-Host ""
Read-Host "Press Enter to continue to Example 8"
Write-Host ""

# Example 8: AUDIT
Write-Host "[Example 8] AUDIT - Security & Performance Check" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Executing..." -ForegroundColor Gray
$result8 = Invoke-ElariaCommand `
    -Input "AUDIT - Perform comprehensive security and performance audit. Check: OWASP top 10, dependency vulnerabilities, performance gates (API <200ms, FCP <1.5s, bundle <200KB). Provide detailed report." `
    -ReasoningEffort "high" `
    -Tools @($filesystemTool, $processTool)

if ($result8) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result8.output_text -ForegroundColor White
}
Write-Host ""
Read-Host "Press Enter to continue to Example 9"
Write-Host ""

# Example 9: DOCS
Write-Host "[Example 9] DOCS - Update Documentation" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host "Executing..." -ForegroundColor Gray
$result9 = Invoke-ElariaCommand `
    -Input "DOCS - Update session log, CHANGELOG, and MAP files with recent changes" `
    -ReasoningEffort "medium" `
    -Tools @($filesystemTool)

if ($result9) {
    Write-Host "✓ Response:" -ForegroundColor Green
    Write-Host $result9.output_text -ForegroundColor White
}
Write-Host ""
Read-Host "Press Enter to continue to Example 10"
Write-Host ""

# Example 10: Custom interactive mode
Write-Host "[Example 10] Interactive Mode - Ask Elaria Anything" -ForegroundColor Yellow
Write-Host "─────────────────────────────────────────" -ForegroundColor Gray
Write-Host ""

$continue = $true
$lastResponseId = $null

while ($continue) {
    Write-Host "Enter your command (or 'exit' to quit):" -ForegroundColor Cyan
    $userInput = Read-Host "> "

    if ($userInput -eq "exit" -or $userInput -eq "quit") {
        $continue = $false
        break
    }

    if ([string]::IsNullOrWhiteSpace($userInput)) {
        continue
    }

    Write-Host "Sending to Elaria..." -ForegroundColor Gray
    $result = Invoke-ElariaCommand `
        -Input $userInput `
        -ReasoningEffort "medium" `
        -PreviousResponseId $lastResponseId `
        -Tools @($filesystemTool, $httpTool, $processTool)

    if ($result) {
        Write-Host ""
        Write-Host "Elaria:" -ForegroundColor Green
        Write-Host $result.output_text -ForegroundColor White
        Write-Host ""
        $lastResponseId = $result.id

        if ($result.tool_calls) {
            Write-Host "Tools used:" -ForegroundColor DarkGray
            $result.tool_calls | ForEach-Object {
                Write-Host "  • $($_.function.name)" -ForegroundColor DarkGray
            }
            Write-Host ""
        }
    }
}

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Examples Complete - Elaria is Ready                   ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick Reference Commands:" -ForegroundColor Yellow
Write-Host "  • CRM-INIT          - Initialize Elaria with full context" -ForegroundColor White
Write-Host "  • CRM-FEATURE <name> - Scaffold a new feature" -ForegroundColor White
Write-Host "  • CRM-MODULE <name>  - Create full-stack module" -ForegroundColor White
Write-Host "  • TEST              - Run test suite" -ForegroundColor White
Write-Host "  • AUDIT             - Security & performance audit" -ForegroundColor White
Write-Host "  • DEPLOY [branch]   - Deploy to production" -ForegroundColor White
Write-Host "  • DOCS              - Update documentation" -ForegroundColor White
Write-Host "  • SPEC <goal>       - Generate TaskSpec and plan" -ForegroundColor White
Write-Host ""
