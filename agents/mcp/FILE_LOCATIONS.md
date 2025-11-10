# ClientForge MCP - Complete File Locations

**Date**: 2025-11-07
**Status**: ✅ All paths verified and correct

---

## 📍 LM Studio Locations

### Application Installation
**Location**: `D:\ScrollForge\Apps\LM Studio\LM Studio.exe`
- This is where the actual LM Studio application is installed
- Running on **D: drive**, not C: drive

### Configuration Files (AppData)
**Location**: `C:\Users\ScrollForge\AppData\Roaming\LM Studio\`

Even though LM Studio is installed on D:, it stores configuration in the user's AppData folder on C:

**Key Files:**
- `C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json` ✅ **MCP Server Configuration**
- `C:\Users\ScrollForge\AppData\Roaming\LM Studio\chat_history.json` - Chat history
- `C:\Users\ScrollForge\AppData\Roaming\LM Studio\settings.json` - Application settings

---

## 📂 ClientForge Project Structure

### Main Project Location
**Root**: `D:\clientforge-crm\`

```
D:\clientforge-crm\
├── agents\
│   └── mcp\
│       ├── servers\
│       │   ├── filesystem-mcp.js          ✅ NEW MCP-compliant server
│       │   ├── filesystem-server.js       (old - not used)
│       │   ├── database-server.js
│       │   ├── codebase-server.js
│       │   ├── testing-server.js
│       │   ├── git-server.js
│       │   ├── build-server.js
│       │   ├── security-server.js
│       │   ├── documentation-server.js
│       │   ├── rag-server.js
│       │   ├── logger-server.js
│       │   ├── context-pack-server.js
│       │   ├── mcp-wrapper.js
│       │   ├── package.json
│       │   └── node_modules\              ✅ ts-node installed here
│       │
│       ├── router.ts                      (orchestrator)
│       ├── MCP_ROUTING_EXPLAINED.md       ✅ NEW - explains how routing works
│       ├── FILE_LOCATIONS.md              ✅ NEW - this file
│       ├── FINAL_INSTALLATION_REPORT.md
│       ├── LM_STUDIO_SIDEBAR_SETUP.md
│       ├── LM_STUDIO_UI_ENHANCEMENTS.md
│       └── MCP_FIXES_APPLIED.md
│
├── ui-extensions\
│   ├── scripts\
│   │   ├── start_all.ps1                  ✅ Updated with correct D: drive path
│   │   ├── reload_context.ps1
│   │   ├── session_backup.ps1
│   │   ├── deploy_full.ps1
│   │   └── audit_full.ps1
│   │
│   ├── autohotkey\
│   │   └── elaria-hotkeys.ahk             ✅ Keyboard shortcuts
│   │
│   └── SETUP_INSTRUCTIONS.md
│
├── docs\
│   └── claude\
│       └── 11_CONTEXT_PACKS.md
│
├── backend\
├── frontend\
├── tests\
└── ...
```

---

## 🔗 How They Connect

### Configuration File References MCP Servers

**File**: `C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json`

```json
{
  "mcpServers": {
    "clientforge-filesystem": {
      "command": "node",
      "args": [
        "D:\\clientforge-crm\\agents\\mcp\\servers\\filesystem-mcp.js"
      ],
      "env": {
        "WORKSPACE_ROOT": "D:\\clientforge-crm",
        "STAGING_ROOT": "D:\\clientforge-crm\\_staging"
      }
    }
  }
}
```

**Key Points:**
- Config is on **C: drive** (AppData)
- References servers on **D: drive** (project location)
- Uses **absolute paths** with double backslashes

---

## 🚀 Startup Flow

### When LM Studio Starts:

1. **LM Studio Executable**: `D:\ScrollForge\Apps\LM Studio\LM Studio.exe`
2. **Reads Config From**: `C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json`
3. **Spawns MCP Server**: `node D:\clientforge-crm\agents\mcp\servers\filesystem-mcp.js`
4. **Server Uses Environment**: `WORKSPACE_ROOT=D:\clientforge-crm`

### When You Run start_all.ps1:

```powershell
D:\clientforge-crm\ui-extensions\scripts\start_all.ps1
```

1. **Checks if LM Studio is running** (by process name)
2. **If not, starts it from**: `D:\ScrollForge\Apps\LM Studio\LM Studio.exe`
3. **Waits 10 seconds** for initialization
4. **Starts Orchestrator**: `node -r ts-node/register D:\clientforge-crm\agents\mcp\router.ts`
5. **MCP servers auto-start** via LM Studio reading the config

---

## 📋 Important Path Rules

### Always Use Absolute Paths

**✅ Correct:**
```json
"args": ["D:\\clientforge-crm\\agents\\mcp\\servers\\filesystem-mcp.js"]
```

**❌ Wrong:**
```json
"args": ["..\\..\\servers\\filesystem-mcp.js"]
```

### Double Backslashes in JSON

**✅ Correct:**
```json
"WORKSPACE_ROOT": "D:\\clientforge-crm"
```

**❌ Wrong:**
```json
"WORKSPACE_ROOT": "D:\clientforge-crm"
```

### Single Backslashes in PowerShell

**✅ Correct:**
```powershell
$path = "D:\clientforge-crm\agents\mcp"
```

---

## 🔍 Quick Reference

### Where is LM Studio installed?
```
D:\ScrollForge\Apps\LM Studio\LM Studio.exe
```

### Where is the MCP config?
```
C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json
```

### Where are the MCP servers?
```
D:\clientforge-crm\agents\mcp\servers\
```

### Where are the automation scripts?
```
D:\clientforge-crm\ui-extensions\scripts\
```

### Where is the project workspace?
```
D:\clientforge-crm\
```

---

## 🧪 Testing Paths

### Test LM Studio Location
```powershell
Test-Path "D:\ScrollForge\Apps\LM Studio\LM Studio.exe"
# Should return: True
```

### Test Config File
```powershell
Test-Path "C:\Users\ScrollForge\AppData\Roaming\LM Studio\mcp-config.json"
# Should return: True
```

### Test MCP Server
```powershell
Test-Path "D:\clientforge-crm\agents\mcp\servers\filesystem-mcp.js"
# Should return: True
```

### Test Node Modules
```powershell
Test-Path "D:\clientforge-crm\agents\mcp\servers\node_modules\ts-node"
# Should return: True
```

---

## ✅ Verification Checklist

- [x] LM Studio installed on D: drive
- [x] MCP config stored on C: drive (AppData)
- [x] MCP servers on D: drive (project folder)
- [x] All paths use double backslashes in JSON
- [x] start_all.ps1 updated with correct D: drive path
- [x] Configuration file references correct server paths
- [x] ts-node installed in node_modules
- [x] All servers are MCP-protocol compliant

---

**Status**: ✅ All file locations verified and correct
**Cross-drive setup**: LM Studio (D:) + Config (C:) + Servers (D:) = Working correctly
