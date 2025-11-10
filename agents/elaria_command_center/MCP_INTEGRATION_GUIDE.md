# MCP Integration Guide - Unified Architecture

**How LM Studio MCPs and Ollama Fleet MCPs Work Together (No Redundancy)**

---

## The Two MCP Systems (They're Different!)

### **System 1: LM Studio MCPs**
**Purpose:** Give Elaria tools to control things
**Location:** Inside LM Studio process
**Port:** N/A (internal to LM Studio)

**What they do:**
- ✅ Let Elaria read/write files
- ✅ Let Elaria execute commands
- ✅ Let Elaria query databases

**Think of it as:** Elaria's hands and eyes

---

### **System 2: Ollama Fleet MCP Router**
**Purpose:** Coordinate communication BETWEEN the 7 AI agents
**Location:** Standalone Node.js server
**Port:** 8765 (WebSocket)

**What it does:**
- ✅ Routes tasks to appropriate agents (Qwen, DeepSeek, etc.)
- ✅ Synchronizes context across agents (120KB shared memory)
- ✅ Manages parallel execution
- ✅ Tracks costs and performance

**Think of it as:** The telephone switchboard connecting the agent team

---

## How They Work Together (The Magic!)

```
┌─────────────────────────────────────────────────────────┐
│                    You (User)                            │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Elaria in LM Studio                         │
│         (Qwen 2.5 30B - Strategic Brain)                │
│                                                          │
│  Uses LM Studio MCPs:                                   │
│  ├── filesystem MCP (read/write code)                   │
│  ├── process MCP (execute commands) ◄─── THIS IS KEY!  │
│  └── database MCP (query PostgreSQL)                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                       │ execute_command("npm run fleet:start")
                       │ execute_command("npm run mcp:all")
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│          Ollama Fleet + MCP Router                       │
│              (ws://localhost:8765)                       │
│                                                          │
│  ┌───────────┐  ┌────────────┐  ┌────────────┐        │
│  │ Qwen32B   │  │ DeepSeek   │  │ CodeLlama  │        │
│  │Port 11434 │  │Port 11435  │  │Port 11436  │        │
│  └───────────┘  └────────────┘  └────────────┘        │
│                                                          │
│  ┌────────────┐  ┌─────────────┐                       │
│  │ Mistral    │  │ MCP Router  │                       │
│  │Port 11437  │  │Port 8765    │                       │
│  └────────────┘  └─────────────┘                       │
└─────────────────────────────────────────────────────────┘
```

---

## Configuration Strategy (No Redundancy!)

### **Step 1: Check What You Already Have in LM Studio**

In LM Studio, go to: **Settings → Developer → MCP Servers**

**Do you see:**
- ✅ Any `filesystem` server?
- ✅ Any `process` or `command` server?
- ✅ Any `database` or `postgres` server?

---

### **Step 2: Add Only What's Missing**

#### **Option A: You Have NO MCP Servers Yet (Clean Slate)**

Use this minimal config:

```json
{
  "mcpServers": {
    "process": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    }
  }
}
```

**That's it!** This one MCP gives Elaria everything she needs to control the Ollama fleet.

---

#### **Option B: You Already Have Some MCPs**

**If you have:**
- ❌ **No process/command server** → Add the `process` config above
- ✅ **Already have process server** → You're done! Skip it.

**If you want Elaria to also have:**
- File access → Add `clientforge-filesystem` from unified config
- Database queries → Add `clientforge-database` from unified config

---

### **Step 3: Complete LM Studio MCP Config (All-In-One)**

If you want to give Elaria FULL capabilities, use this:

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
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    }
  }
}
```

**Note:** Only add what you don't already have!

---

## How Elaria Uses Both Systems

### **Scenario 1: User Asks for Strategy**

```
User: "What should we build next?"
```

**Elaria's Process:**
1. Uses her own 30B model intelligence (no MCPs needed)
2. May use `filesystem` MCP to scan existing code
3. May use `database` MCP to query current data
4. Returns strategic recommendations

**MCPs Used:** filesystem, database (optional)
**Ollama Fleet:** Not started (not needed for thinking)

---

### **Scenario 2: User Asks Her to Start Fleet**

```
User: "Start the Ollama servers"
```

**Elaria's Process:**
1. Uses `process` MCP to execute: `npm run fleet:start`
2. Uses `process` MCP to execute: `npm run mcp:all`
3. Uses `process` MCP to check status: `curl http://localhost:8765/stats`
4. Reports back: "Fleet operational, 7 agents ready"

