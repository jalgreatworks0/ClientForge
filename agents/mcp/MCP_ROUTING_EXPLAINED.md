# MCP Server Routing - How It Works

**Date**: 2025-11-07
**Status**: ✅ Properly Configured with MCP Protocol

---

## 🔄 How MCP Routing Works

### The Communication Flow

```
┌─────────────────┐         ┌──────────────────┐         ┌────────────────┐
│   LM Studio     │         │  MCP Protocol    │         │  Your Server   │
│   (MCP Host)    │◄───────►│  (stdin/stdout)  │◄───────►│  (Node.js)     │
│                 │         │                  │         │                │
│ - Qwen2.5-30B   │         │ JSON-RPC 2.0     │         │ filesystem-mcp │
│ - Chat UI       │         │ Messages         │         │ codebase-mcp   │
│ - Tool Calling  │         │                  │         │ git-mcp        │
└─────────────────┘         └──────────────────┘         └────────────────┘
```

### Step-by-Step Process

**1. LM Studio Starts the Server**
```bash
# LM Studio reads mcp-config.json and executes:
node D:\clientforge-crm\agents\mcp\servers\filesystem-mcp.js

# Server starts, listens on stdin, writes to stdout
```

**2. MCP Initialization Handshake**
```json
// LM Studio → Server (via stdin)
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "0.1.0",
    "capabilities": {}
  }
}

// Server → LM Studio (via stdout)
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "0.1.0",
    "capabilities": { "tools": {} },
    "serverInfo": {
      "name": "clientforge-filesystem",
      "version": "1.0.0"
    }
  }
}
```

**3. Tool Discovery**
```json
// LM Studio → Server
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}

// Server → LM Studio
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "read_file",
        "description": "Read a file from the workspace",
        "inputSchema": {
          "type": "object",
          "properties": {
            "path": { "type": "string" }
          },
          "required": ["path"]
        }
      }
    ]
  }
}
```

**4. User Asks Elaria to Use a Tool**
```
User: "Read the README.md file"

Elaria (Qwen2.5-30B) thinks:
"I need to use the read_file tool with path 'README.md'"
```

**5. LM Studio Calls the Tool**
```json
// LM Studio → Server
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "read_file",
    "arguments": {
      "path": "README.md"
    }
  }
}

// Server → LM Studio
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "File: README.md\n\n# ClientForge CRM..."
      }
    ]
  }
}
```

**6. Elaria Responds to User**
```
Elaria: "I've read the README.md file. Here's what it contains:

# ClientForge CRM
..."
```

---

## 🔧 Why Your Old Servers Didn't Work

### Problem 1: Missing MCP Protocol Methods

**Old Server** (filesystem-server.js):
```javascript
// ❌ Only had custom methods
switch (request.method) {
  case 'read_file':  // Custom method
  case 'write_file': // Custom method
  // No initialize, tools/list, tools/call
}
```

**New Server** (filesystem-mcp.js):
```javascript
// ✅ Implements full MCP protocol
switch (method) {
  case "initialize":   // MCP required
  case "tools/list":   // MCP required
  case "tools/call":   // MCP required
}
```

### Problem 2: Wrong Response Format

**Old Format:**
```json
{
  "id": 1,
  "result": {
    "success": true,
    "content": "file contents"
  }
}
```

**MCP Format:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "file contents"
      }
    ]
  }
}
```

---

## ✅ Fixed Configuration

### Current mcp-config.json

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

### How LM Studio Uses This

1. **Reads the config file** on startup
2. **Spawns the process**: `node D:\clientforge-crm\agents\mcp\servers\filesystem-mcp.js`
3. **Connects stdin/stdout** as bidirectional communication channel
4. **Sends initialize** to handshake
5. **Sends tools/list** to discover available tools
6. **Makes tools available** to Elaria (Qwen2.5-30B)
7. **Routes tool calls** when Elaria wants to use them

---

## 🎯 The "Routing" You Were Looking For

The routing happens through **three layers**:

### Layer 1: Process Spawning (LM Studio)
```javascript
// LM Studio spawns your server as a child process
const serverProcess = spawn('node', [
  'D:\\clientforge-crm\\agents\\mcp\\servers\\filesystem-mcp.js'
]);
```

### Layer 2: stdin/stdout Communication
```javascript
// LM Studio writes to server's stdin
serverProcess.stdin.write(JSON.stringify(request));

// LM Studio reads from server's stdout
serverProcess.stdout.on('data', (data) => {
  const response = JSON.parse(data);
  // Use the response
});
```

### Layer 3: JSON-RPC 2.0 Protocol
```javascript
// Every message follows this format
{
  "jsonrpc": "2.0",        // Protocol version
  "id": 123,                // Request ID (for matching responses)
  "method": "tools/call",   // MCP method
  "params": { ... }         // Method parameters
}
```

---

## 🧪 Testing the Server Manually

You can test the MCP protocol yourself:

### Test 1: Initialize
```powershell
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"0.1.0","capabilities":{}}}' | node D:\clientforge-crm\agents\mcp\servers\filesystem-mcp.js
```

**Expected Output:**
```json
{"jsonrpc":"2.0","id":1,"result":{"protocolVersion":"0.1.0","capabilities":{"tools":{}},"serverInfo":{"name":"clientforge-filesystem","version":"1.0.0"}}}
```

### Test 2: List Tools
```powershell
echo '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' | node D:\clientforge-crm\agents\mcp\servers\filesystem-mcp.js
```

**Expected Output:**
```json
{"jsonrpc":"2.0","id":2,"result":{"tools":[{"name":"read_file",...}]}}
```

### Test 3: Call Tool
```powershell
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"read_file","arguments":{"path":"README.md"}}}' | node D:\clientforge-crm\agents\mcp\servers\filesystem-mcp.js
```

---

## 📚 MCP Protocol Specification

### Required Methods

| Method | Purpose | When Called |
|--------|---------|-------------|
| `initialize` | Handshake between host and server | On server startup |
| `tools/list` | Get list of available tools | After initialization |
| `tools/call` | Execute a specific tool | When LLM wants to use a tool |

### Response Format

All responses must include:
- `jsonrpc`: Always `"2.0"`
- `id`: Must match the request ID
- `result` OR `error`: Never both

### Tool Call Response

Must return:
```json
{
  "content": [
    {
      "type": "text",
      "text": "The actual result"
    }
  ]
}
```

---

## 🔗 How Multiple Servers Work

When you have multiple MCP servers:

```json
{
  "mcpServers": {
    "clientforge-filesystem": { ... },
    "clientforge-git": { ... },
    "clientforge-codebase": { ... }
  }
}
```

LM Studio:
1. **Spawns each server** as a separate process
2. **Initializes each one** independently
3. **Merges all tools** into a single tool catalog
4. **Routes tool calls** to the correct server based on tool name

Example:
- `read_file` → routes to `clientforge-filesystem`
- `git_status` → routes to `clientforge-git`
- `find_definition` → routes to `clientforge-codebase`

---

## ✅ Next Steps

1. **Restart LM Studio** to load the new configuration
2. **Check Developer Settings** → you should see `clientforge-filesystem` with green status
3. **Test with Elaria**: Type `Read the README.md file`
4. **Watch the magic happen**: Elaria will use the MCP tool to read the file

The "routing" is now properly configured through the **MCP protocol specification**!

---

**Status**: ✅ MCP Protocol Properly Implemented
**Server**: filesystem-mcp.js ready
**Configuration**: mcp-config.json updated
**Next**: Restart LM Studio and test
