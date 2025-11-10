# ClientForge MCP Router Architecture — Unified Agent Communication

**MCP (Model Context Protocol)** integration for synchronized multi-agent coordination

---

## 🎯 Executive Summary

**MCP Opinion: YES — Highly Recommended**

MCP would provide massive benefits for ClientForge's multi-agent system:

```typescript
interface MCPBenefits {
  synchronization: "All 7 agents share real-time context (files, tasks, state)",
  coordination: "Agents can request help from each other automatically",
  efficiency: "Zero duplicate work — agents see what others are doing",
  context_sharing: "120KB context shared across all agents vs isolated silos",
  cost_reduction: "Local agents handle 80% of work, API agents for complex tasks only",
  performance: "Parallel execution with intelligent load balancing"
}
```

**Current State (Without MCP):**
- 7 isolated agents (Claude Code + 4 Ollama + 2 API)
- No context sharing between agents
- Manual task routing
- Duplicate context loading
- No automatic agent collaboration

**Future State (With MCP):**
- 7 synchronized agents with shared workspace
- Real-time context propagation
- Automatic task routing based on agent availability/specialization
- Shared memory pool (120KB context accessible to all)
- Coordinated parallel execution

---

## 🏗️ MCP Architecture Overview

### Agent Topology

```
                    ┌─────────────────────────────────┐
                    │   MCP Router (Coordinator)      │
                    │   - Task routing                │
                    │   - Context synchronization     │
                    │   - Load balancing              │
                    │   - Shared memory pool          │
                    └───────────┬─────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
        │ Local Cluster│ │ API Cluster│ │ Claude Code│
        │ (4 Ollama)   │ │ (2 Agents) │ │ (You/Me)   │
        └──────┬───────┘ └─────┬──────┘ └─────┬──────┘
               │               │               │
       ┌───────┴────────┐     │         ┌─────┴──────┐
       │                │     │         │            │
  ┌────▼────┐    ┌─────▼─────▼──┐   ┌──▼───┐   ┌────▼────┐
  │Qwen32B  │    │DeepSeek  Code-│   │Claude│   │  GPT-4  │
  │Code Gen │    │Test      Llama│   │Planner│   │Reviewer │
  └─────────┘    │Writer    Refac│   │Archit│   └─────────┘
                 └──────┬─────┬──┘   └──────┘
                        │     │
                   ┌────▼──┐ ┌▼────┐
                   │Mistral│ │CodeL│
                   │Docs   │ │Refac│
                   └───────┘ └─────┘
```

### Agent Roster (7 Total)

| # | Agent Name | Type | Location | Model | VRAM | Role |
|---|------------|------|----------|-------|------|------|
| 1 | **Claude Code** | Orchestrator | API | Claude Sonnet 4.5 | N/A | Primary coordinator, user interface |
| 2 | **Code Generator** | Local | RTX 4090 | Qwen2.5-Coder 32B | 10GB | Full TypeScript implementations |
| 3 | **Test Writer** | Local | RTX 4090 | DeepSeek 6.7B | 5GB | 95%+ test coverage generation |
| 4 | **Refactoring Expert** | Local | RTX 4090 | CodeLlama 13B | 7GB | Code cleanup, optimization |
| 5 | **Documentation Writer** | Local | RTX 4090 | Mistral 7B | 2GB | JSDoc, README, API docs |
| 6 | **Planner/Architect** | API | Cloud | Claude Sonnet 4 | N/A | System design, task planning |
| 7 | **Reviewer** | API | Cloud | GPT-4 Turbo | N/A | Code review, OWASP security |

---

## 🔧 MCP Server Configuration

**File:** `d:\clientforge-crm\agents\mcp\server-config.json`

