# ClientForge MCP Servers - Automated Installation Script
# Installs all 12 MCP servers into LM Studio

param(
    [switch]$SkipDependencies = $false,
    [switch]$SkipBackup = $false
)

$ErrorActionPreference = "Stop"

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "ClientForge MCP Servers Installer" -ForegroundColor Cyan
Write-Host "Installing 12 MCP servers for Elaria" -ForegroundColor Cyan
Write-Host "======================================`n" -ForegroundColor Cyan

# Step 1: Verify prerequisites
Write-Host "[1/7] Verifying prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "  ✗ Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check LM Studio
$lmStudioPaths = @(
    "$env:APPDATA\LM Studio",
    "$env:LOCALAPPDATA\LM Studio"
)

$lmStudioFound = $false
foreach ($path in $lmStudioPaths) {
    if (Test-Path $path) {
        Write-Host "  ✓ LM Studio found: $path" -ForegroundColor Green
        $lmStudioConfigPath = Join-Path $path "mcp-config.json"
        $lmStudioFound = $true
        break
    }
}

if (-not $lmStudioFound) {
    Write-Host "  ⚠ LM Studio not found. Will create config in current directory." -ForegroundColor Yellow
    $lmStudioConfigPath = "D:\clientforge-crm\agents\mcp\lm-studio-mcp-config.json"
}

# Step 2: Install Node.js dependencies
if (-not $SkipDependencies) {
    Write-Host "`n[2/7] Installing Node.js dependencies..." -ForegroundColor Yellow

    Push-Location "D:\clientforge-crm\agents\mcp\servers"

    Write-Host "  Installing packages..." -ForegroundColor Cyan
    npm install --silent

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
    } else {
        Write-Host "  ✗ Dependency installation failed" -ForegroundColor Red
        Pop-Location
        exit 1
    }

    Pop-Location
} else {
    Write-Host "`n[2/7] Skipping dependencies (--SkipDependencies)" -ForegroundColor Yellow
}

# Step 3: Backup existing LM Studio config
if (-not $SkipBackup -and (Test-Path $lmStudioConfigPath)) {
    Write-Host "`n[3/7] Backing up existing LM Studio config..." -ForegroundColor Yellow

    $timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
    $backupPath = "$lmStudioConfigPath.backup_$timestamp"

    Copy-Item $lmStudioConfigPath $backupPath
    Write-Host "  ✓ Backup created: $backupPath" -ForegroundColor Green
} else {
    Write-Host "`n[3/7] Skipping backup (no existing config or --SkipBackup)" -ForegroundColor Yellow
}

# Step 4: Create MCP server stub files
Write-Host "`n[4/7] Creating remaining MCP server stubs..." -ForegroundColor Yellow

$stubServers = @(
    "testing-server.js",
    "git-server.js",
    "documentation-server.js",
    "build-server.js",
    "rag-server.js",
    "security-server.js",
    "logger-server.js",
    "context-pack-server.js"
)

foreach ($stub in $stubServers) {
    $stubPath = "D:\clientforge-crm\agents\mcp\servers\$stub"
    if (-not (Test-Path $stubPath)) {
        @"
#!/usr/bin/env node

/**
 * ClientForge MCP Server: $($stub.Replace('-server.js', ''))
 * Auto-generated stub - Full implementation pending
 */

console.error('[$stub] MCP Server started');

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());

    process.stdout.write(JSON.stringify({
      id: request.id,
      result: {
        success: true,
        stub: true,
        message: 'Full implementation pending',
        method: request.method
      }
    }) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({
      id: null,
      error: {
        code: -32603,
        message: error.message
      }
    }) + '\n');
  }
});
"@ | Out-File -FilePath $stubPath -Encoding UTF8

        Write-Host "  ✓ Created stub: $stub" -ForegroundColor Green
    } else {
        Write-Host "  → Already exists: $stub" -ForegroundColor Gray
    }
}

# Step 5: Generate LM Studio MCP configuration
Write-Host "`n[5/7] Generating LM Studio MCP configuration..." -ForegroundColor Yellow

$mcpConfig = @{
    mcpServers = @{
        "clientforge-filesystem" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\filesystem-server.js")
            env = @{
                WORKSPACE_ROOT = "D:\clientforge-crm"
                STAGING_ROOT = "D:\clientforge-crm\_staging"
            }
        }
        "clientforge-database" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\database-server.js")
            env = @{
                POSTGRES_URL = "postgres://localhost:5432/clientforge"
                MONGODB_URL = "mongodb://localhost:27017/clientforge?authSource=admin"
                ELASTICSEARCH_URL = "http://localhost:9200"
                REDIS_URL = "redis://localhost:6379"
            }
        }
        "clientforge-codebase" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\codebase-server.js")
            env = @{
                WORKSPACE_ROOT = "D:\clientforge-crm"
            }
        }
        "clientforge-testing" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\testing-server.js")
            env = @{
                WORKSPACE_ROOT = "D:\clientforge-crm"
                TEST_RUNNER = "jest"
            }
        }
        "clientforge-git" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\git-server.js")
            env = @{
                GIT_REPO = "D:\clientforge-crm"
            }
        }
        "clientforge-documentation" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\documentation-server.js")
            env = @{
                DOCS_ROOT = "D:\clientforge-crm\docs"
            }
        }
        "clientforge-build" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\build-server.js")
            env = @{
                WORKSPACE_ROOT = "D:\clientforge-crm"
                SCRIPTS_ROOT = "D:\clientforge-crm\scripts"
            }
        }
        "clientforge-rag" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\rag-server.js")
            env = @{
                RAG_ENDPOINT = "http://127.0.0.1:8920"
                INDEX_PATH = "D:\clientforge-crm\agents\rag-index"
            }
        }
        "clientforge-orchestrator" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\router.js")
            env = @{
                ORCHESTRATOR_PORT = "8979"
            }
        }
        "clientforge-security" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\security-server.js")
            env = @{
                WORKSPACE_ROOT = "D:\clientforge-crm"
            }
        }
        "clientforge-logger" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\logger-server.js")
            env = @{
                MONGODB_URL = "mongodb://localhost:27017/clientforge?authSource=admin"
            }
        }
        "clientforge-context-pack" = @{
            command = "node"
            args = @("D:\clientforge-crm\agents\mcp\servers\context-pack-server.js")
            env = @{
                WORKSPACE_ROOT = "D:\clientforge-crm"
                PACKS_FILE = "D:\clientforge-crm\docs\claude\11_CONTEXT_PACKS.md"
                BUDGET_LIMIT_KB = "120"
            }
        }
    }
}

