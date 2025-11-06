# 🚀 Render MCP Server Setup Guide

**Enable Claude Code to manage your Render infrastructure directly with natural language**

**Last Updated**: 2025-11-06

---

## What is Render MCP Server?

The Render Model Context Protocol (MCP) server allows Claude Code to manage your Render infrastructure through natural language prompts:

- ✅ Create new services (web services, static sites, databases)
- ✅ Query databases and analyze data
- ✅ Check service metrics and logs
- ✅ Monitor deployment status
- ✅ Update environment variables
- ✅ Troubleshoot issues

**Example Prompts**:
- "Create a new Postgres database named clientforge-prod with 10GB storage"
- "List all my Render services"
- "Show me the most recent error logs for my API service"
- "What was the busiest traffic day for my service this month?"
- "Deploy the ClientForge backend from GitHub"

---

## Setup Instructions

### Step 1: Create a Render API Key

1. **Go to Render Dashboard**:
   - Open https://dashboard.render.com/account/api-keys

2. **Create New API Key**:
   - Click "Create API Key"
   - Name: `Claude Code MCP Server`
   - Click "Create"

3. **Copy the API Key**:
   - ⚠️ **IMPORTANT**: Copy the key immediately - you won't see it again!
   - Format: `rnd_xxxxxxxxxxxxxxxxxxxxxx`

4. **Save to .env**:
   - Add to `d:\clientforge-crm\.env`:
     ```bash
     # Render Platform
     RENDER_API_KEY=rnd_your_actual_api_key_here
     ```

---

### Step 2: Find Your Claude Code Config File

Claude Code stores its MCP configuration in a JSON file. The location depends on your OS:

**Windows**:
```
%APPDATA%\Claude\claude_code_config.json
```
Full path: `C:\Users\ScrollForge\AppData\Roaming\Claude\claude_code_config.json`

**If using Claude Desktop instead**:
```
%APPDATA%\Claude\claude_desktop_config.json
```

**Mac/Linux**:
```
~/.config/Claude/claude_code_config.json
```

---

### Step 3: Configure MCP Server

1. **Open the config file** (create it if it doesn't exist):
   - Windows: `C:\Users\ScrollForge\AppData\Roaming\Claude\claude_code_config.json`

2. **Add this configuration**:

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer rnd_your_actual_api_key_here"
      }
    }
  }
}
```

3. **Replace `rnd_your_actual_api_key_here`** with your actual Render API key

4. **Save the file**

5. **Restart Claude Code** (or reload the window)

---

### Step 4: Set Your Workspace

After restarting, tell Claude Code which Render workspace to use:

**Prompt**:
```
Set my Render workspace to ClientForge
```

Claude will confirm:
```
✅ Active workspace set to: ClientForge
```

---

## Quick Start Examples

Once configured, you can use natural language prompts:

### Service Management

**List Services**:
```
List all my Render services
```

**Service Details**:
```
Show me details about my clientforge-crm service
```

**Create New Service**:
```
Create a new web service from https://github.com/jalgreatworks0/ClientForge.git
```

### Database Operations

**Create Database**:
```
Create a new Postgres database named clientforge-prod with 5GB storage
```

**List Databases**:
```
Show me all my Render databases
```

**Query Database** (read-only):
```
Run this query on my clientforge database: SELECT COUNT(*) FROM users
```

### Monitoring & Logs

**View Logs**:
```
Show me the last 50 error logs from my API service
```

**Check Metrics**:
```
What was my API service's CPU usage yesterday?
```

**Traffic Analysis**:
```
What was the busiest traffic day for my service this month?
```

### Deployments

**Deploy History**:
```
Show me the last 5 deploys for clientforge-crm
```

**Deploy Status**:
```
What's the status of the current deploy?
```

### Environment Variables

**Update Env Vars**:
```
Update my service's environment variables:
DATABASE_URL=new_connection_string
REDIS_URL=new_redis_url
```

---

## Supported Operations

### ✅ Fully Supported

| Resource | Operations |
|----------|------------|
| **Workspaces** | List, set active, get details |
| **Web Services** | Create, list, get details, update env vars |
| **Static Sites** | Create, list, get details |
| **Postgres** | Create, list, get details, run queries (read-only) |
| **Key-Value Store** | Create, list, get details |
| **Deploys** | List history, get details |
| **Logs** | Fetch by filter, list label values |
| **Metrics** | CPU, memory, response times, bandwidth |

### ⚠️ Limited Support

| Resource | Limitations |
|----------|-------------|
| **Private Services** | Not yet supported for creation |
| **Background Workers** | Not yet supported for creation |
| **Cron Jobs** | Not yet supported for creation |
| **Free Instances** | Cannot create (only paid tiers) |

### ❌ Not Supported

- Service deletion (use Dashboard or REST API)
- Service modification (except env vars)
- Triggering manual deploys
- Autoscaling configuration
- IP allowlist management
- Image-backed services (Docker)

---

## Security Considerations

### API Key Permissions

⚠️ **The Render API key grants FULL access to**:
- All workspaces you can access
- All services and databases
- Ability to create resources (costs money!)
- Ability to modify environment variables

**Best Practices**:
1. ✅ Use a dedicated API key for Claude Code
2. ✅ Store the key only in the Claude config file (not in code)
3. ✅ Rotate the key periodically
4. ✅ Revoke immediately if compromised
5. ⚠️ Be careful with prompts that modify production resources

### What's Exposed

The MCP server tries to minimize exposing sensitive data, but Render cannot guarantee that secrets won't be exposed in Claude's context.

**Caution with**:
- Database connection strings
- Environment variables containing secrets
- API keys and tokens

---

## Troubleshooting

### "MCP server not responding"

**Check**:
1. Is your API key correct in the config file?
2. Did you restart Claude Code after updating the config?
3. Is the config file valid JSON? (Use a JSON validator)

**Fix**:
```bash
# Validate JSON on Windows
powershell -Command "Get-Content C:\Users\ScrollForge\AppData\Roaming\Claude\claude_code_config.json | ConvertFrom-Json"
```

### "Workspace not set"

**Error**: `Please set your workspace first`

**Fix**:
```
Set my Render workspace to ClientForge
```

### "Permission denied"

**Check**:
- Is your API key valid? (Check Render Dashboard → API Keys)
- Does your account have access to the workspace?

**Fix**:
- Create a new API key if the old one expired
- Update the config file with the new key
- Restart Claude Code

### "Service creation failed"

**Common Causes**:
- Trying to create a free instance (not supported)
- Missing required configuration (build command, start command)
- Invalid GitHub repository URL

**Fix**: Provide complete configuration in your prompt:
```
Create a web service named my-api from https://github.com/user/repo
Build command: npm install && npm run build
Start command: npm start
Environment: Node
```

---

## Configuration File Templates

### Minimal Configuration

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer rnd_your_api_key"
      }
    }
  }
}
```

