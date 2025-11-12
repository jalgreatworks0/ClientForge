# Agents & MCP â€” Context Pack

## MCP Router
**Port:** 8765
**Health:** http://localhost:8765/health
**Servers:** http://localhost:8765/servers

## Available MCP Servers (33 Total)
- \i-router\ â€” AI model routing
- \pi-tester\ â€” API testing tools
- \uild\ â€” Build automation
- \codebase\ â€” Code search & analysis
- \context-pack\ â€” Context management
- \database\ â€” DB query tools
- \documentation\ â€” Doc generation
- \env-manager\ â€” Environment config
- \ilesystem\ â€” File operations
- \git\ â€” Git operations
- \ollama-fleet\ â€” Local LLM management
- \orchestrator\ â€” Multi-tool workflows
- \ag\ â€” Retrieval-augmented generation
- \security\ â€” Security scanning
- \system-control\ â€” System operations
- \	esting\ â€” Test execution
- \	odo\ â€” Task management
- ...and 16 more

## LM Studio Integration
**REST API:** http://localhost:1234/v1
**Models endpoint:** http://localhost:1234/v1/models

### Usage
- Local inference for agents
- Context: 32K+ tokens (depending on model)
- GPU acceleration (RTX 5090 + RTX 4090)

## Common MCP Commands
\\\ash
npm run mcp:all          # Start router + all servers
npm run mcp:stop         # Stop all MCP services
npm run mcp:health       # Check health status
\\\
