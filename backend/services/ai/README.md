# Albedo AI System - Advanced Autonomous AI Agent

## Overview

Albedo is ClientForge CRM's integrated AI assistant powered by Claude (Anthropic) and OpenAI. It's not just a chatbot - it's an **autonomous agent** that can execute real CRM actions through natural language.

**Key Capabilities:**
- 🤖 **Autonomous Action Execution** - "Create a contact named John Smith" actually creates the contact
- 🔧 **17 Built-in Tools** - Contacts, Deals, Tasks, Email, Search, and more
- 🌐 **Web Search** - Real-time information via Serper API
- 🤝 **Collaborative Mode** - Claude + OpenAI working together
- 💬 **Contextual Chat** - Understands current page and user context
- 📊 **Usage Tracking** - Cost, tokens, and performance analytics

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (React)                        │
│                    AlbedoChat Component                      │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTP POST /api/v1/ai/chat
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI Controller (Express)                    │
│            Smart routing: Actions vs. Chat                  │
└───────────┬──────────────────────────┬──────────────────────┘
            │                          │
            ▼                          ▼
   ┌────────────────────┐    ┌────────────────────────┐
   │  Action Executor   │    │  Multi-Provider Chat   │
   │  (Tool Calling)    │    │  (Claude + OpenAI)     │
   └─────────┬──────────┘    └────────────────────────┘
             │
             ▼
   ┌─────────────────────────────────────┐
   │         AI Tools (17 tools)          │
   │  - Contact Management                │
   │  - Deal Management                   │
   │  - Task Management                   │
   │  - Email Sending                     │
   │  - Web Search                        │
   │  - Dashboard Stats                   │
   │  - Note Creation                     │
   └─────────────────────────────────────┘
```

---

## File Structure

```
backend/services/ai/
├── README.md                    # This file
├── ai-service.ts               # Main AI service (Claude SDK integration)
├── ai-config.ts                # Configuration, model selection, pricing
├── ai-types.ts                 # TypeScript types and interfaces
├── ai-tools.ts                 # 17 CRM tools for action execution
├── ai-action-executor.ts       # Orchestrates tool calling with Claude
└── ai-usage-repository.ts      # Usage tracking and analytics

backend/services/
├── claude.sdk.service.ts       # Claude API wrapper
├── openai.service.ts           # OpenAI API wrapper
└── ai.multi-provider.service.ts # Intelligent provider routing

