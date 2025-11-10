# LM Studio UI Enhancements for ClientForge Command Center

**Date**: 2025-11-07
**Target**: Transform LM Studio into Elaria's full-stack development cockpit

---

## ⚠️ Important: LM Studio Plugin Limitations

**Current Status (LM Studio 0.3.17):**

LM Studio does **NOT** support custom plugins, extensions, or UI modifications in the traditional sense like VS Code. However, we can work around this limitation using:

1. **MCP Servers** (already installed) - Backend tool integration ✅
2. **External UI Wrappers** - Custom Electron/web interfaces that communicate with LM Studio API
3. **AutoHotkey Scripts** - Keyboard shortcuts and automation for Windows
4. **Browser Extensions** - If using LM Studio web interface
5. **PowerShell Scripts** - Backend automation triggered from Windows

---

## 🎯 Achievable Enhancements (What We CAN Do)

### ✅ 1. MCP Servers (ALREADY INSTALLED)

**Status**: ✅ **10 Servers Active**

These function as "backend plugins" providing tools to Elaria:

| MCP Server | Status | Function |
|------------|--------|----------|
| clientforge-filesystem | 🟢 | File operations |
| clientforge-codebase | 🟢 | Code analysis |
| clientforge-git | 🟢 | Git operations |
| clientforge-testing | 🟢 | Test runner |
| clientforge-build | 🟢 | CI/CD pipeline |
| clientforge-security | 🟢 | Security scanning |
| clientforge-rag | 🟢 | Semantic search |
| clientforge-documentation | 🟢 | Doc generation |
| clientforge-context-pack | 🟢 | Context loading |
| clientforge-orchestrator | 🟢 | Multi-agent coordination |

**These ARE your "plugins"** - they give Elaria capabilities through the MCP protocol.

---

### ✅ 2. Custom Desktop App Wrapper

**Option A: Build Custom Elaria Dashboard**

Create a custom Electron app that wraps LM Studio's API:

**Tech Stack:**
- Electron (desktop app framework)
- React/Vue.js (UI)
- LM Studio HTTP API (backend)

**Features We Can Add:**
- ✅ Custom command palette
- ✅ File explorer sidebar
- ✅ Multi-pane layout (input, output, logs, context)
- ✅ Quick-run buttons
- ✅ MCP dashboard with health monitoring
- ✅ Session history viewer
- ✅ Metrics HUD
- ✅ Custom themes (Monokai Pro, Tokyo Night, Solarized)
- ✅ System prompt editor
- ✅ Git inspector
- ✅ Process runner dock

**Implementation Path:**

```bash
# Create Elaria Dashboard App
D:\clientforge-crm\ui-extensions\elaria-dashboard\

├── package.json
├── main.js                 # Electron main process
├── preload.js              # Security bridge
├── renderer/
│   ├── index.html          # Main UI
│   ├── styles/
│   │   ├── monokai-pro.css
│   │   ├── tokyo-night.css
│   │   └── solarized.css
│   ├── components/
│   │   ├── CommandPalette.jsx
│   │   ├── FileExplorer.jsx
│   │   ├── MCPDashboard.jsx
│   │   ├── MetricsHUD.jsx
│   │   ├── SystemPromptEditor.jsx
│   │   └── SessionHistory.jsx
│   └── api/
│       └── lmstudio-client.js  # LM Studio HTTP API wrapper
└── scripts/
    ├── start_all.ps1
    ├── reload_context.ps1
    ├── session_backup.ps1
    ├── deploy_full.ps1
    └── audit_full.ps1
```

**LM Studio API Endpoints (Available):**
```javascript
// LM Studio runs HTTP server on http://localhost:1234
const LMSTUDIO_API = "http://localhost:1234/v1";

// Available endpoints:
GET  /v1/models                    // List loaded models
POST /v1/chat/completions          // Send chat messages
POST /v1/completions               // Text completion
POST /v1/embeddings                // Generate embeddings
```

---

### ✅ 3. AutoHotkey Scripts (Windows Automation)

**What We Can Do:**
- Global keyboard shortcuts
- Automated sequences
- Window management
- Clipboard integration

**Example Script** (`D:\clientforge-crm\ui-extensions\autohotkey\elaria-hotkeys.ahk`):

