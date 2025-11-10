# Setup Elaria with MCP Fleet Control

**Goal:** Connect Elaria (LM Studio) to the Ollama MCP fleet so she can start/stop servers and delegate tasks.

---

## Step 1: Load System Prompt in LM Studio

1. **Open LM Studio**
2. **Load Model:** Qwen 2.5 30B (should already be loaded)
3. **Go to:** Developer Settings → System Prompt
4. **Copy the entire content from:**
   ```
   D:\clientforge-crm\agents\elaria_command_center\ELARIA_SYSTEM_PROMPT.md
   ```
5. **Paste into System Prompt box**
6. **Save**

---

## Step 2: Enable MCP in LM Studio

### Option A: Using LM Studio UI (Recommended)

1. **Go to:** Settings → Developer tab
2. **Enable:** "Enable MCP Servers"
3. **Click:** "Edit MCP Config"
4. **Paste this JSON:**

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "D:\\clientforge-crm"
      ]
    },
    "process": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-everything"
      ]
    }
  }
}
```

5. **Save** and **Restart LM Studio**

---

### Option B: Manual Config File (Alternative)

If LM Studio doesn't have UI for MCP yet:

1. **Find LM Studio config:**
   ```
   C:\Users\ScrollForge\AppData\Roaming\LMStudio\config.json
   ```

2. **Add this section:**
   ```json
   {
     "mcp": {
       "enabled": true,
       "servers": {
         "filesystem": {
           "command": "npx",
           "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\clientforge-crm"]
         },
         "process": {
           "command": "npx",
           "args": ["-y", "@modelcontextprotocol/server-everything"]
         }
       }
     }
   }
   ```

3. **Restart LM Studio**

---

## Step 3: Verify MCP Tools Are Available

In LM Studio chat, ask Elaria:

```
What MCP tools do you have access to?
```

**Expected Response:**
```
I have access to:
- read_file
- write_file
- list_directory
- search_files
- execute_command
- get_file_info

Plus I can start/stop the Ollama fleet using npm commands.
```

---

## Step 4: Test Fleet Control

Ask Elaria:

```
Can you check if the Ollama fleet is running?
```

**She should:**
1. Execute: `curl http://localhost:11434/api/tags`
2. Report back the status
3. If not running, offer to start it

---

## Step 5: Test Fleet Startup

Ask Elaria:

```
Start the Ollama servers for me
```

**She should:**
1. Check current status
2. Run: `cd D:\clientforge-crm && npm run fleet:start`
3. Run: `npm run mcp:all`
4. Verify all agents are connected
5. Report fleet status

---

## Step 6: Test Task Delegation

Ask Elaria:

```
I need to add a simple "hello world" API endpoint. Can you handle this?
```

**She should:**
1. Analyze the task (simple code generation)
2. Route to Agent-1 (Qwen32B)
3. Provide the implementation
4. Optionally delegate tests to Agent-2

---

## Troubleshooting

### Issue 1: "I don't have access to execute_command"

**Solution:** MCP not properly configured
- Verify LM Studio has MCP enabled
- Check that `@modelcontextprotocol/server-everything` is in config
- Restart LM Studio

---

### Issue 2: "I can see the tools but they're not working"

**Solution:** NPM packages not installed
```powershell
cd D:\clientforge-crm
npm install -g @modelcontextprotocol/server-filesystem
npm install -g @modelcontextprotocol/server-everything
```

---

### Issue 3: "Fleet won't start"

**Solution:** Check Ollama installation
```bash
ollama --version  # Should show 0.12.10
ollama list        # Should show your models
```

If Ollama isn't running:
```bash
# Windows: Start Ollama service
# It should auto-start on boot
```

---

### Issue 4: "MCP Router port 8765 already in use"

**Solution:** Stop existing MCP processes
```powershell
cd D:\clientforge-crm
npm run mcp:stop
# Wait 5 seconds
npm run mcp:all
```

---

## What Elaria Can Now Do

✅ **Read/Write ClientForge files** (with staging safety)
✅ **Execute npm scripts** (fleet:start, mcp:all, etc.)
✅ **Check service status** (curl commands)
✅ **Start/Stop Ollama fleet**
✅ **Start/Stop MCP router**
✅ **Delegate tasks to specific agents**
✅ **Coordinate parallel execution**
✅ **Provide strategic recommendations**

---

## Usage Examples

### Example 1: Strategic Planning

**You:** "Elaria, what should we prioritize for ClientForge this week?"

**Elaria:** *Analyzes gaps, provides ranked feature list with effort estimates*

---

### Example 2: Implementation

**You:** "Implement the contact merge feature you recommended"

**Elaria:**
1. Checks fleet status
2. Starts fleet if needed
3. Delegates backend to Qwen32B
4. Delegates tests to DeepSeek
5. Delegates docs to Mistral
6. Reports when complete

---

### Example 3: Code Review

**You:** "Review the authentication system for security issues"

**Elaria:**
1. Delegates to Agent-6 (GPT-4 security specialist)
2. Returns detailed security audit
3. Suggests fixes

---

### Example 4: Quick Help

**You:** "How do I query PostgreSQL in ClientForge?"

**Elaria:** *Provides answer using her knowledge base, no agent needed*

---

## File Reference

**System Prompt:**
```
D:\clientforge-crm\agents\elaria_command_center\ELARIA_SYSTEM_PROMPT.md
```

**MCP Config:**
```
D:\clientforge-crm\agents\elaria_command_center\lmstudio_mcp_config.json
```

**This Guide:**
```
D:\clientforge-crm\agents\elaria_command_center\SETUP_ELARIA_WITH_MCP.md
```

---

## Next Steps

Once Elaria is connected:

1. **Test simple commands** (check status, list files)
2. **Start the fleet** (let her do it!)
3. **Give her a real task** (implement a simple feature)
4. **Iterate and improve** (refine prompts based on results)

---

**Elaria is now your AI fleet commander!** 🚀

She combines:
- Strategic thinking (her 30B model intelligence)
- Tactical execution (7-agent swarm)
- Cost efficiency (local GPU = $0)
- Speed (parallel execution = 4x faster)

**The dream team is ready.**