backend/api/rest/v1/
├── controllers/ai-controller.ts # HTTP request handlers
└── routes/ai-routes.ts          # API route definitions
```

---

## API Endpoints

### 1. **POST /api/v1/ai/chat**
Main chat endpoint with automatic action detection.

**Request:**
```json
{
  "message": "Create a contact named John Smith with email john@example.com",
  "enableActions": true,
  "context": {
    "currentPage": "contacts",
    "systemPrompt": "Custom system prompt (optional)"
  }
}
```

**Response (Action Executed):**
```json
{
  "success": true,
  "data": {
    "type": "action",
    "message": "I've created the contact John Smith with the email john@example.com.",
    "actions": [
      {
        "tool": "create_contact",
        "parameters": {
          "firstName": "John",
          "lastName": "Smith",
          "email": "john@example.com"
        },
        "result": {
          "success": true,
          "contactId": 42,
          "message": "Contact \"John Smith\" created successfully"
        },
        "success": true
      }
    ],
    "totalCost": 0.004523,
    "model": "claude-3-5-sonnet"
  }
}
```

**Response (Chat):**
```json
{
  "success": true,
  "data": {
    "type": "chat",
    "content": "Your dashboard shows 47 active deals worth $2.4M...",
    "model": "Claude 3.5 Haiku",
    "cost": 0.001234,
    "latency": 850
  }
}
```

### 2. **POST /api/v1/ai/chat/stream**
Real-time streaming responses (Server-Sent Events).

### 3. **POST /api/v1/ai/analyze**
Analyze CRM entities (contacts, deals, etc.) and provide insights.

### 4. **POST /api/v1/ai/execute**
Explicitly execute an action with collaborative validation.

### 5. **GET /api/v1/ai/models**
Get available models, features, and tools.

### 6. **GET /api/v1/ai/usage**
Get AI usage statistics for current user.

---

## Available Tools

Albedo has access to 17 tools for autonomous action execution:

### Contact Management
1. **create_contact** - Create new contacts
2. **update_contact** - Update existing contacts
3. **search_contacts** - Search contacts by name, email, company
4. **get_contact_details** - Get full contact information

### Deal Management
5. **create_deal** - Create new deals/opportunities
6. **update_deal_stage** - Move deals through pipeline

### Task Management
7. **create_task** - Create tasks and reminders
8. **complete_task** - Mark tasks as completed

### Notes & Activities
9. **create_note** - Add notes to contacts/deals

### Email
10. **send_email** - Send emails to contacts

### Data & Analytics
11. **get_dashboard_stats** - Get CRM statistics
12. **get_upcoming_tasks** - Get upcoming tasks and deadlines

### Web Search
13. **web_search** - Search the web via Serper API

---

## Example Usage

### Example 1: Create a Contact
**User:** "Add a new contact named Sarah Johnson, email sarah@techcorp.com, works at TechCorp as CTO"

**Albedo:**
1. Detects action intent
2. Calls `create_contact` tool
3. Executes database insertion
4. Returns confirmation

**Result:**
```
✅ I've added Sarah Johnson to your contacts:
- Email: sarah@techcorp.com
- Company: TechCorp
- Title: CTO
- Contact ID: #127
```

### Example 2: Get Dashboard Stats
**User:** "What are my current CRM stats?"

**Albedo:**
1. Calls `get_dashboard_stats` tool
2. Retrieves data from database
3. Formats response

**Result:**
```
📊 Here's your CRM overview:
- Total Contacts: 342
- Active Deals: 47
- Pipeline Value: $2,450,000
- Open Tasks: 23
```

### Example 3: Web Search
**User:** "Search for recent news about Anthropic AI"

**Albedo:**
1. Calls `web_search` tool
2. Queries Serper API
3. Returns top results

**Result:**
```
🔍 Here are the latest news about Anthropic AI:
1. "Anthropic releases Claude 3.5 Haiku" - techcrunch.com
2. "Claude AI now supports computer use" - theverge.com
...
```

### Example 4: Create Task with Deal Context
**User:** "Create a task to follow up with deal #42 next Monday"

**Albedo:**
1. Parses intent (create_task)
2. Extracts parameters (deal ID, due date)
3. Creates task linked to deal

---

## Collaborative Mode

Enable both Claude and OpenAI to work together:

```typescript
{
  "message": "Plan a complex sales campaign",
  "collaborative": true,
  "needsValidation": true
}
```

**Flow:**
1. **Claude** analyzes and creates execution plan
2. **OpenAI** reviews and suggests improvements
3. Combined insights returned to user

**Benefits:**
- Higher quality for complex tasks
- Cross-validation reduces errors
- Best of both models

---

## Configuration

### Environment Variables

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
SERPER_API_KEY=...

# Optional
AI_DEFAULT_MODEL=sonnet
AI_DEFAULT_TEMPERATURE=0.7
AI_CACHE_ENABLED=true
AI_RATE_LIMIT_PER_MINUTE=60
```

### Model Selection

**Haiku** (Fast, Cheap)
- Simple questions
- Quick lookups
- Status checks
- Cost: $1/$5 per 1M tokens

**Sonnet** (Balanced)
- Default for actions
- Complex reasoning
- Tool calling
- Cost: $3/$15 per 1M tokens

**Opus** (Powerful)
- Enterprise tier
- Complex analysis
- Strategic planning
- Cost: $15/$75 per 1M tokens

