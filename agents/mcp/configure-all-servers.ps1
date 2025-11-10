# LM Studio MCP - Add All Servers Configuration Script

Write-Host "`n=== Adding All MCP Servers to LM Studio ===" -ForegroundColor Cyan

$lmStudioDir = "$env:USERPROFILE\.lmstudio"
$mcpJsonPath = Join-Path $lmStudioDir "mcp.json"

# Backup current config
if (Test-Path $mcpJsonPath) {
    $backupPath = "$mcpJsonPath.backup.$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    Copy-Item $mcpJsonPath $backupPath
    Write-Host "Created backup: $backupPath" -ForegroundColor Green
}

# Full MCP configuration with all servers
$mcpConfig = @'
{
  "mcpServers": {
    "clientforge-filesystem": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/filesystem-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-git": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/git-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-codebase": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/codebase-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-testing": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/testing-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-build": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/build-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-documentation": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/documentation-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-rag": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/rag-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-security": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/security-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-orchestrator": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/orchestrator-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-context-pack": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/context-pack-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-ai-router": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/ai-router-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-env-manager": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/env-manager-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    },
    "clientforge-api-tester": {
      "command": "node",
      "args": ["D:/clientforge-crm/agents/mcp/servers/api-tester-mcp-server.js"],
      "env": {"WORKSPACE_ROOT": "D:/clientforge-crm"}
    }
  }
}
'@

try {
    $mcpConfig | Out-File -FilePath $mcpJsonPath -Encoding UTF8 -Force
    Write-Host "Successfully configured ALL 13 MCP servers!" -ForegroundColor Green
    Write-Host ""

    # Validate JSON
    $testJson = Get-Content $mcpJsonPath -Raw | ConvertFrom-Json
    Write-Host "JSON validation: PASSED" -ForegroundColor Green
    Write-Host ""

    Write-Host "Configured servers:" -ForegroundColor Cyan
    Write-Host "  1. clientforge-filesystem" -ForegroundColor White
    Write-Host "  2. clientforge-git" -ForegroundColor White
    Write-Host "  3. clientforge-codebase" -ForegroundColor White
    Write-Host "  4. clientforge-testing" -ForegroundColor White
    Write-Host "  5. clientforge-build" -ForegroundColor White
    Write-Host "  6. clientforge-documentation" -ForegroundColor White
    Write-Host "  7. clientforge-rag" -ForegroundColor White
    Write-Host "  8. clientforge-security" -ForegroundColor White
    Write-Host "  9. clientforge-orchestrator" -ForegroundColor White
    Write-Host " 10. clientforge-context-pack" -ForegroundColor White
    Write-Host " 11. clientforge-ai-router" -ForegroundColor White
    Write-Host " 12. clientforge-env-manager" -ForegroundColor White
    Write-Host " 13. clientforge-api-tester" -ForegroundColor White
    Write-Host ""

    Write-Host "Next: Restart LM Studio to load all servers!" -ForegroundColor Yellow
    Write-Host ""

} catch {
    Write-Host "ERROR: Failed to write configuration!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