```autohotkey
; Elaria ClientForge Hotkeys
#NoEnv
SendMode Input

; Win + E + C = Load CRM Context Pack
#e::
#c::
{
    Send, Load the crm_pack context{Enter}
    return
}

; Win + E + S = Security Scan
#e::
#s::
{
    Send, Scan workspace for security vulnerabilities{Enter}
    return
}

; Win + E + T = Run Tests
#e::
#t::
{
    Send, Run tests with coverage{Enter}
    return
}

; Win + E + G = Git Status
#e::
#g::
{
    Send, Show git status{Enter}
    return
}

; Win + E + D = Deploy
#e::
#d::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\scripts\deploy_full.ps1"
    return
}

; Win + E + B = Backup Session
#e::
#b::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\ui-extensions\scripts\session_backup.ps1"
    return
}

; Win + E + R = Reload Context
#e::
#r::
{
    Run, powershell.exe -ExecutionPolicy Bypass -File "D:\clientforge-crm\ui-extensions\scripts\reload_context.ps1"
    return
}
```

**Install:**
```powershell
# Download AutoHotkey: https://www.autohotkey.com/
# Run the script on startup
Copy-Item "D:\clientforge-crm\ui-extensions\autohotkey\elaria-hotkeys.ahk" "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\"
```

---

### ✅ 4. PowerShell Quick-Run Scripts

Create the automation scripts mentioned:

**1. Start All Services** (`start_all.ps1`):
```powershell
# Start Elaria Full Stack
Write-Host "🚀 Starting ClientForge Full Stack..." -ForegroundColor Cyan

# Start LM Studio (if not running)
$lmstudio = Get-Process "LM Studio" -ErrorAction SilentlyContinue
if (!$lmstudio) {
    Start-Process "D:\ScrollForge\Apps\LM Studio\LM Studio.exe"
    Write-Host "✓ LM Studio started" -ForegroundColor Green
    Start-Sleep -Seconds 5
}

# Start Orchestrator
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd D:\clientforge-crm\agents\mcp; node -r ts-node/register router.ts"
Write-Host "✓ Orchestrator started (port 8979)" -ForegroundColor Green

# All MCP servers auto-start via LM Studio config
Write-Host "✓ 10 MCP servers will auto-connect" -ForegroundColor Green

Write-Host "`n✅ Full stack running!" -ForegroundColor Green
Write-Host "Open LM Studio and type: CRM-INIT" -ForegroundColor Yellow
```

**2. Reload Context** (`reload_context.ps1`):
```powershell
# Reload ClientForge Context
Write-Host "📚 Reloading context..." -ForegroundColor Cyan

