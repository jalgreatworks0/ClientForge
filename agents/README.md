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

## API Helpers (Claude & GPT)

**Added in v1.1:** Real AI-powered adapters using Anthropic Claude SDK and OpenAI GPT SDK.

### Modes
Each helper (planner, reviewer) supports 3 modes configured in `agents/config.json`:
- **`local`**: Deterministic stubs (stdin/stdout)
- **`claude_sdk`** (planner) / **`gpt_sdk`** (reviewer): Live API calls
- **`http`**: Custom HTTP endpoints

### Required Environment Variables
Create a `.env` file in the project root with:
```bash
CLAUDE_API_KEY=sk-ant-...     # For planner with claude_sdk mode
GPT_API_KEY=sk-...            # For reviewer with gpt_sdk mode
```

**Never commit `.env`** — it's gitignored.

### Default Models
- **Planner (Claude)**: `claude-3-5-sonnet-20241022`
- **Reviewer (GPT)**: `gpt-4-turbo`

Override in `agents/config.json`:
```json
{
  "planner": {
    "mode": "claude_sdk",
    "claude_sdk": { "model": "claude-3-7" }
  },
  "reviewer": {
    "mode": "gpt_sdk",
    "gpt_sdk": { "model": "gpt-5.1" }
  }
}
```

### Demo Commands
```bash
# Set API keys in .env first
# Then run:

pnpm agents:plan             # Uses planner.mode (e.g., claude_sdk)
pnpm agents:review           # Uses reviewer.mode (e.g., gpt_sdk)
pnpm agents:run              # Full orchestrator loop
```

### Integration with ClientForge
All helpers follow ClientForge protocols:
- ✅ Pack system (`crm_pack`, `auth_pack`, etc.)
- ✅ Review rubric (8-dimension scoring)
- ✅ Task schema with LOC constraints
- ✅ Verification codes

This **augments** (does not replace) `docs/ai` protocols.

---

## Optimization & Reliability (v1.2)

The API helpers (`planner_claude_sdk`, `reviewer_gpt_sdk`) are optimized for production use with:

### Retry & Backoff
- **Exponential backoff** with jitter (300ms base, 2x multiplier, 5s max)
- **4 retry attempts** for transient failures (network, rate limits, timeouts)
- **Circuit breaker**: 3 consecutive failures → 60s cooldown → auto-fallback to local

### Cost Controls
- **Token limits**: max_tokens=800 (down from 1024/1500)
- **Temperature tuning**: 0.2 (planner), 0.1 (reviewer) for deterministic outputs
- **Tighter prompts**: <30 lines, strict JSON-only format

### Graceful Degradation
- **Auto-fallback**: API failures automatically return local stub responses
- **No hard failures**: System always produces valid output (review/task)
- **Metrics emission**: Structured JSON logs to stderr with `{helper, mode, latency_ms, success, fallback_used}`

### Quality Assurance
- **JSON validation**: Runtime checks using `safeParseJSON()` + `validateFields()`
- **Schema compliance**: Reviewer output strictly aligns with [review.schema.json](contracts/review.schema.json)
- **Evidence limiting**: Max 12 findings per review (aligned with rubric)
- **Rubric alignment**: 8-dimension scoring (correctness, type_safety, security, observability, dx_ergonomics, test_coverage, incrementality, risk_control)

### Configuration
See `agents/config.example.json` → `limits` section for retry/circuit breaker settings.

### Troubleshooting
- **Circuit breaker open**: Wait 60s or restart process to reset failures
- **Fallback mode triggered**: Check stderr logs for error details, verify API keys in `.env`
- **High latency**: Review `latency_ms` in stderr metrics, consider reducing prompt complexity

---

## Current Status

**Version:** 1.2.0
**Status:** ✅ Operational (local stubs + optimized API adapters with retry/fallback)
**Verification:** `AGENTS-V1.2-OPTIMIZED`

---

**Built for ClientForge CRM by Abstract Creatives LLC**
