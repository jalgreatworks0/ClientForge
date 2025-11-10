# Elaria Command Center - Setup Instructions

**Status**: ✅ All files created and ready to install

---

## 📋 What's Been Created

### 1. MCP Configuration (Fixed)
✅ **File**: `C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json`
- Removed database-dependent servers (clientforge-database, clientforge-logger)
- Kept 10 core operational servers
- All dependencies installed (ts-node, typescript, etc.)

### 2. PowerShell Automation Scripts
✅ **Location**: `D:\clientforge-crm\ui-extensions\scripts\`

| Script | Hotkey | Function |
|--------|--------|----------|
| `start_all.ps1` | Ctrl+Alt+A | Launch full stack (LM Studio + Orchestrator + MCPs) |
| `reload_context.ps1` | Ctrl+Alt+R | Reload ClientForge context pack |
| `session_backup.ps1` | Ctrl+Alt+B | Backup current session (chat history, logs, git state) |
| `deploy_full.ps1` | Ctrl+Alt+D | Run full CI/CD pipeline (test → build → deploy) |
| `audit_full.ps1` | Ctrl+Alt+U | Security & quality audit with report generation |

### 3. AutoHotkey Shortcuts
✅ **File**: `D:\clientforge-crm\ui-extensions\autohotkey\elaria-hotkeys.ahk`

**Available Hotkeys:**
- `Ctrl+Alt+I` = CRM-INIT (Initialize Elaria)
- `Ctrl+Alt+C` = Load CRM Context Pack
- `Ctrl+Alt+S` = Security Scan
- `Ctrl+Alt+T` = Run Tests
- `Ctrl+Alt+G` = Git Status
- `Ctrl+Alt+D` = Deploy Full Stack
- `Ctrl+Alt+B` = Backup Session
- `Ctrl+Alt+R` = Reload Context
- `Ctrl+Alt+A` = Start All Services
- `Ctrl+Alt+U` = Audit Full
- `Ctrl+Alt+H` = Show Hotkey Help

---

## 🚀 Installation Steps

### Step 1: Fix MCP Configuration (Already Done)
✅ Configuration file updated and saved

### Step 2: Restart LM Studio
```powershell
# Close LM Studio completely, then reopen
# Go to Settings → Developer → Model Context Protocol
# Verify 10 servers show as green/connected
```

### Step 3: Install AutoHotkey
```powershell
# Download from: https://www.autohotkey.com/
# Install the program

# Then run the hotkey script:
Start-Process "D:\clientforge-crm\ui-extensions\autohotkey\elaria-hotkeys.ahk"

# Optional: Add to Windows Startup
Copy-Item "D:\clientforge-crm\ui-extensions\autohotkey\elaria-hotkeys.ahk" "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup\"
```

### Step 4: Test the System
```powershell
# 1. Start everything
D:\clientforge-crm\ui-extensions\scripts\start_all.ps1

# 2. In LM Studio, type: CRM-INIT

# 3. Test a hotkey: Press Ctrl+Alt+C to load context
```

---

## 🎹 Quick Start Commands

### Via PowerShell:
```powershell
# Start full stack
D:\clientforge-crm\ui-extensions\scripts\start_all.ps1

# Backup session
D:\clientforge-crm\ui-extensions\scripts\session_backup.ps1

# Run audit
D:\clientforge-crm\ui-extensions\scripts\audit_full.ps1

# Deploy
D:\clientforge-crm\ui-extensions\scripts\deploy_full.ps1
```

### Via Hotkeys (after installing AutoHotkey):
- Press `Ctrl+Alt+A` to start everything
- Press `Ctrl+Alt+I` to send CRM-INIT to LM Studio
- Press `Ctrl+Alt+H` to see all hotkeys

---

## 🔧 MCP Servers Status

After restarting LM Studio, these 10 servers should be green:

| Server | Port/Function | Status |
|--------|---------------|--------|
| clientforge-filesystem | File operations | 🟢 Ready |
| clientforge-codebase | Code analysis | 🟢 Ready |
| clientforge-git | Git operations | 🟢 Ready |
| clientforge-testing | Test runner | 🟢 Ready |
| clientforge-build | CI/CD pipeline | 🟢 Ready |
| clientforge-security | Security scanning | 🟢 Ready |
| clientforge-rag | Semantic search | 🟢 Ready |
| clientforge-documentation | Doc generation | 🟢 Ready |
| clientforge-context-pack | Context loading | 🟢 Ready |
| clientforge-orchestrator | Multi-agent (8979) | 🟢 Ready |

---

## 📱 Using Elaria

### Initialize Command Center:
```
Type in LM Studio chat: CRM-INIT
```

**Expected Response:**
```
ELARIA-BOOTSTRAP-COMPLETE

✓ All 10 MCP servers connected
✓ README.md loaded (PRIORITY 1)
✓ CHANGELOG.md loaded
✓ Context packs available (7 packs)

Workspace: D:/clientforge-crm
Budget: 120KB available
Status: READY FOR OPERATION
```

### Example Commands:
```
Load the crm_pack context
Scan workspace for security vulnerabilities
Run tests with coverage
Show git status
Find all references to ContactService
Create a backup of the current session
```

---

## 🛠️ Troubleshooting

### MCP Servers Show Red in LM Studio
1. Close LM Studio completely
2. Verify Node.js is installed: `node --version` (should be v22.21.0+)
3. Check npm dependencies:
   ```powershell
   cd D:\clientforge-crm\agents\mcp\servers
   npm list ts-node typescript glob
   ```
4. Restart LM Studio
5. Check Developer → MCP settings

### Hotkeys Not Working
1. Verify AutoHotkey is installed
2. Check if script is running (look for AutoHotkey icon in system tray)
3. Right-click the .ahk file and select "Run Script"
4. Check for conflicting hotkeys in other applications

### PowerShell Scripts Fail
1. Set execution policy:
   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
   ```
2. Verify LM Studio API is running (http://localhost:1234)
3. Check that paths in scripts are correct

### Orchestrator Won't Start
1. Verify ts-node is installed:
   ```powershell
   cd D:\clientforge-crm\agents\mcp\servers
   npm list ts-node
   ```
2. Check if port 8979 is already in use:
   ```powershell
   netstat -ano | findstr :8979
   ```
3. Kill any conflicting process and restart

---

## 📚 Additional Resources

- **Full Documentation**: [LM_STUDIO_UI_ENHANCEMENTS.md](./LM_STUDIO_UI_ENHANCEMENTS.md)
- **MCP Setup Guide**: [LM_STUDIO_SIDEBAR_SETUP.md](./LM_STUDIO_SIDEBAR_SETUP.md)
- **Installation Report**: [FINAL_INSTALLATION_REPORT.md](./FINAL_INSTALLATION_REPORT.md)
- **Fixes Applied**: [MCP_FIXES_APPLIED.md](./MCP_FIXES_APPLIED.md)

---

## ✅ Installation Checklist

- [ ] Restart LM Studio
- [ ] Verify 10 MCP servers are green
- [ ] Download & install AutoHotkey
- [ ] Run elaria-hotkeys.ahk
- [ ] Test Ctrl+Alt+H to see hotkeys
- [ ] Run start_all.ps1 to test full stack
- [ ] Type CRM-INIT in LM Studio
- [ ] Verify Elaria responds with BOOTSTRAP-COMPLETE
- [ ] Test a few commands
- [ ] Create a session backup (Ctrl+Alt+B)

---

**Status**: ✅ All files created, ready for installation
**Next Step**: Restart LM Studio and test with CRM-INIT