# Send command to LM Studio via API
$body = @{
    model = "qwen2.5-30b"
    messages = @(
        @{
            role = "user"
            content = "Load the crm_pack context"
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:1234/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"

Write-Host "✓ Context reloaded" -ForegroundColor Green
```

**3. Session Backup** (`session_backup.ps1`):
```powershell
# Backup Current Session
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupDir = "D:\clientforge-crm\06_BACKUPS\sessions\$timestamp"

New-Item -ItemType Directory -Path $backupDir -Force

# Backup LM Studio chat history
Copy-Item "$env:APPDATA\LM Studio\chat_history.json" "$backupDir\chat_history.json" -ErrorAction SilentlyContinue

# Backup MCP logs
Copy-Item "D:\clientforge-crm\logs\mcp\*.log" "$backupDir\mcp_logs\" -Recurse -ErrorAction SilentlyContinue

# Backup current workspace state
git -C "D:\clientforge-crm" status > "$backupDir\git_status.txt"

Write-Host "✅ Session backed up to: $backupDir" -ForegroundColor Green
```

**4. Deploy Full** (`deploy_full.ps1`):
```powershell
# Full Deployment Pipeline
Write-Host "🚀 Running full deployment..." -ForegroundColor Cyan

# Run CI Gate
npm --prefix D:\clientforge-crm run test
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Tests failed" -ForegroundColor Red
    exit 1
}

# Build
npm --prefix D:\clientforge-crm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}

# Deploy to Render (example)
# git push render main

Write-Host "✅ Deployment complete!" -ForegroundColor Green
```

**5. Audit Full** (`audit_full.ps1`):
```powershell
# Full Security & Quality Audit
Write-Host "🔍 Running full audit..." -ForegroundColor Cyan

# Security scan via MCP
$body = @{
    model = "qwen2.5-30b"
    messages = @(
        @{
            role = "user"
            content = "Scan workspace for security vulnerabilities"
        }
    )
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:1234/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"

# npm audit
npm --prefix D:\clientforge-crm audit

# Dependency check
npm --prefix D:\clientforge-crm outdated

Write-Host "✅ Audit complete" -ForegroundColor Green
```

---

### ✅ 5. Windows Terminal Custom Profile

Add a ClientForge profile to Windows Terminal:

**Location**: `%LOCALAPPDATA%\Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json`

**Add to `profiles.list`:**
```json
{
    "name": "Elaria Command Center",
    "commandline": "powershell.exe -NoExit -Command \"cd D:\\clientforge-crm; Write-Host '🧠 Elaria Command Center' -ForegroundColor Cyan; Write-Host 'Type: start_all to launch full stack' -ForegroundColor Yellow\"",
    "icon": "D:\\clientforge-crm\\docs\\assets\\elaria-icon.png",
    "colorScheme": "Campbell",
    "fontFace": "JetBrains Mono",
    "fontSize": 10,
    "backgroundImage": "D:\\clientforge-crm\\docs\\assets\\background.png",
    "backgroundImageOpacity": 0.1,
    "startingDirectory": "D:\\clientforge-crm"
}
```

---

## 🚫 What We CANNOT Do (LM Studio Limitations)

These require LM Studio to support plugins (which it doesn't):

- ❌ Native theme modifications inside LM Studio UI
- ❌ Built-in sidebar panels in LM Studio window
- ❌ Native file explorer integration
- ❌ In-app system prompt editor panel
- ❌ Embedded VS Code bridge
- ❌ Native panel resizer/multi-pane chat

**Workaround**: Build separate Electron app that uses LM Studio API (see Option A above).

---

## 🎯 Recommended Implementation Plan

### Phase 1: Quick Wins (Today)
1. ✅ Install AutoHotkey + run `elaria-hotkeys.ahk`
2. ✅ Create PowerShell scripts (start_all, reload_context, backup, deploy, audit)
3. ✅ Add Windows Terminal profile
4. ✅ Test all 10 MCP servers in LM Studio

### Phase 2: Automation (This Week)
1. Create keyboard shortcuts for common commands
2. Set up automated session backups
3. Configure deployment scripts
4. Add monitoring/health checks

### Phase 3: Custom Dashboard (Next Week)
1. Build Electron wrapper app
2. Implement command palette
3. Add file explorer
4. Create MCP dashboard
5. Add metrics HUD
6. Implement session history viewer

---

## 📋 Installation Checklist

**Immediate Setup:**

- [ ] Restart LM Studio with updated mcp-config.json
- [ ] Verify 10 MCP servers show green in Developer settings
- [ ] Test with `CRM-INIT` command
- [ ] Download & install AutoHotkey
- [ ] Copy `elaria-hotkeys.ahk` to Startup folder
- [ ] Create PowerShell scripts in `D:\clientforge-crm\ui-extensions\scripts\`
- [ ] Add Windows Terminal profile
- [ ] Test Win+E+C shortcut (load context)

**Advanced Setup:**

- [ ] Install Node.js 22+ (already have v22.21.0)
- [ ] Install Electron: `npm install -g electron`
- [ ] Create Elaria Dashboard app structure
- [ ] Implement LM Studio API client
- [ ] Build custom UI components
- [ ] Add theme system
- [ ] Deploy dashboard as standalone app

---

## 🔧 Quick Start Commands

**Start Everything:**
```powershell
# Run this in PowerShell
D:\clientforge-crm\ui-extensions\scripts\start_all.ps1
```

**Test MCP Servers:**
```
# Type in LM Studio chat:
CRM-INIT
```

**Use Keyboard Shortcuts:**
```
Win + E + C  →  Load CRM context
Win + E + S  →  Security scan
Win + E + T  →  Run tests
Win + E + G  →  Git status
Win + E + D  →  Deploy
Win + E + B  →  Backup session
Win + E + R  →  Reload context
```

---

## 📚 Resources

- **LM Studio API Docs**: https://lmstudio.ai/docs/app/api
- **MCP Specification**: https://modelcontextprotocol.io/
- **AutoHotkey Docs**: https://www.autohotkey.com/docs/
- **Electron Docs**: https://www.electronjs.org/docs/latest/

---

**Status**: ✅ MCP Servers Ready | 🚧 UI Enhancements Planned
**Next Step**: Restart LM Studio and test with `CRM-INIT`
