# API Key Setup Guide for Claude Desktop MCP Servers

## Quick Start (5 minutes)

### Option 1: Environment Variables (Recommended - Most Secure)

**Windows**:
```powershell
# Set user-level environment variables (persist across reboots)
[System.Environment]::SetEnvironmentVariable('ANTHROPIC_API_KEY', 'sk-ant-api03-...', 'User')
[System.Environment]::SetEnvironmentVariable('OPENAI_API_KEY', 'sk-...', 'User')

# Verify
$env:ANTHROPIC_API_KEY
$env:OPENAI_API_KEY

# Restart Claude Desktop to load new environment variables
```

### Option 2: .env File (Good for Development)

1. **Copy the example file**:
   ```bash
   cd D:\clientforge-crm\agents\mcp
   copy .env.example .env
   ```

2. **Edit .env** with your API keys:
   ```bash
   notepad .env
   ```

3. **Update MCP servers to read from .env**:
   Already configured! The `env-manager-mcp-server.js` handles this.

4. **Verify .env is in .gitignore**:
   ```bash
   # Check that .env is not tracked
   git status
   # Should NOT show .env file
   ```

### Option 3: Windows Credential Manager (Most Secure for Production)

```powershell
# Store API key securely
cmdkey /generic:"ANTHROPIC_API_KEY" /user:"ScrollForge" /pass:"sk-ant-api03-..."

# Verify stored
cmdkey /list | Select-String "ANTHROPIC"

# MCP servers will retrieve using:
# cmdkey /list:ANTHROPIC_API_KEY
```

---

## Where to Get API Keys

### Anthropic (Claude API)
1. Go to https://console.anthropic.com/
2. Sign in or create account
3. Navigate to "API Keys"
4. Click "Create Key"
5. Name it "Claude Desktop MCP - ClientForge"
6. Copy key (starts with `sk-ant-api03-`)
7. **Save immediately** - you won't see it again!

**Cost**:
- Free tier: Limited credits for testing
- Pay-as-you-go: $0.25/million input tokens (Opus 4.1)
- Recommended monthly budget: $30 for 10% API validation use

### OpenAI (GPT-4)
1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Name it "Claude Desktop MCP"
5. Copy key (starts with `sk-`)
6. **Save immediately** - you won't see it again!

**Cost**:
- Free tier: $5 credit for new accounts
- Pay-as-you-go: $0.03/1K input tokens (GPT-4)
- Recommended monthly budget: $30 for hybrid validation

---

## Update MCP Configuration

After setting environment variables, update Claude Desktop config:

### File: `C:\Users\ScrollForge\AppData\Roaming\Claude\claude_desktop_config.json`

**Before**:
```json
{
  "clientforge-ai-router": {
    "env": {
      "ANTHROPIC_API_KEY": "",
      "OPENAI_API_KEY": ""
    }
  }
}
```

**After** (using environment variables):
```json
{
  "clientforge-ai-router": {
    "env": {
      "ANTHROPIC_API_KEY": "${ANTHROPIC_API_KEY}",
      "OPENAI_API_KEY": "${OPENAI_API_KEY}"
    }
  }
}
```

**Or** (reading from .env file - requires modification):
```json
{
  "clientforge-ai-router": {
    "command": "node",
    "args": [
      "-r", "dotenv/config",
      "D:\\clientforge-crm\\agents\\mcp\\servers\\ai-router-mcp-server.js"
    ],
    "env": {
      "DOTENV_CONFIG_PATH": "D:\\clientforge-crm\\agents\\mcp\\.env"
    }
  }
}
```

---

## Verify API Keys Work