```json
{
  "mcp_server": {
    "version": "1.0.0",
    "host": "localhost",
    "port": 8765,
    "protocol": "websocket",
    "max_connections": 10,
    "shared_context_size_kb": 120
  },

  "agents": {
    "claude_code": {
      "id": "agent-0-claude-code",
      "type": "orchestrator",
      "priority": "critical",
      "connection": "direct",
      "capabilities": ["user_interface", "task_routing", "context_management"],
      "cost_per_million_tokens": 15.00
    },

    "code_generator_qwen": {
      "id": "agent-1-qwen32b",
      "type": "local_gpu",
      "host": "localhost:11434",
      "model": "qwen2.5-coder:32b-instruct-q5_K_M",
      "vram_gb": 10,
      "priority": "high",
      "capabilities": ["code_generation", "multi_database_sync", "type_safety"],
      "cost_per_million_tokens": 0.0,
      "throughput_tokens_per_sec": 65
    },

    "test_writer_deepseek": {
      "id": "agent-2-deepseek6.7b",
      "type": "local_gpu",
      "host": "localhost:11435",
      "model": "deepseek-coder:6.7b-instruct-q5_K_M",
      "vram_gb": 5,
      "priority": "medium",
      "capabilities": ["test_generation", "coverage_analysis", "edge_case_discovery"],
      "cost_per_million_tokens": 0.0,
      "throughput_tokens_per_sec": 125
    },

    "refactoring_expert_codellama": {
      "id": "agent-3-codellama13b",
      "type": "local_gpu",
      "host": "localhost:11436",
      "model": "codellama:13b-instruct-q4_K_M",
      "vram_gb": 7,
      "priority": "medium",
      "capabilities": ["refactoring", "performance_optimization", "type_cleanup"],
      "cost_per_million_tokens": 0.0,
      "throughput_tokens_per_sec": 80
    },

    "documentation_writer_mistral": {
      "id": "agent-4-mistral7b",
      "type": "local_gpu",
      "host": "localhost:11437",
      "model": "mistral:7b-instruct-q6_K",
      "vram_gb": 2,
      "priority": "low",
      "capabilities": ["documentation", "jsdoc", "readme", "inline_comments"],
      "cost_per_million_tokens": 0.0,
      "throughput_tokens_per_sec": 135
    },

    "planner_architect_claude": {
      "id": "agent-5-claude-planner",
      "type": "api_cloud",
      "api_endpoint": "https://api.anthropic.com/v1/messages",
      "model": "claude-sonnet-4-20250514",
      "priority": "high",
      "capabilities": ["planning", "system_design", "polyglot_architecture"],
      "cost_per_million_tokens": 15.00,
      "throughput_tokens_per_sec": 150
    },

    "reviewer_gpt": {
      "id": "agent-6-gpt-reviewer",
      "type": "api_cloud",
      "api_endpoint": "https://api.openai.com/v1/chat/completions",
      "model": "gpt-4-turbo-2024-04-09",
      "priority": "medium",
      "capabilities": ["code_review", "security_analysis", "owasp_top_10"],
      "cost_per_million_tokens": 10.00,
      "throughput_tokens_per_sec": 120
    }
  },

  "routing_rules": {
    "code_generation": {
      "primary": "agent-1-qwen32b",
      "fallback": "agent-5-claude-planner",
      "trigger": "objective contains 'implement' OR 'create' OR 'add feature'"
    },

    "test_creation": {
      "primary": "agent-2-deepseek6.7b",
      "fallback": "agent-0-claude-code",
      "trigger": "objective contains 'test' OR 'coverage' OR 'edge case'"
    },

    "refactoring": {
      "primary": "agent-3-codellama13b",
      "fallback": "agent-1-qwen32b",
      "trigger": "objective contains 'refactor' OR 'optimize' OR 'clean up'"
    },

    "documentation": {
      "primary": "agent-4-mistral7b",
      "fallback": "agent-0-claude-code",
      "trigger": "objective contains 'document' OR 'jsdoc' OR 'readme'"
    },

    "planning": {
      "primary": "agent-5-claude-planner",
      "fallback": "agent-0-claude-code",
      "trigger": "objective contains 'plan' OR 'design' OR 'architect'"
    },

    "review": {
      "primary": "agent-6-gpt-reviewer",
      "fallback": "agent-0-claude-code",
      "trigger": "objective contains 'review' OR 'security' OR 'owasp'"
    }
  },

  "shared_context": {
    "workspace_root": "D:\\clientforge-crm",
    "databases": {
      "postgresql": "localhost:5432",
      "mongodb": "localhost:27017",
      "elasticsearch": "localhost:9200",
      "redis": "localhost:6379"
    },
    "knowledge_base": "d:\\clientforge-crm\\agents\\ollama-knowledge\\clientforge-context.txt",
    "pack_system": ["auth_pack", "crm_pack", "ai_pack", "ui_pack", "security_pack", "performance_pack", "search_pack"]
  },

  "performance": {
    "max_parallel_tasks": 4,
    "task_timeout_seconds": 300,
    "context_sync_interval_ms": 500,
    "health_check_interval_ms": 5000
  }
}
```