**MCPs Used:** process (command execution)
**Ollama Fleet:** Started by Elaria

---

### **Scenario 3: User Asks for Implementation**

```
User: "Implement contact merge feature"
```

**Elaria's Process:**
1. **Planning** (her own intelligence):
   - Analyzes task complexity
   - Decides which agents to use
   - Creates delegation plan

2. **Fleet Startup** (if not running):
   - Uses `process` MCP: `npm run mcp:all`

3. **Task Delegation** (through Ollama Fleet MCP Router):
   - Elaria doesn't directly control Ollama agents
   - She could use `process` MCP to submit tasks via CLI
   - OR you (user) would use the MCP router API
   - OR I (Claude Code) coordinate the fleet

4. **Result Collection**:
   - Uses `filesystem` MCP to read generated code
   - Reviews and reports back to user

**MCPs Used:** process, filesystem
**Ollama Fleet:** Active, agents working in parallel

---

## The Truth: Elaria's Best Role

**Current Architecture Reality:**

Elaria is **BEST** at:
- ✅ Strategic planning (what to build)
- ✅ Starting/stopping the fleet (process MCP)
- ✅ Analyzing results (filesystem MCP)
- ✅ Providing recommendations

Elaria is **NOT DESIGNED** to:
- ❌ Directly orchestrate the 7 Ollama agents
- ❌ Manage the MCP Router protocol
- ❌ Handle parallel task coordination

**The REAL Workflow:**
```
Elaria (Strategy) → Claude Code (Orchestration) → Ollama Fleet (Execution)
```

Or:
```
Elaria (Strategy) → MCP Router API (Orchestration) → Ollama Fleet (Execution)
```

---

## Recommended Setup (Best of Both Worlds)

### **LM Studio MCPs for Elaria:**
```json
{
  "mcpServers": {
    "process": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-everything"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "D:\\clientforge-crm"]
    }
  }
}
```

**What Elaria Can Do:**
- ✅ Start/stop Ollama fleet (`process` MCP)
- ✅ Read code files (`filesystem` MCP)
- ✅ Check fleet status
- ✅ Provide strategic analysis

---

### **Ollama Fleet MCP Router:**
```
npm run mcp:all
```

**What It Does:**
- ✅ Coordinates 7 agents
- ✅ Routes tasks intelligently
- ✅ Manages parallel execution
- ✅ Syncs context across agents

---

### **Your Role (The Human Orchestrator):**

**Talk to Elaria for:**
- Strategy ("What should I build?")
- Analysis ("Is this architecture good?")
- Fleet control ("Start the servers")

**Talk to Me (Claude Code) for:**
- Implementation ("Build this feature")
- Code review ("Check this code")
- Real-time coordination

**The Fleet Does:**
- Parallel execution
- Specialized tasks
- Fast implementation

---

## Summary: No Redundancy!

### **Two Separate Systems:**

| System | Purpose | Port | Used By |
|--------|---------|------|---------|
| **LM Studio MCPs** | Give Elaria tools | Internal | Elaria only |
| **Ollama Fleet MCP Router** | Coordinate agents | 8765 | All 7 agents |

### **They Don't Overlap:**
- LM Studio MCPs = Elaria's personal toolbox
- Ollama MCP Router = Agent communication network

### **They Work Together:**
- Elaria uses LM Studio MCPs to START the Ollama fleet
- Once started, the fleet manages itself
- Elaria monitors via LM Studio MCPs

---

## Quick Decision Tree

**Do you want Elaria to:**

✅ Start/stop the fleet?
→ Add `process` MCP to LM Studio

✅ Read/write ClientForge code?
→ Add `filesystem` MCP to LM Studio

✅ Query PostgreSQL directly?
→ Add `database` MCP to LM Studio

✅ Orchestrate tasks across 7 agents?
→ That's the Ollama Fleet MCP Router (separate system, port 8765)

**Minimum for fleet control:** Just `process` MCP
**Recommended setup:** `process` + `filesystem`
**Full power:** `process` + `filesystem` + `database`

---

**No redundancy. Clean architecture. Everything works together.** ✅
