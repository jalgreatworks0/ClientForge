# Reinstall All MCP Servers for LM Studio
# This script ensures all 14 MCP servers are properly configured in LM Studio

Write-Host "=== LM Studio MCP Reinstallation ===" -ForegroundColor Cyan
Write-Host ""

# Check if LM Studio is running
$lmProcess = Get-Process | Where-Object {$_.ProcessName -like '*Studio*' -or $_.Name -like '*lm-studio*'}
if ($lmProcess) {
    Write-Host "WARNING: LM Studio is currently running!" -ForegroundColor Yellow
    Write-Host "Please close LM Studio before running this script." -ForegroundColor Yellow
    Write-Host ""
    exit
}

# Define both possible LM Studio locations
$locations = @(
    "D:\ScrollForge\Apps\LM Studio\.lmstudio",
    "C:\Users\ScrollForge\.lmstudio"
)

Write-Host "Checking LM Studio locations..." -ForegroundColor Green

foreach ($location in $locations) {
    if (Test-Path $location) {
        Write-Host "Found: $location" -ForegroundColor Green

        # Backup existing mcp.json
        if (Test-Path "$location\mcp.json") {
            $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
            Copy-Item "$location\mcp.json" "$location\mcp.json.backup.$timestamp" -Force
            Write-Host "  Backed up mcp.json" -ForegroundColor Yellow
        }

        # Copy the complete mcp.json from D: drive
        $sourceMcpJson = "D:\ScrollForge\Apps\LM Studio\.lmstudio\mcp.json"
        if (Test-Path $sourceMcpJson) {
            Copy-Item $sourceMcpJson "$location\mcp.json" -Force
            Write-Host "  Updated mcp.json with all 14 servers" -ForegroundColor Green
        }

        # Ensure plugin directories exist
        $mcpPluginDir = "$location\extensions\plugins\mcp"
        if (!(Test-Path $mcpPluginDir)) {
            New-Item -ItemType Directory -Path $mcpPluginDir -Force | Out-Null
        }

        # List of all 14 MCP servers
        $mcpServers = @(
            "clientforge-filesystem",
            "clientforge-git",
            "clientforge-codebase",
            "clientforge-testing",
            "clientforge-build",
            "clientforge-documentation",
            "clientforge-rag",
            "clientforge-security",
            "clientforge-orchestrator",
            "clientforge-context-pack",
            "clientforge-ai-router",
            "clientforge-env-manager",
            "clientforge-api-tester",
            "system-control"
        )

        Write-Host "  Creating plugin directories..." -ForegroundColor Cyan

        foreach ($server in $mcpServers) {
            $pluginDir = "$mcpPluginDir\$server"

            # Create directory if it doesn't exist
            if (!(Test-Path $pluginDir)) {
                New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null
            }

            # Copy mcp-bridge-config.json from D: drive if it exists
            $sourceConfig = "D:\ScrollForge\Apps\LM Studio\.lmstudio\extensions\plugins\mcp\$server\mcp-bridge-config.json"
            if (Test-Path $sourceConfig) {
                Copy-Item $sourceConfig "$pluginDir\mcp-bridge-config.json" -Force
                Write-Host "    [OK] $server" -ForegroundColor Green
            } else {
                Write-Host "    [WARN] $server (config missing from source)" -ForegroundColor Yellow
            }
        }

        # Copy synced state if needed
        $internalDir = "$location\.internal"
        if (!(Test-Path $internalDir)) {
            New-Item -ItemType Directory -Path $internalDir -Force | Out-Null
        }

        $sourceSyncedState = "D:\ScrollForge\Apps\LM Studio\.lmstudio\.internal\last-synced-mcp-state.json"
        if (Test-Path $sourceSyncedState) {
            Copy-Item $sourceSyncedState "$internalDir\last-synced-mcp-state.json" -Force
            Write-Host "  Updated synced state" -ForegroundColor Green
        }

        Write-Host ""
    }
}

Write-Host "=== Installation Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "All 14 MCP servers have been configured:" -ForegroundColor Green
Write-Host "  1. clientforge-filesystem"
Write-Host "  2. clientforge-git"
Write-Host "  3. clientforge-codebase"
Write-Host "  4. clientforge-testing"
Write-Host "  5. clientforge-build"
Write-Host "  6. clientforge-documentation"
Write-Host "  7. clientforge-rag"
Write-Host "  8. clientforge-security"
Write-Host "  9. clientforge-orchestrator"
Write-Host " 10. clientforge-context-pack"
Write-Host " 11. clientforge-ai-router"
Write-Host " 12. clientforge-env-manager"
Write-Host " 13. clientforge-api-tester"
Write-Host " 14. system-control ⭐ (Full PC Access)"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Start LM Studio"
Write-Host "2. Verify all 14 servers appear in the MCP list"
Write-Host "3. Test system-control: 'List all drives on my PC'"
Write-Host ""