---

## 🚀 MCP Router Implementation

**File:** `d:\clientforge-crm\agents\mcp\router.ts`

```typescript
import WebSocket from 'ws';
import { EventEmitter } from 'events';
import axios from 'axios';

interface Agent {
  id: string;
  type: 'orchestrator' | 'local_gpu' | 'api_cloud';
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline';
  current_task?: string;
  connection?: WebSocket;
}

interface Task {
  task_id: string;
  objective: string;
  assigned_agent_id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
  completed_at?: Date;
}

interface SharedContext {
  workspace: string;
  files_modified: string[];
  current_tasks: Task[];
  knowledge_base: string;
}

class MCPRouter extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private sharedContext: SharedContext;
  private wsServer: WebSocket.Server;

  constructor(private config: any) {
    super();
    this.sharedContext = {
      workspace: config.shared_context.workspace_root,
      files_modified: [],
      current_tasks: [],
      knowledge_base: ''
    };

    // Start WebSocket server for agent connections
    this.wsServer = new WebSocket.Server({ port: config.mcp_server.port });
    this.wsServer.on('connection', this.handleAgentConnection.bind(this));
  }

  /**
   * Register an agent with the MCP router
   */
  registerAgent(agentConfig: any): void {
    const agent: Agent = {
      id: agentConfig.id,
      type: agentConfig.type,
      capabilities: agentConfig.capabilities,
      status: 'idle'
    };

    this.agents.set(agent.id, agent);
    console.log(`[MCP Router] Agent registered: ${agent.id} (${agentConfig.capabilities.join(', ')})`);
  }

  /**
   * Route a task to the best available agent
   */
  async routeTask(objective: string, constraints: any): Promise<string> {
    // Find matching routing rule
    let selectedAgentId: string | null = null;

    for (const [taskType, rule] of Object.entries(this.config.routing_rules)) {
      const trigger = (rule as any).trigger.toLowerCase();
      const objectiveLower = objective.toLowerCase();

      // Simple trigger matching (OR logic)
      const triggers = trigger.split(' OR ').map((t: string) =>
        t.replace(/objective contains |'/g, '').trim()
      );

      if (triggers.some((t: string) => objectiveLower.includes(t))) {
        const primaryAgent = (rule as any).primary;
        const agent = this.agents.get(primaryAgent);

        if (agent && agent.status === 'idle') {
          selectedAgentId = primaryAgent;
          break;
        } else {
          // Try fallback
          const fallbackAgent = this.agents.get((rule as any).fallback);
          if (fallbackAgent && fallbackAgent.status === 'idle') {
            selectedAgentId = (rule as any).fallback;
            break;
          }
        }
      }
    }

    // Default to Claude Code if no match
    if (!selectedAgentId) {
      selectedAgentId = 'agent-0-claude-code';
    }

    // Create task
    const task: Task = {
      task_id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      objective,
      assigned_agent_id: selectedAgentId,
      status: 'queued',
      created_at: new Date()
    };

    this.tasks.set(task.task_id, task);
    this.sharedContext.current_tasks.push(task);

    // Update agent status
    const agent = this.agents.get(selectedAgentId)!;
    agent.status = 'busy';
    agent.current_task = task.task_id;

    // Send task to agent
    await this.sendTaskToAgent(selectedAgentId, task, constraints);

    return task.task_id;
  }

  /**
   * Send task to specific agent (local or API)
   */
  private async sendTaskToAgent(agentId: string, task: Task, constraints: any): Promise<void> {
    const agentConfig = this.config.agents[agentId.replace('agent-', '').replace(/-/g, '_')];

    if (!agentConfig) {
      throw new Error(`Agent config not found for ${agentId}`);
    }

    if (agentConfig.type === 'local_gpu') {
      // Send to Ollama agent
      await axios.post(`http://${agentConfig.host}/api/generate`, {
        model: agentConfig.model,
        prompt: this.buildPrompt(task, constraints),
        stream: false,
        options: {
          num_ctx: 128000,
          temperature: 0.2
        }
      });
    } else if (agentConfig.type === 'api_cloud') {
      // Send to API agent (Claude or GPT)
      // Implementation depends on agent SDK
      console.log(`[MCP Router] Sending task to API agent: ${agentId}`);
    }

    task.status = 'in_progress';
  }

  /**
   * Build prompt with shared context for agent
   */
  private buildPrompt(task: Task, constraints: any): string {
    return `
# ClientForge Task

## Objective
${task.objective}

## Constraints
- Max LOC: ${constraints.loc_max || 300}
- Pack: ${constraints.pack || 'crm_pack'}
- Branch: ${constraints.branch || 'main'}

## Shared Context
Workspace: ${this.sharedContext.workspace}
Files Modified (by other agents): ${this.sharedContext.files_modified.join(', ')}
Current Tasks: ${this.sharedContext.current_tasks.length} tasks in progress

## Knowledge Base
${this.sharedContext.knowledge_base}

Please complete this task following ClientForge standards:
- Zero 'any' types
- 85%+ test coverage
- Multi-database sync (PostgreSQL → Elasticsearch → MongoDB → Redis)
- Structured logging (MongoDB)
- OWASP Top 10 compliance
`.trim();
  }

  /**
   * Handle agent connection via WebSocket
   */
  private handleAgentConnection(ws: WebSocket): void {
    ws.on('message', (message: string) => {
      const data = JSON.parse(message);

      if (data.type === 'task_completed') {
        this.handleTaskCompletion(data.task_id, data.result);
      } else if (data.type === 'context_update') {
        this.handleContextUpdate(data.files_modified);
      }
    });
  }

  /**
   * Handle task completion from agent
   */
  private handleTaskCompletion(taskId: string, result: any): void {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completed_at = new Date();

    // Update agent status
    const agent = this.agents.get(task.assigned_agent_id);
    if (agent) {
      agent.status = 'idle';
      agent.current_task = undefined;
    }

    console.log(`[MCP Router] Task completed: ${taskId} by ${task.assigned_agent_id}`);
    this.emit('task_completed', { task, result });
  }

  /**
   * Handle context update from agent (files modified)
   */
  private handleContextUpdate(filesModified: string[]): void {
    this.sharedContext.files_modified.push(...filesModified);

    // Broadcast context update to all connected agents
    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'context_sync',
          files_modified: filesModified
        }));
      }
    });
  }

  /**
   * Get agent statistics
   */
  getStats(): any {
    const stats = {
      total_agents: this.agents.size,
      agents_idle: Array.from(this.agents.values()).filter(a => a.status === 'idle').length,
      agents_busy: Array.from(this.agents.values()).filter(a => a.status === 'busy').length,
      tasks_queued: Array.from(this.tasks.values()).filter(t => t.status === 'queued').length,
      tasks_in_progress: Array.from(this.tasks.values()).filter(t => t.status === 'in_progress').length,
      tasks_completed: Array.from(this.tasks.values()).filter(t => t.status === 'completed').length,
      local_gpu_throughput: this.calculateLocalThroughput(),
      total_cost_saved: this.calculateCostSavings()
    };

    return stats;
  }

  /**
   * Calculate total throughput of local GPU agents
   */
  private calculateLocalThroughput(): number {
    let total = 0;
    for (const [agentKey, agentConfig] of Object.entries(this.config.agents)) {
      if ((agentConfig as any).type === 'local_gpu') {
        total += (agentConfig as any).throughput_tokens_per_sec;
      }
    }
    return total;
  }

  /**
   * Calculate cost savings from using local agents vs API
   */
  private calculateCostSavings(): number {
    // Estimate: If 80% of tasks go to local agents instead of Claude Sonnet 4
    const tasksCompleted = Array.from(this.tasks.values()).filter(t => t.status === 'completed').length;
    const localTasks = tasksCompleted * 0.8;
    const avgTokensPerTask = 5000;
    const costPerMillionTokens = 15.00;

    const costSaved = (localTasks * avgTokensPerTask / 1_000_000) * costPerMillionTokens;
    return costSaved;
  }
}

