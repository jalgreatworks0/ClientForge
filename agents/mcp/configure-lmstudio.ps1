# LM Studio MCP Configuration Script
# Automatically configures MCP servers for LM Studio

Write-Host "`n=== LM Studio MCP Configuration ===" -ForegroundColor Cyan
Write-Host ""

# Find LM Studio mcp.json location
$lmStudioDir = "$env:USERPROFILE\.lmstudio"
$mcpJsonPath = Join-Path $lmStudioDir "mcp.json"

Write-Host "Looking for LM Studio config at: $mcpJsonPath" -ForegroundColor Gray

if (-not (Test-Path $lmStudioDir)) {
    Write-Host "ERROR: LM Studio config directory not found!" -ForegroundColor Red
    Write-Host "Expected: $lmStudioDir" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Please make sure LM Studio is installed and has been run at least once." -ForegroundColor Yellow
    exit 1
}

# Create backup if mcp.json already exists
if (Test-Path $mcpJsonPath) {
    $backupPath = "$mcpJsonPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $mcpJsonPath $backupPath
    Write-Host "Created backup: $backupPath" -ForegroundColor Green
}

# The MCP configuration (using forward slashes for Windows paths)
$mcpConfig = @'
{
  "mcpServers": {
    "clientforge-filesystem": {
      "command": "node",
      "args": [
        "D:/clientforge-crm/agents/mcp/servers/filesystem-mcp-server.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:/clientforge-crm"
      }
    }
  }
}
'@

# Write the config
try {
    $mcpConfig | Out-File -FilePath $mcpJsonPath -Encoding UTF8 -Force
    Write-Host "Successfully wrote MCP configuration to: $mcpJsonPath" -ForegroundColor Green
    Write-Host ""

    # Validate JSON
    $testJson = Get-Content $mcpJsonPath -Raw | ConvertFrom-Json
    Write-Host "JSON validation: PASSED" -ForegroundColor Green
    Write-Host ""

    # Show what was configured
    Write-Host "Configured MCP servers:" -ForegroundColor Cyan
    Write-Host "  - clientforge-filesystem" -ForegroundColor White
    Write-Host ""

    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Close LM Studio completely (all windows)" -ForegroundColor Gray
    Write-Host "  2. Restart LM Studio" -ForegroundColor Gray
    Write-Host "  3. Go to Settings → Developer → MCP Servers" -ForegroundColor Gray
    Write-Host "  4. Verify 'clientforge-filesystem' shows as Connected" -ForegroundColor Gray
    Write-Host ""

} catch {
    Write-Host "ERROR: Failed to write configuration!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

Write-Host "Configuration complete!" -ForegroundColor Green
Write-Host ""
