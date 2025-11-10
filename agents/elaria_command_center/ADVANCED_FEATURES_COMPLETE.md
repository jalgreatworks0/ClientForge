# LM Studio Advanced Features - Complete Integration Guide

**Date**: January 7, 2025
**Status**: ✅ PRODUCTION READY
**SDKs**: TypeScript (lmstudio-js), Python (lmstudio-python), CLI (lms)

---

## 🎯 Overview

This guide covers ALL advanced features across the complete LM Studio ecosystem:

1. **Agent-Oriented API (.act())** - Autonomous multi-step task execution
2. **Tool Use / Function Calling** - Define functions as tools for LLMs
3. **Structured Outputs** - JSON schema enforcement (already integrated)
4. **CLI Advanced Commands** - Log streaming, model management, automation
5. **Callbacks & Monitoring** - Real-time progress tracking
6. **Error Handling** - Robust failure recovery

---

## 📚 Table of Contents

- [Agent-Oriented API (.act())](#agent-oriented-api-act)
- [Tool Use & Function Calling](#tool-use--function-calling)
- [TypeScript SDK (lmstudio-js)](#typescript-sdk-lmstudio-js)
- [Python SDK (lmstudio-python)](#python-sdk-lmstudio-python)
- [CLI Advanced Features (lms)](#cli-advanced-features-lms)
- [Pre-Built Agent Workflows](#pre-built-agent-workflows)
- [Installation & Setup](#installation--setup)
- [Examples & Tutorials](#examples--tutorials)
- [Best Practices](#best-practices)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## 🤖 Agent-Oriented API (.act())

### What is .act()?

The `.act()` method is LM Studio's first **agent-oriented API**. You give it:
- A natural language task
- A set of tools (functions)
- Optional callbacks

The model then **autonomously executes multiple rounds** of:
1. Analyzing the task
2. Deciding which tools to call
3. Executing the tools
4. Using results to inform next steps
5. Repeating until task is complete

### Key Characteristics

- **Multi-round execution**: Not limited to single request-response
- **Autonomous decision-making**: Model decides which tools to use and when
- **Automatic tool execution**: SDK runs tools and provides results back
- **Progress tracking**: Callbacks for real-time monitoring
- **Error recovery**: Handles tool failures gracefully

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Your Code                          │
│                                                          │
│  agent.act(                                             │
│    "Generate quarterly business review",               │
│    [search_contacts, search_deals, create_report]      │
│  )                                                       │
└──────────────────┬──────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────┐
│              LM Studio SDK (.act() runtime)             │
│                                                          │
│  Round 1:                                               │
│    Model → "I need contact data" → Calls search_contacts│
│    SDK → Executes tool → Returns results to model       │
│                                                          │
│  Round 2:                                               │
│    Model → "Now I need deals" → Calls search_deals     │
│    SDK → Executes tool → Returns results to model       │
│                                                          │
│  Round 3:                                               │
│    Model → "Creating report" → Calls create_report     │
│    SDK → Executes tool → Returns success                │
│                                                          │
│  Round 4:                                               │
│    Model → "Task complete!" → Returns final summary     │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Tool Use & Function Calling

### Tool Definition Principles

**Critical**: Tool names, descriptions, and parameter definitions are transmitted to the model. Clear wording significantly impacts generation quality.

### Best Practices for Tools

1. **Descriptive names**: `search_contacts` not `sc`
2. **Clear descriptions**: Explain what the tool does and when to use it
3. **Type hints**: Use proper types (Python) or schemas (TypeScript)
4. **Good docstrings**: Extract description from docstrings automatically

### Tool Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| **Database** | Query CRM data | search_contacts, search_deals, get_analytics |
| **File System** | Read/write files | create_report, read_context_file |
| **Analysis** | Compute insights | calculate_forecast, identify_at_risk_deals |
| **Utility** | System operations | send_notification, log_activity |

---

## 💙 TypeScript SDK (lmstudio-js)

### Installation

```bash
npm install @lmstudio/sdk
```

### Basic Tool Definition

```typescript
const searchContacts = {
  name: 'search_contacts',
  description: 'Search contacts in the ClientForge CRM database',
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search terms for contact name or email',
      },
      status: {
        type: 'string',
        enum: ['lead', 'prospect', 'customer', 'inactive'],
      },
    },
    required: ['query'],
  },
  async execute({ query, status }) {
    // Tool implementation
    return { contacts: [...], total: 5 };
  },
};
```

### Agent Implementation

```typescript
import { LMStudioClient } from '@lmstudio/sdk';

class CRMAgent {
  constructor() {
    this.client = new LMStudioClient({ baseUrl: 'ws://localhost:1234' });
    this.tools = {
      search_contacts: searchContacts,
      search_deals: searchDeals,
      create_report: createReport,
    };
  }

  async act(task, toolNames = Object.keys(this.tools)) {
    const model = await this.client.llm.get({ identifier: 'qwen3-30b-a3b' });

    const enabledTools = toolNames.map((name) => ({
      type: 'function',
      function: {
        name: this.tools[name].name,
        description: this.tools[name].description,
        parameters: this.tools[name].parameters,
      },
    }));

    const messages = [
      {
        role: 'system',
        content: 'You are an autonomous CRM agent. Use tools to complete tasks.',
      },
      {
        role: 'user',
        content: task,
      },
    ];

    let iteration = 0;
    const maxIterations = 10;

    while (iteration < maxIterations) {
      iteration++;

      const response = await model.complete({
        messages,
        tools: enabledTools,
        temperature: 0.3,
      });

      const message = response.choices[0]?.message;
      messages.push(message);

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        for (const toolCall of message.tool_calls) {
          const tool = this.tools[toolCall.function.name];
          const args = JSON.parse(toolCall.function.arguments);
          const result = await tool.execute(args);

          messages.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: toolCall.id,
          });
        }
      } else {
        // Task complete
        return message.content;
      }
    }
  }
}
```

### Usage

```typescript
const agent = new CRMAgent();

const result = await agent.act(
  'Find all prospects from tech companies and create a report',
  ['search_contacts', 'create_report']
);

console.log(result);
```

### File Location

**Implementation**: `D:\ClientForge\03_BOTS\elaria_command_center\src\agent-act.js`

**Pre-configured workflows**:
- `salesIntelligenceAgent()` - Sales pipeline analysis
- `quarterlyBusinessReview()` - QBR generation
- `smartSearch(query)` - Natural language CRM search

**Run**:
```bash
node src/agent-act.js sales
node src/agent-act.js qbr
node src/agent-act.js search "find all prospects"
```

---

## 🐍 Python SDK (lmstudio-python)

### Installation

```bash
pip install lmstudio
```

Or with requirements file:
```bash
pip install -r python/requirements.txt
```

### Basic Tool Definition

```python
def search_contacts(
    query: str,
    company: Optional[str] = None,
    status: Optional[str] = None
) -> str:
    """
    Search contacts in the ClientForge CRM database.

    Args:
        query: Search terms for contact name or email
        company: Optional company name filter
        status: Contact status (lead, prospect, customer, inactive)

    Returns:
        JSON string with contact list or error message
    """
    # Implementation
    return json.dumps({
        "contacts": [...],
        "total": 5
    })
```

### Agent Implementation

```python
import lmstudio as lms
from typing import List, Callable

class CRMAgent:
    def __init__(self, model_name: str = "qwen3-30b-a3b"):
        self.model = lms.llm(model_name)

    def act(self, task: str, tools: List[Callable]):
        """Execute autonomous task with tools."""
        result = self.model.act(
            task,
            tools,
            on_message=self._on_message  # Optional callback
        )
        return result

    def _on_message(self, message: str):
        """Callback for agent messages."""
        print(f"Agent: {message}")
```

### Usage

```python
from agent_tools import search_contacts, search_deals, create_report

agent = CRMAgent()

result = agent.act(
    "Find all prospects and create a sales report",
    [search_contacts, create_report]
)

print(result)
```

### Error Handling

**Default behavior (v1.3.0+)**: Exceptions from tool calls are automatically converted to text and reported back to the model.

**Custom error handling**:
```python
from lmstudio import LMStudioPredictionError, ToolCallRequest

def custom_error_handler(
    exc: LMStudioPredictionError,
    request: ToolCallRequest | None
) -> None:
    # Custom handling
    return f"Custom error: {str(exc)}"

result = agent.model.act(
    task,
    tools,
    handle_invalid_tool_request=custom_error_handler
)
```

### File Locations

**Tools**: `D:\ClientForge\03_BOTS\elaria_command_center\python\agent_tools.py`

Includes 8 pre-built tools:
- `search_contacts()` - CRM contact search
- `search_deals()` - CRM deal search
- `get_contact_analytics()` - Contact insights
- `create_report()` - Report generation
- `read_context_file()` - Context loading
- `calculate_deal_forecast()` - Forecasting
- `identify_at_risk_deals()` - Risk analysis
- `send_notification()` - System notifications

**Agent**: `D:\ClientForge\03_BOTS\elaria_command_center\python\autonomous_agent.py`

Pre-configured workflows:
- `sales_intelligence_agent()` - Sales pipeline analysis
- `contact_enrichment_agent()` - Contact research
- `deal_health_monitor_agent()` - Deal health monitoring
- `quarterly_business_review_agent()` - QBR generation
- `smart_search_agent(query)` - Natural language search
- `interactive_agent()` - Interactive CLI

**Run**:
```bash
cd D:\ClientForge\03_BOTS\elaria_command_center\python
python autonomous_agent.py sales
python autonomous_agent.py contacts
python autonomous_agent.py health
python autonomous_agent.py qbr
python autonomous_agent.py interactive
```

---

## 🖥️ CLI Advanced Features (lms)

### Overview

The `lms` CLI provides programmatic access to LM Studio with advanced debugging capabilities.

### Key Features (2025)

1. **Log Streaming** - Real-time server and model I/O logs
2. **Model Management** - Download, load, unload models programmatically
3. **JSON Output** - Machine-readable output for automation
4. **Server Control** - Start/stop server from command line
5. **Preset Management** - Import/export model configurations

### Log Streaming

**Server logs**:
```bash
lms log stream --source server
```

**Model input**:
```bash
lms log stream --source model --filter input
```

**Model output**:
```bash
lms log stream --source model --filter output
```

**Both I/O**:
```bash
lms log stream --source model --filter input,output
```

### Model Management

**List loaded models** (JSON):
```bash
lms ps --json
```

**List all downloaded models**:
```bash
lms ls
```

**Load a model**:
```bash
lms load qwen3-30b-a3b
```

**Unload a model**:
```bash
lms unload qwen3-30b-a3b
```

**Download a model**:
```bash
lms get qwen3-30b
lms get TheBloke/Llama-2-7B-GGUF
```

**Download MLX models** (Mac):
```bash
lms get --mlx
```

### Server Control

**Start server**:
```bash
lms server start --port 1234 --cors true
```

**Stop server**:
```bash
lms server stop
```

**Check status**:
```bash
lms status --json
```

### PowerShell Integration

**File**: `D:\ClientForge\03_BOTS\elaria_command_center\cli_advanced.ps1`

**Interactive menu**:
```powershell
.\cli_advanced.ps1
```

**Direct commands**:
```powershell
.\cli_advanced.ps1 status
.\cli_advanced.ps1 models
.\cli_advanced.ps1 available
.\cli_advanced.ps1 load qwen3-30b-a3b
.\cli_advanced.ps1 unload qwen3-30b-a3b
.\cli_advanced.ps1 download qwen3-30b
.\cli_advanced.ps1 logs-server
.\cli_advanced.ps1 logs-model
```

---

## 🎨 Pre-Built Agent Workflows

### Sales Intelligence Agent

**Purpose**: Analyze sales pipeline and generate intelligence report

**Tasks**:
1. Calculate 30-day deal forecast
2. Identify at-risk deals
3. Find top opportunities
4. Create comprehensive report

**TypeScript**:
```bash
node src/agent-act.js sales
```

**Python**:
```bash
python python/autonomous_agent.py sales
```

### Quarterly Business Review Agent

**Purpose**: Generate comprehensive QBR

**Tasks**:
1. Calculate 90-day forecast
2. Analyze customer health
3. Review pipeline
4. Strategic recommendations

**TypeScript**:
```bash
node src/agent-act.js qbr
```

**Python**:
```bash
python python/autonomous_agent.py qbr
```

### Smart Search Agent

**Purpose**: Natural language CRM search

**TypeScript**:
```bash
node src/agent-act.js search "find all prospects from tech companies"
```

**Python**:
```bash
python python/autonomous_agent.py interactive
# Then type your natural language query
```

### Contact Enrichment Agent

**Purpose**: Research and enrich contact data

**Tasks**:
1. Search contacts by industry
2. Get analytics for each
3. Identify most engaged
4. Create enrichment report

**Python only**:
```bash
python python/autonomous_agent.py contacts
```

### Deal Health Monitor Agent

**Purpose**: Monitor deal health and send alerts

**Tasks**:
1. Identify at-risk deals
2. Assess severity
3. Send notifications
4. Create dashboard

**Python only**:
```bash
python python/autonomous_agent.py health
```

---

## 🔧 Installation & Setup

### Prerequisites

- **LM Studio**: Version 0.3.26+ (for log streaming)
- **Node.js**: Version 18+ (for TypeScript SDK)
- **Python**: Version 3.9+ (for Python SDK)
- **PowerShell**: Version 5.1+ (for CLI integration)

### TypeScript Setup

```bash
cd D:\ClientForge\03_BOTS\elaria_command_center

# Already installed in package.json
npm install

# Test agent
npm run test:agent
```

### Python Setup

```bash
cd D:\ClientForge\03_BOTS\elaria_command_center\python

# Install dependencies
pip install -r requirements.txt

# Test agent
python autonomous_agent.py interactive
```

### CLI Setup

The `lms` CLI ships with LM Studio and lives in:
- Windows: `%USERPROFILE%\.lmstudio\bin\lms.exe`
- Mac: `~/.lmstudio/bin/lms`
- Linux: `~/.lmstudio/bin/lms`

**Add to PATH** (Windows):
```powershell
$env:PATH += ";$env:USERPROFILE\.lmstudio\bin"
```

**Verify**:
```bash
lms --version
```

---

## 📖 Examples & Tutorials

### Example 1: Simple Autonomous Task

**TypeScript**:
```typescript
import { CRMAgent } from './src/agent-act.js';

const agent = new CRMAgent();

const result = await agent.act(
  "Find all contacts with company name containing 'Tech'",
  ['search_contacts']
);

console.log(result);
```

**Python**:
```python
from agent_tools import search_contacts
from autonomous_agent import CRMAgent

agent = CRMAgent()

result = agent.act(
    "Find all contacts with company name containing 'Tech'",
    [search_contacts]
)

print(result)
```

### Example 2: Multi-Step Workflow

```python
from agent_tools import *

agent = CRMAgent()

result = agent.act(
    """
    Create a weekly sales report:
    1. Calculate 7-day forecast
    2. Find deals closing this week
    3. Identify at-risk deals
    4. Create a formatted report
    5. Send a high-priority notification
    """,
    [
        calculate_deal_forecast,
        search_deals,
        identify_at_risk_deals,
        create_report,
        send_notification
    ]
)
```

### Example 3: Custom Tool

```typescript
const customTool = {
  name: 'calculate_roi',
  description: 'Calculate ROI for a deal',
  parameters: {
    type: 'object',
    properties: {
      revenue: { type: 'number' },
      cost: { type: 'number' },
    },
    required: ['revenue', 'cost'],
  },
  async execute({ revenue, cost }) {
    const roi = ((revenue - cost) / cost) * 100;
    return { roi, roi_percentage: `${roi.toFixed(2)}%` };
  },
};

agent.addTool(customTool);

const result = await agent.act(
  "Calculate ROI for a $100k deal with $30k cost",
  ['calculate_roi']
);
```

---

## ✅ Best Practices

### Tool Design

1. **Single Responsibility**: Each tool should do ONE thing well
2. **Clear Signatures**: Use descriptive parameter names
3. **Type Safety**: TypeScript types or Python type hints
4. **Error Messages**: Return helpful error messages, not exceptions
5. **Idempotency**: Tools should be safe to call multiple times

### Agent Configuration

| Setting | Value | Reasoning |
|---------|-------|-----------|
| Temperature | 0.2-0.4 | Predictable tool calling |
| Max Iterations | 10-20 | Prevent infinite loops |
| Timeout | 5-10 min | For complex tasks |
| Model | qwen3-30b-a3b | Tool use capability |

### Monitoring

```python
def on_message(message: str):
    """Log agent thinking."""
    logging.info(f"Agent: {message}")

def on_tool_call(tool_name: str, args: dict):
    """Log tool calls."""
    logging.info(f"Tool: {tool_name}({args})")

result = model.act(
    task,
    tools,
    on_message=on_message,
    on_tool_call=on_tool_call
)
```

---

## 🚀 Performance Optimization

### 1. Tool Response Size

**Keep tool responses small**:
- Return IDs instead of full objects
- Use pagination for large datasets
- Summarize instead of returning raw data

### 2. Iteration Limits

**Set reasonable limits**:
```python
result = agent.act(
    task,
    tools,
    max_iterations=10  # Prevent runaway execution
)
```

### 3. Caching

**Cache frequently accessed data**:
```python
from functools import lru_cache

@lru_cache(maxsize=100)
def get_contact(contact_id: int):
    # Expensive database query
    return fetch_from_db(contact_id)
```

### 4. Parallel Tool Execution

For independent tools, execute in parallel:
```python
import asyncio

async def execute_parallel_tools(tool_calls):
    tasks = [execute_tool(tc) for tc in tool_calls]
    return await asyncio.gather(*tasks)
```

---

## 🐛 Troubleshooting

### Agent Not Using Tools

**Problem**: Agent returns text instead of calling tools

**Solutions**:
1. Make tool descriptions more specific
2. Include example in system prompt
3. Use lower temperature (0.2-0.3)
4. Check model supports tool use (qwen3 does)

### Infinite Loop

**Problem**: Agent keeps calling same tool repeatedly

**Solutions**:
1. Set `max_iterations` limit
2. Improve tool descriptions
3. Add explicit task completion criteria
4. Check tool is returning useful results

### Tool Execution Errors

**Problem**: Tool throws exception

**Python** (auto-handled in v1.3.0+):
```python
# Exceptions automatically converted to text for model
```

**TypeScript**:
```typescript
async execute(args) {
  try {
    return await actualExecution(args);
  } catch (error) {
    return { error: error.message };
  }
}
```

### Slow Performance

**Problem**: Agent takes too long

**Solutions**:
1. Reduce number of available tools
2. Warm up model before starting
3. Use faster model for simple tasks
4. Implement tool result caching

---

## 📊 Comparison Matrix

| Feature | TypeScript SDK | Python SDK | CLI |
|---------|----------------|------------|-----|
| Agent API (.act()) | ✅ Manual | ✅ Built-in | ❌ |
| Tool Definitions | JSON Schema | Type Hints | N/A |
| Structured Output | ✅ | ✅ | ❌ |
| Log Streaming | ❌ | ❌ | ✅ |
| Model Management | ✅ | ✅ | ✅ |
| Interactive CLI | ✅ | ✅ | ✅ |
| Best For | Full-stack apps | Data science, automation | DevOps, debugging |

---

## 🎯 Next Steps

### Immediate Actions

1. **Test Python Agent**:
   ```bash
   python python/autonomous_agent.py interactive
   ```

2. **Test TypeScript Agent**:
   ```bash
   node src/agent-act.js sales
   ```

3. **Try CLI Features**:
   ```powershell
   .\cli_advanced.ps1
   ```

### Integration Roadmap

1. ✅ Agent-Oriented API (.act())
2. ✅ Tool Use / Function Calling
3. ✅ Structured Outputs (JSON schemas)
4. ✅ CLI Advanced Commands
5. ⏳ Backend API Integration
6. ⏳ Frontend UI for Agents
7. ⏳ Production Deployment

---

## 📚 Resources

- **LM Studio Docs**: https://lmstudio.ai/docs
- **TypeScript SDK**: https://lmstudio.ai/docs/typescript
- **Python SDK**: https://lmstudio.ai/docs/python
- **CLI Reference**: https://lmstudio.ai/docs/cli
- **Tool Use Guide**: https://lmstudio.ai/docs/advanced/tool-use
- **GitHub (TypeScript)**: https://github.com/lmstudio-ai/lmstudio-js
- **GitHub (Python)**: https://github.com/lmstudio-ai/lmstudio-python
- **GitHub (CLI)**: https://github.com/lmstudio-ai/lms

---

**Status**: ✅ ALL ADVANCED FEATURES INTEGRATED

The ClientForge CRM now has complete agent-oriented capabilities across TypeScript, Python, and CLI!
