#!/usr/bin/env tsx
// Planner adapter (Anthropic Claude SDK) - Optimized with retry, fallback, metrics
import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';
import { withRetry, isCircuitOpen } from '../lib/retry';
import { safeParseJSON, validateFields } from '../lib/json';

interface Task {
  task_id: string;
  role: 'builder';
  objective: string;
  inputs: { files?: string[]; acceptance: string[] };
  constraints: { loc_max: number; pack: string; branch?: string };
  status: 'open';
  notes: string;
}

const MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';
const MAX_TOKENS = 800;
const TEMPERATURE = 0.2;

// Tighter prompt (under 30 lines)
const PLANNER_PROMPT = `Return STRICT JSON only for ClientForge builder task (no prose):
{
  "task_id": "task-<timestamp>",
  "role": "builder",
  "objective": "<clear, single-focus objective>",
  "inputs": {
    "files": ["<exact paths if known>"],
    "acceptance": ["<criterion 1>", "<criterion 2>", "<criterion 3-5>"]
  },
  "constraints": {
    "loc_max": 300,
    "pack": "crm_pack",
    "branch": "feature/<name>"
  },
  "status": "open",
  "notes": "Why smallest step: <one sentence>"
}

Rules:
- pack ∈ {auth_pack,crm_pack,ai_pack,ui_pack,security_pack,performance_pack}
- Keep ≤300 LOC step
- 3-5 acceptance criteria
- Single focused objective`;

async function planWithClaude(objective: string, apiKey: string): Promise<Task> {
  const startTime = Date.now();

  const task = await withRetry(async () => {
    const client = new Anthropic({ apiKey, timeout: 5000 });
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      messages: [{ role: 'user', content: `${PLANNER_PROMPT}\n\nObjective: ${objective}` }]
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Non-text response');

    const parseResult = safeParseJSON<Task>(content.text);
    if (!parseResult.ok) throw new Error(`JSON parse failed: ${parseResult.error}`);

    const validResult = validateFields(parseResult.data!, ['task_id', 'role', 'objective', 'inputs', 'constraints', 'status']);
    if (!validResult.ok) throw new Error(`Validation failed: ${validResult.error}`);

    return validResult.data!;
  }, 'planner_claude', { maxRetries: 4, baseDelayMs: 300 });

  const latencyMs = Date.now() - startTime;
  console.error(JSON.stringify({ helper: 'planner', mode: 'claude_sdk', latency_ms: latencyMs, success: true }));
  return task;
}

// Fallback to local on failure
async function planWithFallback(objective: string, apiKey: string): Promise<Task> {
  try {
    if (isCircuitOpen('planner_claude', 3)) {
      throw new Error('Circuit breaker open');
    }
    return await planWithClaude(objective, apiKey);
  } catch (error: any) {
    console.error(JSON.stringify({ helper: 'planner', mode: 'claude_sdk', fallback_used: true, error: error.message }));
    // Fallback: return local-style task
    return {
      task_id: `task-${Date.now()}`,
      role: 'builder',
      objective: objective || 'Build feature X',
      inputs: {
        files: ['backend/core/contacts/contact-service.ts'],
        acceptance: ['Feature works', 'Tests pass', '85%+ coverage']
      },
      constraints: { loc_max: 300, pack: 'crm_pack', branch: 'feature/planned' },
      status: 'open',
      notes: `Fallback (API failed): ${error.message}`
    };
  }
}

// CLI mode
async function main() {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: 'CLAUDE_API_KEY not set' }));
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, terminal: false });
  let inputBuffer = '';
  rl.on('line', (line) => { inputBuffer += line; });
  rl.on('close', async () => {
    const task = await planWithFallback(inputBuffer.trim() || 'Add JWT refresh token support', apiKey);
    console.log(JSON.stringify(task, null, 2));
  });
}

export { planWithClaude, planWithFallback };
if (require.main === module) main();