### Test Anthropic API Key
```powershell
# PowerShell test
$headers = @{
    "x-api-key" = $env:ANTHROPIC_API_KEY
    "anthropic-version" = "2023-06-01"
    "Content-Type" = "application/json"
}

$body = @{
    model = "claude-opus-4-20250514"
    max_tokens = 10
    messages = @(
        @{
            role = "user"
            content = "Test"
        }
    )
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://api.anthropic.com/v1/messages" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

**Expected**: JSON response with `"type": "message"` and completion text.

### Test OpenAI API Key
```powershell
$headers = @{
    "Authorization" = "Bearer $env:OPENAI_API_KEY"
    "Content-Type" = "application/json"
}

$body = @{
    model = "gpt-4"
    messages = @(
        @{role="user"; content="Test"}
    )
    max_tokens = 10
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Uri "https://api.openai.com/v1/chat/completions" `
    -Method Post `
    -Headers $headers `
    -Body $body
```

**Expected**: JSON response with `"choices"` array and completion.

---

## Test AI Router MCP Tool

Once API keys are configured, test the `route_prompt` tool:

```javascript
// In Claude Desktop, use the MCP tool:
{
  "tool": "route_prompt",
  "arguments": {
    "prompt": "Explain quantum computing in simple terms",
    "task_type": "reasoning",
    "use_api_fallback": true
  }
}
```

**Expected Output**:
- Routes to local Llama 70B first
- If `confidence < 0.7`, falls back to Claude Opus API
- Returns combined response with routing decision

---

## Security Best Practices

### ✅ DO:
- Use environment variables or Credential Manager
- Set monthly spending limits on API accounts
- Rotate keys every 90 days
- Use separate keys for dev/staging/production
- Monitor API usage dashboards weekly

### ❌ DON'T:
- Hardcode API keys in source files
- Commit .env files to git
- Share keys in chat/email/Slack
- Use production keys for testing
- Exceed your monthly budget without alerts

---

## Troubleshooting

### "API key not found" error
1. Restart Claude Desktop after setting env vars
2. Verify env var is set: `echo $env:ANTHROPIC_API_KEY`
3. Check MCP server logs: `D:\clientforge-crm\logs\mcp\ai-router.log`

### "Invalid API key" error
1. Check key format:
   - Anthropic: `sk-ant-api03-` (50+ chars)
   - OpenAI: `sk-` (50+ chars)
2. Verify key is active in web console
3. Check for extra spaces/quotes in env var

### "Rate limit exceeded" error
1. Reduce API usage (increase local-only threshold)
2. Upgrade API plan (contact provider)
3. Implement request queuing/throttling

### MCP server crashes on startup
1. Check `.env` file syntax (no spaces around `=`)
2. Verify all required env vars are set
3. Run: `node D:\clientforge-crm\agents\mcp\servers\ai-router-mcp-server.js` manually to see errors

---

## Cost Monitoring

### Track Monthly Usage

**Anthropic Console**: https://console.anthropic.com/settings/billing
**OpenAI Console**: https://platform.openai.com/usage

### Set Spending Alerts

1. Anthropic: Settings → Billing → Usage Notifications
2. OpenAI: Settings → Limits → Hard Limit ($)

**Recommended Limits**:
- Light usage (1M tokens/month): $10/month
- Medium usage (10M tokens/month): $30/month
- Heavy usage (100M tokens/month): $100/month

### Calculate Expected Costs

Use the AI Router's cost tracking:

```javascript
{
  "tool": "get_routing_info",
  "arguments": {
    "include_cost_projection": true,
    "monthly_token_estimate": 10000000
  }
}
```

Returns:
- Local cost: $0/month
- API cost estimate: $30/month (10M tokens × $0.003/1K)
- Hybrid savings: 90% vs 100% API

---

## Next Steps

1. ✅ Set environment variables
2. ✅ Update claude_desktop_config.json
3. ✅ Restart Claude Desktop
4. ✅ Test API keys with curl/PowerShell
5. ✅ Test `route_prompt` MCP tool
6. ✅ Set spending alerts
7. ✅ Monitor usage weekly

**Setup complete!** Your hybrid local+API intelligence is ready.

For issues, check logs at: `D:\clientforge-crm\logs\mcp\ai-router.log`