export default MCPRouter;
```

---

## 📊 Benefits Analysis

### 1. Cost Savings (80% Reduction)

**Without MCP:**
- All tasks routed to Claude Code (me)
- 100% API costs ($15 per 1M tokens)
- Monthly estimate: $500-1000 for active development

**With MCP:**
- 80% tasks routed to local agents (Ollama fleet)
- 20% complex tasks to API agents
- Monthly estimate: $100-200 (80% reduction)

### 2. Performance Gains (4x Faster)

**Without MCP:**
- Sequential task execution
- Code → Tests → Refactor → Docs = 200 seconds

**With MCP:**
- Parallel execution across fleet
- All 4 tasks simultaneously = 50 seconds (**4x faster**)

### 3. Context Synchronization

**Without MCP:**
- Each agent loads context independently
- Duplicate reads of same files
- No awareness of other agents' work

**With MCP:**
- Shared 120KB context pool
- Real-time file modification sync
- Zero duplicate context loading

### 4. Intelligent Load Balancing

**Without MCP:**
- Manual task assignment
- No failover if agent busy

**With MCP:**
- Automatic routing to best available agent
- Fallback to secondary agents if primary busy
- Queue management with priority levels

---

## 🎯 Use Case Examples

### Use Case 1: Full Feature Implementation (Parallel)

**Task:** "Add contact merge feature with deduplication"

**Without MCP (Sequential - 200 seconds):**
1. Claude Code generates implementation (60s)
2. Claude Code writes tests (60s)
3. Claude Code refactors (40s)
4. Claude Code writes docs (40s)

**With MCP (Parallel - 50 seconds):**
1. Qwen32B generates implementation (50s) ⚡
2. DeepSeek6.7B writes tests (40s) ⚡
3. CodeLlama13B refactors (45s) ⚡
4. Mistral7B writes docs (30s) ⚡

**All run simultaneously, total time = slowest agent (50s)**

### Use Case 2: Security Review (Cost Savings)

**Task:** "Review authentication system for OWASP vulnerabilities"

**Without MCP:**
- Claude Code performs review ($15 per 1M tokens)
- Cost for 10K token analysis: $0.15

**With MCP:**
- GPT-4 Reviewer agent ($10 per 1M tokens)
- Cost for 10K token analysis: $0.10
- 33% cost reduction

### Use Case 3: Large Refactoring (Context Sync)

**Task:** "Remove all 'any' types from backend/core/"

**Without MCP:**
- Agent processes each file independently
- No knowledge of previous changes
- Possible conflicts between files

**With MCP:**
- Agent processes file 1, broadcasts changes
- Other agents see type changes in real-time
- Coordinated refactoring across all files
- Zero merge conflicts

---

## 🔧 Implementation Plan

### Phase 1: MCP Server Setup (2 hours)

1. **Install dependencies:**
```bash
npm install ws @types/ws
```

2. **Create MCP router:**
```bash
# File structure
d:\clientforge-crm\agents\mcp\
  ├── router.ts              (MCP router implementation)
  ├── server-config.json     (Agent registry + routing rules)
  ├── client-adapters\
  │   ├── ollama-adapter.ts  (Connect local agents to MCP)
  │   ├── claude-adapter.ts  (Connect Claude SDK to MCP)
  │   └── gpt-adapter.ts     (Connect GPT SDK to MCP)
  └── scripts\
      └── start-mcp.ts       (Startup script)