**GPT-4o Mini** (Fast, Cheap)
- Fallback option
- Vision tasks
- Cost: $0.15/$0.60 per 1M tokens

**GPT-4o** (Multimodal)
- Image analysis
- Vision tasks
- Cost: $2.5/$10 per 1M tokens

---

## Security

### Built-in Protections

1. **User Isolation** - All tools check `userId` to prevent cross-user access
2. **SQL Injection Prevention** - Parameterized queries everywhere
3. **Input Validation** - Zod schemas on all endpoints
4. **Rate Limiting** - Subscription-based quotas
5. **Cost Control** - Token and cost tracking per request

### Best Practices

- Always validate user permissions in tools
- Never expose sensitive data in error messages
- Log all actions for audit trail
- Implement quotas per subscription tier

---

## Testing

### Manual Testing

```bash
# Test basic chat
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello Albedo!"}'

# Test action execution
curl -X POST http://localhost:3000/api/v1/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Create a contact named Test User", "enableActions": true}'

# Get available models/tools
curl http://localhost:3000/api/v1/ai/models
```

### Frontend Testing

1. Open dashboard
2. Click Albedo button (bottom right)
3. Try these commands:
   - "Get my dashboard stats"
   - "Show my upcoming tasks"
   - "Create a contact named Alice"
   - "Search the web for CRM tips"

---

## Performance

### Response Times
- Simple chat: 500-1000ms
- Action execution: 1000-2000ms
- Web search: 1500-2500ms

### Cost Optimization
- Prompt caching (90% cost reduction on repeated prompts)
- Smart model selection (Haiku for simple, Sonnet for complex)
- Response streaming for better UX

### Caching Strategy
- System prompts cached (TTL: 5 minutes)
- Dashboard stats cached (TTL: 1 hour)
- Search results cached (TTL: 10 minutes)

---

## Future Enhancements

### Planned Features
- [ ] Voice input/output
- [ ] Image analysis (screenshots, documents)
- [ ] Multi-turn conversations with memory
- [ ] Workflow automation builder
- [ ] Scheduled actions
- [ ] Email auto-responses
- [ ] Smart suggestions based on patterns
- [ ] Integration with calendar/meetings
- [ ] Lead scoring predictions
- [ ] Win probability calculations

### Additional Tools
- [ ] Create/update accounts
- [ ] Manage custom fields
- [ ] Generate reports
- [ ] Import/export data
- [ ] Configure workflows
- [ ] Send SMS
- [ ] Schedule meetings

---

## Troubleshooting

### Common Issues

**1. "API key not configured"**
- Check `.env` file has `ANTHROPIC_API_KEY` or `OPENAI_API_KEY`
- Restart server after adding keys

**2. "Tool execution failed"**
- Check database connection
- Verify user ID is valid
- Check tool parameters match schema

**3. "Rate limit exceeded"**
- Check subscription quota
- Implement request throttling
- Use caching more aggressively

**4. "High latency responses"**
- Use streaming for long responses
- Switch to Haiku for simple queries
- Enable prompt caching

---

## Contributing

### Adding New Tools

1. Define tool in `ai-tools.ts`:
```typescript
export const myNewTool: AITool = {
  name: 'my_new_action',
  description: 'What this tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'First parameter' },
    },
    required: ['param1'],
  },
  execute: async (params, context) => {
    // Your implementation
    return { success: true, message: 'Done!' }
  },
}
```

2. Add to `ALL_TOOLS` array

3. Test with natural language command

---

## Support

For questions or issues:
- Check logs in `backend/logs/`
- Review AI usage in `/api/v1/ai/usage`
- Check database tables: `claude_usage`, `openai_usage`, `ai_action_log`

**Version:** 1.0.0
**Last Updated:** 2025-11-06
**Maintained By:** Abstract Creatives LLC