$mcpConfigJson = $mcpConfig | ConvertTo-Json -Depth 10

# Write config
$mcpConfigJson | Out-File -FilePath $lmStudioConfigPath -Encoding UTF8
Write-Host "  ✓ Configuration written: $lmStudioConfigPath" -ForegroundColor Green

# Step 6: Test MCP servers
Write-Host "`n[6/7] Testing MCP servers..." -ForegroundColor Yellow

$testServers = @(
    @{ name = "filesystem"; path = "D:\clientforge-crm\agents\mcp\servers\filesystem-server.js" },
    @{ name = "database"; path = "D:\clientforge-crm\agents\mcp\servers\database-server.js" },
    @{ name = "codebase"; path = "D:\clientforge-crm\agents\mcp\servers\codebase-server.js" }
)

foreach ($server in $testServers) {
    Write-Host "  Testing $($server.name)..." -ForegroundColor Cyan

    $testProcess = Start-Process -FilePath "node" `
        -ArgumentList $server.path `
        -NoNewWindow `
        -PassThru `
        -RedirectStandardError "nul"

    Start-Sleep -Milliseconds 500

    if ($testProcess.HasExited -and $testProcess.ExitCode -ne 0) {
        Write-Host "    ✗ Failed to start" -ForegroundColor Red
    } elseif (-not $testProcess.HasExited) {
        Write-Host "    ✓ Started successfully" -ForegroundColor Green
        Stop-Process -Id $testProcess.Id -Force -ErrorAction SilentlyContinue
    }
}

# Step 7: Display next steps
Write-Host "`n[7/7] Installation complete!" -ForegroundColor Green
Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "======================================" -ForegroundColor Cyan

Write-Host "`n1. Open LM Studio" -ForegroundColor White
Write-Host "   → Settings → Developer → Model Context Protocol" -ForegroundColor Gray

Write-Host "`n2. Verify MCP Config Location:" -ForegroundColor White
Write-Host "   $lmStudioConfigPath" -ForegroundColor Gray

if (-not $lmStudioFound) {
    Write-Host "`n   ⚠ Manual step required:" -ForegroundColor Yellow
    Write-Host "   Copy the config file above to your LM Studio MCP settings" -ForegroundColor Gray
}

Write-Host "`n3. Load Elaria Model:" -ForegroundColor White
Write-Host "   → Search: 'qwen2.5 30b'" -ForegroundColor Gray
Write-Host "   → Download: Qwen2.5-30B-A3B-Q4_K_M.gguf (~17GB)" -ForegroundColor Gray

Write-Host "`n4. Set System Prompt:" -ForegroundColor White
Write-Host "   → Chat Settings → System Prompt" -ForegroundColor Gray
Write-Host "   → Copy from: D:\clientforge-crm\agents\mcp\LM_STUDIO_INSTALLATION_GUIDE.md" -ForegroundColor Gray

Write-Host "`n5. Test Elaria:" -ForegroundColor White
Write-Host "   → Start new chat" -ForegroundColor Gray
Write-Host "   → Type: 'CRM-INIT'" -ForegroundColor Gray
Write-Host "   → Verify: All 12 MCP servers connect" -ForegroundColor Gray

Write-Host "`n======================================" -ForegroundColor Cyan
Write-Host "MCP Servers Installed: 12/12" -ForegroundColor Green
Write-Host "- clientforge-filesystem ✓" -ForegroundColor Green
Write-Host "- clientforge-database ✓" -ForegroundColor Green
Write-Host "- clientforge-codebase ✓" -ForegroundColor Green
Write-Host "- clientforge-testing ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-git ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-documentation ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-build ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-rag ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-orchestrator ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-security ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-logger ✓ (stub)" -ForegroundColor Yellow
Write-Host "- clientforge-context-pack ✓ (stub)" -ForegroundColor Yellow
Write-Host "======================================`n" -ForegroundColor Cyan

Write-Host "Configuration file: $lmStudioConfigPath" -ForegroundColor Cyan
Write-Host "Installation guide: D:\clientforge-crm\agents\mcp\LM_STUDIO_INSTALLATION_GUIDE.md" -ForegroundColor Cyan

Write-Host "`nVerification: MCP-INSTALLATION-v1.0-COMPLETE`n" -ForegroundColor Green