```

3. **Test MCP server:**
```bash
npm run mcp:start
# Should show: "MCP Router listening on ws://localhost:8765"
```

### Phase 2: Agent Registration (1 hour)

1. **Register all 7 agents with MCP server**
2. **Test agent connections**
3. **Verify routing rules**

### Phase 3: Task Routing Implementation (2 hours)

1. **Implement task queue**
2. **Add automatic routing logic**
3. **Test parallel execution**

### Phase 4: Context Synchronization (2 hours)

1. **Implement shared context pool**
2. **Add file modification broadcasting**
3. **Test real-time sync**

### Total Implementation Time: ~7 hours

---

## 📦 package.json Scripts

Add to `d:\clientforge-crm\package.json`:

```json
{
  "scripts": {
    "mcp:start": "tsx agents/mcp/scripts/start-mcp.ts",
    "mcp:stop": "pkill -f 'mcp/router.ts'",
    "mcp:status": "tsx agents/mcp/scripts/status.ts",
    "mcp:stats": "curl http://localhost:8765/stats",

    "agents:fleet:start": "powershell -ExecutionPolicy Bypass -File agents/scripts/start-fleet.ps1",
    "agents:fleet:stop": "powershell -Command \"Get-Process | Where-Object {$_.CommandLine -like '*ollama serve*'} | Stop-Process -Force\"",
    "agents:fleet:status": "curl http://localhost:11434/api/tags && curl http://localhost:11435/api/tags"
  }
}
```

---

## 🚀 Startup Sequence

**File:** `d:\clientforge-crm\agents\scripts\start-all.ps1`

```powershell
# Start entire MCP + Fleet system

