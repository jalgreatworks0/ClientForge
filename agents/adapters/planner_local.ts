#!/usr/bin/env tsx
// Planner adapter (local mode) - Stub implementation
// Reads objective from stdin, outputs task JSON

import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

let inputBuffer = '';

rl.on('line', (line) => {
  inputBuffer += line;
});

rl.on('close', () => {
  const startTime = Date.now();
  const objective = inputBuffer.trim();

  // Stub: Generate deterministic sample task
  const task = {
    task_id: `task-${Date.now()}`,
    role: 'builder',
    objective: objective || 'Build feature X',
    inputs: {
      files: ['backend/core/contacts/contact-service.ts'],
      acceptance: ['Feature works', 'Tests pass', '85%+ coverage']
    },
    constraints: {
      loc_max: 300,
      pack: 'crm_pack',
      branch: 'feature/planned'
    },
    status: 'open',
    notes: 'Why smallest step: Local stub for fast development; real planning via claude_sdk'
  };

  // Output task + metrics
  const latencyMs = Date.now() - startTime;
  console.log(JSON.stringify(task, null, 2));
  console.error(JSON.stringify({ helper: 'planner', mode: 'local', latency_ms: latencyMs, success: true }));
});
