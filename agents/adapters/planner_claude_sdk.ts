#!/usr/bin/env tsx
// Planner adapter (Anthropic Claude SDK) - API implementation
// Uses @anthropic-ai/sdk + CLAUDE_API_KEY to generate builder tasks

import Anthropic from '@anthropic-ai/sdk';
import * as readline from 'readline';

interface Task {
  task_id: string;
  role: 'builder' | 'planner' | 'reviewer';
  objective: string;
  inputs: { files?: string[]; acceptance: string[] };
  constraints: { loc_max: number; pack: string; branch?: string };
  status: 'open' | 'in_progress' | 'done' | 'needs_changes';
  notes?: string;
}

const MODEL = process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022';

const PLANNER_PROMPT = `You are a technical planner for ClientForge CRM. Given a feature objective, decompose it into a single, actionable builder task.

Return ONLY valid JSON matching this schema (no markdown, no explanation):
{
  "task_id": "task-<timestamp>",
  "role": "builder",
  "objective": "<clear, actionable objective>",
  "inputs": {
    "files": ["<relevant file paths>"],
    "acceptance": ["<acceptance criterion 1>", "<criterion 2>", ...]
  },
  "constraints": {
    "loc_max": 300,
    "pack": "<auth_pack|crm_pack|ai_pack|ui_pack|security_pack|performance_pack>",
    "branch": "<feature/name>"
  },
  "status": "open",
  "notes": "<brief context>"
}

Rules:
- Keep LOC < 300
- Choose appropriate pack (default: crm_pack)
- 3-5 acceptance criteria
- Include relevant file paths if known`;

async function planWithClaude(objective: string, apiKey: string): Promise<Task> {
  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `${PLANNER_PROMPT}\n\nObjective: ${objective}`
      }
    ]
  });

  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude');
  }

  // Parse JSON from response (strip markdown if present)
  let jsonText = content.text.trim();
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/```(?:json)?\n?/g, '').trim();
  }

  const task = JSON.parse(jsonText);

  // Validate required fields
  if (!task.task_id || !task.role || !task.objective || !task.inputs?.acceptance || !task.constraints) {
    throw new Error('Invalid task schema from Claude API');
  }

  return task;
}

// CLI mode: read objective from stdin
async function main() {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) {
    console.error(JSON.stringify({ error: 'CLAUDE_API_KEY not set in environment' }));
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  let inputBuffer = '';
  rl.on('line', (line) => {
    inputBuffer += line;
  });

  rl.on('close', async () => {
    try {
      const objective = inputBuffer.trim() || 'Add JWT refresh token support';
      const task = await planWithClaude(objective, apiKey);
      console.log(JSON.stringify(task, null, 2));
    } catch (error: any) {
      console.error(JSON.stringify({
        error: 'Planner failed',
        message: error.message,
        task_id: `error-${Date.now()}`
      }));
      process.exit(1);
    }
  });
}

// Export for orchestrator
export { planWithClaude };

// Run if called directly
if (require.main === module) {
  main();
}
