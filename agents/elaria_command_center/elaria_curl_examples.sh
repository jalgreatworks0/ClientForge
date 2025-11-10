#!/bin/bash
# Elaria cURL Examples - LM Studio Responses API
# Location: D:\ClientForge\03_BOTS\elaria_command_center\elaria_curl_examples.sh
# Purpose: Quick reference for interacting with Elaria via cURL

ENDPOINT="http://localhost:1234/v1/responses"
MODEL="qwen2.5-30b-a3b"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     ELARIA COMMAND CENTER - cURL Examples                  ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Example 1: CRM-INIT (Initialize Elaria with context)
echo "[Example 1] CRM-INIT - Initialize Elaria"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "CRM-INIT",
    "reasoning": { "effort": "medium" },
    "tools": [{
      "type": "mcp",
      "server_label": "filesystem",
      "server_url": "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
      "allowed_tools": ["read_file", "list_directory"]
    }]
  }'
EOF
echo ""
echo ""

# Example 2: Read README (Priority file)
echo "[Example 2] Read README.md - Priority Context"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "Read D:\\ClientForge\\README.md and provide a comprehensive summary of the ClientForge CRM system architecture.",
    "reasoning": { "effort": "high" },
    "tools": [{
      "type": "mcp",
      "server_label": "filesystem",
      "server_url": "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
      "allowed_tools": ["read_file"]
    }]
  }'
EOF
echo ""
echo ""

# Example 3: CRM-FEATURE (Scaffold new feature)
echo "[Example 3] CRM-FEATURE - Scaffold Feature"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "CRM-FEATURE email-tracking",
    "reasoning": { "effort": "high" },
    "tools": [
      {
        "type": "mcp",
        "server_label": "filesystem",
        "server_url": "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
        "allowed_tools": ["read_file", "write_file", "list_directory"]
      },
      {
        "type": "mcp",
        "server_label": "process",
        "server_url": "npx -y @modelcontextprotocol/server-process",
        "allowed_tools": ["execute_command"]
      }
    ]
  }'
EOF
echo ""
echo ""

# Example 4: TEST (Run test suite)
echo "[Example 4] TEST - Execute Test Suite"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "TEST",
    "reasoning": { "effort": "medium" },
    "tools": [{
      "type": "mcp",
      "server_label": "process",
      "server_url": "npx -y @modelcontextprotocol/server-process",
      "allowed_tools": ["execute_command"]
    }]
  }'
EOF
echo ""
echo ""

# Example 5: DEPLOY (Deploy to Render)
echo "[Example 5] DEPLOY - Deploy to Production"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "DEPLOY main",
    "reasoning": { "effort": "high" },
    "tools": [
      {
        "type": "mcp",
        "server_label": "http",
        "server_url": "npx -y @modelcontextprotocol/server-http",
        "allowed_tools": ["get", "post"]
      },
      {
        "type": "mcp",
        "server_label": "process",
        "server_url": "npx -y @modelcontextprotocol/server-process",
        "allowed_tools": ["execute_command"]
      }
    ]
  }'
EOF
echo ""
echo ""

# Example 6: Streaming response
echo "[Example 6] Streaming - Real-time Response"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "Analyze the current codebase structure and identify potential architectural improvements.",
    "stream": true,
    "reasoning": { "effort": "high" },
    "tools": [{
      "type": "mcp",
      "server_label": "filesystem",
      "server_url": "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
      "allowed_tools": ["read_file", "list_directory", "search_files"]
    }]
  }'
EOF
echo ""
echo ""

# Example 7: Stateful follow-up
echo "[Example 7] Stateful Follow-up - Context Continuation"
echo "─────────────────────────────────────────"
cat << 'EOF'
# First request:
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "List the top 5 critical files in ClientForge CRM"
  }' > response.json

# Extract response ID:
RESPONSE_ID=$(jq -r '.id' response.json)

# Follow-up request using previous context:
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"qwen2.5-30b-a3b\",
    \"input\": \"Read the first file from that list and explain its purpose\",
    \"previous_response_id\": \"$RESPONSE_ID\",
    \"tools\": [{
      \"type\": \"mcp\",
      \"server_label\": \"filesystem\",
      \"server_url\": \"npx -y @modelcontextprotocol/server-filesystem D:\\\\ClientForge\",
      \"allowed_tools\": [\"read_file\"]
    }]
  }"
EOF
echo ""
echo ""

# Example 8: Multi-tool complex request
echo "[Example 8] Multi-Tool - Comprehensive Analysis"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "SPEC: Implement user activity tracking. Include: (1) database schema analysis, (2) file system check for existing tracking, (3) orchestrator status, (4) comprehensive TaskSpec with acceptance criteria",
    "reasoning": { "effort": "high" },
    "tools": [
      {
        "type": "mcp",
        "server_label": "filesystem",
        "server_url": "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
        "allowed_tools": ["read_file", "list_directory", "search_files"]
      },
      {
        "type": "mcp",
        "server_label": "http",
        "server_url": "npx -y @modelcontextprotocol/server-http",
        "allowed_tools": ["get", "post"]
      },
      {
        "type": "mcp",
        "server_label": "process",
        "server_url": "npx -y @modelcontextprotocol/server-process",
        "allowed_tools": ["execute_command"]
      }
    ]
  }'
EOF
echo ""
echo ""

# Example 9: RAG Query
echo "[Example 9] RAG Query - Documentation Search"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "Search the RAG system for information about authentication implementation in ClientForge. Provide citations with file paths.",
    "reasoning": { "effort": "medium" },
    "tools": [{
      "type": "mcp",
      "server_label": "http",
      "server_url": "npx -y @modelcontextprotocol/server-http",
      "allowed_tools": ["post"]
    }]
  }'
EOF
echo ""
echo ""

# Example 10: AUDIT (Security & Performance)
echo "[Example 10] AUDIT - Security & Performance Check"
echo "─────────────────────────────────────────"
cat << 'EOF'
curl http://localhost:1234/v1/responses \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen2.5-30b-a3b",
    "input": "AUDIT - Perform comprehensive security and performance audit. Check: OWASP top 10, dependency vulnerabilities, performance gates (API <200ms, FCP <1.5s, bundle <200KB). Provide detailed report.",
    "reasoning": { "effort": "high" },
    "tools": [
      {
        "type": "mcp",
        "server_label": "filesystem",
        "server_url": "npx -y @modelcontextprotocol/server-filesystem D:\\ClientForge",
        "allowed_tools": ["read_file", "search_files"]
      },
      {
        "type": "mcp",
        "server_label": "process",
        "server_url": "npx -y @modelcontextprotocol/server-process",
        "allowed_tools": ["execute_command"]
      }
    ]
  }'
EOF
echo ""
echo ""

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     PowerShell Alternative: Use Invoke-RestMethod          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "PowerShell example:"
cat << 'EOF'
$body = @{
  model = "qwen2.5-30b-a3b"
  input = "CRM-INIT"
  reasoning = @{ effort = "medium" }
} | ConvertTo-Json -Depth 10

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:1234/v1/responses" `
  -Body $body `
  -ContentType "application/json"
EOF
echo ""
