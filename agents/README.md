# ClientForge Multi-Agent Control Plane

Lightweight agent coordination system tailored for ClientForge CRM. Enables Claude (Builder & Orchestrator) to coordinate with two helper agents:
- **Planner** → Decomposes features into small builder tasks
- **Reviewer** → Performs rubric-based code reviews

## How It Works

1. **Transport**: Append-only JSONL files (`inbox.jsonl` / `outbox.jsonl`)
2. **Adapters**: Local (stdin/stdout) or HTTP (REST API)
3. **Schema**: Canonical task format in `contracts/task.schema.json`
4. **Config**: `config.json` (gitignored) selects local or HTTP mode

## Quick Start

### Setup
```bash
# Copy example config
cp agents/config.example.json agents/config.json

# Install dependencies (if not already)
pnpm install
```

### Run Planner (Local Mode)
```bash
pnpm agents:plan
# Generates a sample task and appends to outbox.jsonl
```

### Run Reviewer (Local Mode)
```bash
pnpm agents:review
# Generates a sample rubric review and appends to outbox.jsonl
```

### Run Orchestrator Loop
```bash
pnpm agents:run
# Processes all tasks in inbox.jsonl and routes to adapters
```

## Files

```
agents/
├── README.md                    # This file
├── inbox.jsonl                  # Input queue (consumed by orchestrator)
├── outbox.jsonl                 # Output queue (results from agents)
├── config.json                  # Runtime config (gitignored)
├── config.example.json          # Config template
├── contracts/
│   └── task.schema.json         # JSON Schema for tasks
└── adapters/
    ├── planner_local.ts         # Planner (stdin/stdout)
    ├── planner_http.ts          # Planner (HTTP)
    ├── reviewer_local.ts        # Reviewer (stdin/stdout)
    └── reviewer_http.ts         # Reviewer (HTTP)

scripts/
└── agents/
    └── orchestrator.ts          # Main orchestrator loop (~150 LOC)
```

## Task Schema

See [contracts/task.schema.json](contracts/task.schema.json).

Example:
```json
{
  "task_id": "task-123",
  "role": "builder",
  "objective": "Add JWT refresh token support",
  "inputs": {
    "files": ["backend/core/auth/auth.service.ts"],
    "acceptance": ["Refresh tokens work", "Tests pass", "85%+ coverage"]
  },
  "constraints": {
    "loc_max": 300,
    "pack": "auth_pack",
    "branch": "feature/jwt-refresh"
  },
  "status": "open",
  "notes": "Follow ClientForge protocols"
}
```

## Integration with ClientForge Protocols

This system **augments** (does not replace) existing protocols:
- ✅ All P0/P1/P2 protocols remain active
- ✅ Pack system (`docs/claude/11_CONTEXT_PACKS.md`)
- ✅ Review rubric (`docs/claude/16_REVIEW_RUBRIC.md`)
- ✅ Verification codes (`ANTI-DUP-CHECK-COMPLETE`, `SESSION-END-v3.0-COMPLETE`)

## Rollback

To disable the agents system:
1. Remove `agents:*` scripts from `package.json`
2. Delete `agents/` directory
3. Delete `scripts/agents/` directory
4. Revert README.md changes (remove "Multi-Agent Control Plane" section)

## Current Status

**Version:** 1.0.0
**Status:** ✅ Operational (stub adapters)
**Verification:** `AGENTS-V1-READY`

The adapters currently return deterministic sample data. Replace with real implementations (AI calls, GitHub API, etc.) as needed.

---

**Built for ClientForge CRM by Abstract Creatives LLC**
