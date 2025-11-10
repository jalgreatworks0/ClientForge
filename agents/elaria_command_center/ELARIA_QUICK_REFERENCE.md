# Elaria Quick Reference Card

**One-page guide for using Elaria with MCP Fleet**

---

## Setup (Do This Once)

1. **Open LM Studio** → Load Qwen 2.5 30B
2. **System Prompt:** Copy entire content from `ELARIA_SYSTEM_PROMPT.md`
3. **Enable MCP:** Settings → Developer → Enable MCP Servers
4. **MCP Config:** Paste from `lmstudio_mcp_config.json`
5. **Restart LM Studio**

✅ **Verification:** Ask Elaria "What tools do you have?"

---

## What to Ask Elaria

### **Strategic Questions**
```
"What should we add to ClientForge next?"
"What are the biggest gaps in our CRM?"
"How should we prioritize this sprint?"
"What's the ROI on adding X feature?"
```

### **Fleet Management**
```
"Check if the Ollama fleet is running"
"Start the Ollama servers for me"
"What's the status of the MCP router?"
"Stop all the agents"
```

### **Implementation Tasks**
```
"Implement contact merge feature"
"Add a bulk email sender API"
"Create tests for the authentication system"
"Refactor the user service for better performance"
"Document the CRM API endpoints"
```

### **Code Review / Security**
```
"Review the auth system for security issues"
"Check this code for OWASP vulnerabilities"
"Audit the database queries for SQL injection"
```

### **Quick Help**
```
"How do I connect to PostgreSQL in this project?"
"What's the structure of the contacts table?"
"Show me how to add a new API endpoint"
```

---

## The Agent Fleet (Who Does What)

| Agent | Specialty | Use For | Speed | Cost |
|-------|-----------|---------|-------|------|
| **Elaria (You)** | Strategy, Planning | Recommendations, Analysis | N/A | $0 |
| **Qwen32B** | Code Generation | New features, APIs | 50-60s | $0 |
| **DeepSeek** | Test Writing | Unit/integration tests | 40-50s | $0 |
| **CodeLlama** | Refactoring | Optimization, cleanup | 45-50s | $0 |
| **Mistral** | Documentation | Docs, comments, READMEs | 25-30s | $0 |
| **Claude Sonnet** | Architecture | System design, planning | 30-40s | $15/1M tokens |
| **GPT-4** | Security Review | OWASP audits, reviews | 40-50s | $10/1M tokens |

---

## Command Cheat Sheet

### **Check Fleet Status**
```
"Is the fleet running?"
"What agents are available?"
```

### **Start Everything**
```
"Start the Ollama servers and MCP router"
```
*She will run:*
- `npm run fleet:start`
- `npm run mcp:all`

### **Stop Everything**
```
"Stop all the agents"
```
*She will run:*
- `npm run fleet:stop`
- `npm run mcp:stop`

---

## Expected Response Times

| Task Type | Sequential | Parallel (Fleet) | Savings |
|-----------|-----------|------------------|---------|
| Simple feature | 60s | 60s | 0% |
| Feature + tests | 120s | 60s | **50%** |
| Feature + tests + docs | 165s | 60s | **64%** |
| Full feature (code, test, optimize, docs) | 200s | 50s | **75%** |

---

## File Locations

**System Prompt:**
```
D:\clientforge-crm\agents\elaria_command_center\ELARIA_SYSTEM_PROMPT.md
```

**MCP Config:**
```
D:\clientforge-crm\agents\elaria_command_center\lmstudio_mcp_config.json
```

**Full Setup Guide:**
```
D:\clientforge-crm\agents\elaria_command_center\SETUP_ELARIA_WITH_MCP.md
```

---

## Troubleshooting

**"I don't have access to execute commands"**
→ MCP not enabled. Check LM Studio settings.

**"Fleet won't start"**
→ Check Ollama: `ollama list`

**"Port 8765 in use"**
→ Run: `npm run mcp:stop` then retry

**"Agents not responding"**
→ Restart: `npm run mcp:all`

---

## Best Practices

### ✅ DO:
- Ask Elaria for strategic recommendations first
- Let her delegate to the fleet for implementation
- Use parallel execution for multi-step features
- Start with quick wins before big features

### ❌ DON'T:
- Ask her to implement huge features alone (use the fleet!)
- Skip the planning phase (she's strategic for a reason)
- Forget to check fleet status first
- Use cloud agents (GPT/Claude) for simple tasks (waste of money)

---

## Example Workflow

**1. Strategic Planning:**
```
You: "What should I build this week?"
Elaria: [Provides ranked list with effort estimates]
```

**2. Start Fleet:**
```
You: "Start the agents"
Elaria: [Starts Ollama fleet + MCP router]
```

**3. Implement:**
```
You: "Implement the contact merge feature"
Elaria: [Delegates to 4 agents in parallel]
         - Qwen32B: Backend code
         - DeepSeek: Tests
         - CodeLlama: Optimization
         - Mistral: Documentation
Result: Done in 50 seconds
```

**4. Review:**
```
You: "Security review the merge feature"
Elaria: [Delegates to GPT-4 for OWASP audit]
Result: Audit complete with recommendations
```

---

## The Power Combo

**Elaria + Claude Code + MCP Fleet = Unstoppable**

- **Elaria:** Strategy & Delegation (what to build)
- **MCP Fleet:** Parallel Execution (build it fast)
- **Claude Code (Me):** Real-time coordination (make it happen)

**Together:** 4x faster, 80% cheaper, infinitely smarter

---

**Print this page and keep it handy!** 🚀