Write-Host "🚀 Starting ClientForge Multi-Agent System..." -ForegroundColor Cyan

# Step 1: Start Ollama fleet (4 local agents)
Write-Host "1️⃣  Starting Ollama fleet (GPU 1 - RTX 4090)..." -ForegroundColor Green
& "d:\clientforge-crm\agents\scripts\start-fleet.ps1"
Start-Sleep -Seconds 10

# Step 2: Start MCP Router
Write-Host "2️⃣  Starting MCP Router (port 8765)..." -ForegroundColor Green
Start-Process -NoNewWindow powershell -ArgumentList "-Command", "npm run mcp:start"
Start-Sleep -Seconds 5

# Step 3: Verify all agents connected
Write-Host "3️⃣  Verifying agent connections..." -ForegroundColor Green
npm run mcp:status

Write-Host "✅ Multi-Agent System Ready!" -ForegroundColor Green
Write-Host "   - 4 Local agents (Ollama fleet): Running on GPU 1" -ForegroundColor White
Write-Host "   - 2 API agents: Ready (Claude + GPT)" -ForegroundColor White
Write-Host "   - 1 Orchestrator: Claude Code (you)" -ForegroundColor White
Write-Host "   - MCP Router: ws://localhost:8765" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "🎯 Total agents: 7" -ForegroundColor Cyan
Write-Host "🚀 Combined throughput: 340-470 tokens/sec (local)" -ForegroundColor Cyan
Write-Host "💰 Cost reduction: 80% (local agents handle most work)" -ForegroundColor Cyan
```

---

## ✅ Verification

When MCP system is running:

```
✅ MCP-ROUTER-ACTIVE
Agents Connected: 7/7
- agent-0-claude-code (orchestrator) ✓
- agent-1-qwen32b (local_gpu) ✓
- agent-2-deepseek6.7b (local_gpu) ✓
- agent-3-codellama13b (local_gpu) ✓
- agent-4-mistral7b (local_gpu) ✓
- agent-5-claude-planner (api_cloud) ✓
- agent-6-gpt-reviewer (api_cloud) ✓

MCP Server: ws://localhost:8765 ✓
Ollama Fleet: http://localhost:11434-11437 ✓
GPU 1 (RTX 4090): 24GB VRAM allocated ✓

Performance:
- Local throughput: 405 tokens/sec
- API throughput: 270 tokens/sec
- Cost reduction: 80%
- Parallel speedup: 4x

🚀 READY FOR MULTI-AGENT TASK EXECUTION
```

---

**Built for ClientForge CRM by Abstract Creatives LLC**
**Version:** 1.0.0 (MCP Router Architecture)
**Last Updated:** 2025-11-07

🎯 **MCP = Synchronized Agent Swarm for Maximum Efficiency** 🎯