### With Multiple MCP Servers

```json
{
  "mcpServers": {
    "render": {
      "url": "https://mcp.render.com/mcp",
      "headers": {
        "Authorization": "Bearer rnd_your_api_key"
      }
    },
    "github": {
      "url": "https://example.com/github-mcp",
      "headers": {
        "Authorization": "Bearer github_token"
      }
    }
  }
}
```

---

## What You Can Build

With Render MCP + Claude Code, you can:

### 1. **Automated Infrastructure Setup**
```
Create a complete production environment:
- Postgres database (10GB)
- Redis instance
- Backend API service from GitHub
- Frontend static site
```

### 2. **Monitoring & Alerting**
```
Analyze my service logs for the last hour and tell me if there are any critical errors
```

### 3. **Data Analysis**
```
Query my database and show me:
- Total users signed up this week
- Most active accounts
- Deals closed this month
```

### 4. **Performance Optimization**
```
Show me my service's response time distribution for the last 24 hours
```

### 5. **Troubleshooting**
```
Why isn't my site at clientforge-crm.onrender.com working?
```

---

## Example Workflow: Deploy New Feature

```markdown
1. User: "Create a new web service for the feature branch"

2. Claude: Creates service with staging configuration

3. User: "Deploy from the feature/new-dashboard branch"

4. Claude: Configures service to use that branch

5. User: "Show me the deploy logs"

6. Claude: Fetches and displays deployment progress

7. User: "What's the URL?"

8. Claude: Returns the service URL

9. User: "Check if it's responding"

10. Claude: Tests the health endpoint and reports status
```

---

## Advanced Usage

### Combining with Other Tools

You can combine Render MCP with other operations:

```
1. Create a new database on Render
2. Update my .env file with the connection string
3. Run database migrations
4. Deploy the backend service
5. Check if the API is responding
```

### Environment-Specific Operations

```
Set my Render workspace to ClientForge-Production
Update my production service's DATABASE_URL to use the new database
```

### Batch Operations

```
For each of my services, show me:
- Current deploy status
- Last deploy time
- Any recent errors in logs
```

---

## Resources

**Official Render Documentation**:
- MCP Server Guide: https://docs.render.com/mcp-server
- REST API Docs: https://docs.render.com/api
- API Keys: https://dashboard.render.com/account/api-keys

**GitHub Repository**:
- Source Code: https://github.com/render-oss/render-mcp-server
- Submit Issues: https://github.com/render-oss/render-mcp-server/issues

**MCP Protocol**:
- Specification: https://modelcontextprotocol.io/

---

## Quick Reference

### Config File Location
```
Windows: C:\Users\ScrollForge\AppData\Roaming\Claude\claude_code_config.json
Mac/Linux: ~/.config/Claude/claude_code_config.json
```

### Render Dashboard URLs
```
Services:    https://dashboard.render.com/
Databases:   https://dashboard.render.com/postgres
API Keys:    https://dashboard.render.com/account/api-keys
Production:  https://clientforge-crm.onrender.com
```

### Common Prompts
```
Set my Render workspace to [NAME]
List my Render services
Create a database named [NAME]
Show logs for [SERVICE]
Update env vars for [SERVICE]
What's the status of [SERVICE]?
```

---

## Summary

Once configured, the Render MCP Server allows you to:

✅ **Manage infrastructure** through natural language
✅ **Create and monitor** services and databases
✅ **Analyze logs and metrics** without leaving Claude Code
✅ **Troubleshoot issues** with AI assistance
✅ **Automate deployments** and operations

**Setup Time**: 5 minutes
**Complexity**: Low (just add API key to config file)
**Benefit**: Massive (infrastructure management in natural language)

---

**Last Updated**: 2025-11-06
**Built for**: ClientForge CRM v3.0
**Abstract Creatives LLC**
