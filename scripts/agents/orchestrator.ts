#!/usr/bin/env tsx
// ClientForge Multi-Agent Orchestrator
// Routes tasks between JSONL queues and adapters (local or HTTP)

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const ROOT = path.resolve(__dirname, '../..');
const INBOX = path.join(ROOT, 'agents/inbox.jsonl');
const OUTBOX = path.join(ROOT, 'agents/outbox.jsonl');
const CONFIG = path.join(ROOT, 'agents/config.json');
const CONFIG_EXAMPLE = path.join(ROOT, 'agents/config.example.json');

interface Config {
  mode: 'local' | 'http';
  adapters: {
    planner: { type: string; command: string };
    reviewer: { type: string; command: string };
  };
  http_endpoints?: {
    planner: string;
    reviewer: string;
  };
}

interface Task {
  task_id: string;
  role: 'planner' | 'builder' | 'reviewer';
  objective: string;
  inputs: { files: string[]; acceptance: string[] };
  constraints: { loc_max: number; pack: string; branch?: string };
  status: 'open' | 'in_progress' | 'done' | 'needs_changes';
  notes?: string;
}

// Initialize JSONL files if missing
function initFiles() {
  if (!fs.existsSync(INBOX)) fs.writeFileSync(INBOX, '', 'utf-8');
  if (!fs.existsSync(OUTBOX)) fs.writeFileSync(OUTBOX, '', 'utf-8');
  if (!fs.existsSync(CONFIG)) {
    console.log('[Init] config.json not found, copying from config.example.json');
    fs.copyFileSync(CONFIG_EXAMPLE, CONFIG);
  }
}

// Load config
function loadConfig(): Config {
  return JSON.parse(fs.readFileSync(CONFIG, 'utf-8'));
}

// Append to JSONL file (thread-safe write)
function appendJsonl(filepath: string, data: any) {
  const line = JSON.stringify(data) + '\n';
  fs.appendFileSync(filepath, line, 'utf-8');
}

// Read all lines from JSONL
function readJsonl(filepath: string): any[] {
  if (!fs.existsSync(filepath)) return [];
  const content = fs.readFileSync(filepath, 'utf-8').trim();
  if (!content) return [];
  return content.split('\n').map(line => JSON.parse(line));
}

// Execute local adapter via spawn
async function executeLocal(command: string, input: string): Promise<string> {
  const [cmd, ...args] = command.split(' ');
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd: ROOT });
    let output = '';
    let errorOutput = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        console.error(`[Local] Error: ${errorOutput}`);
        reject(new Error(`Command exited with code ${code}`));
      } else {
        resolve(output.trim());
      }
    });

    // Send input
    proc.stdin.write(input);
    proc.stdin.end();
  });
}

// Run planner
async function runPlanner(objective: string, config: Config): Promise<Task> {
  if (config.mode === 'local') {
    const output = await executeLocal(config.adapters.planner.command, objective);
    return JSON.parse(output);
  } else {
    // HTTP mode (stub)
    const { planViaHttp } = await import('../../agents/adapters/planner_http');
    return planViaHttp(config.http_endpoints!.planner, objective);
  }
}

// Run reviewer
async function runReviewer(prUrl: string, config: Config): Promise<any> {
  if (config.mode === 'local') {
    const output = await executeLocal(config.adapters.reviewer.command, prUrl);
    return JSON.parse(output);
  } else {
    // HTTP mode (stub)
    const { reviewViaHttp } = await import('../../agents/adapters/reviewer_http');
    return reviewViaHttp(config.http_endpoints!.reviewer, prUrl);
  }
}

// Main orchestrator loop
async function orchestrate(mode?: string) {
  initFiles();
  const config = loadConfig();

  console.log(`[Orchestrator] Mode: ${mode || 'loop'}`);
  console.log(`[Orchestrator] Config: ${config.mode}`);

  if (mode === 'plan') {
    // Plan-only mode
    const objective = process.argv[3] || 'Add JWT refresh token support';
    console.log(`[Planner] Objective: ${objective}`);
    const task = await runPlanner(objective, config);
    console.log('[Planner] Task generated:');
    console.log(JSON.stringify(task, null, 2));
    appendJsonl(OUTBOX, task);
  } else if (mode === 'review') {
    // Review-only mode
    const prUrl = process.argv[3] || 'https://github.com/org/repo/pull/1';
    console.log(`[Reviewer] PR: ${prUrl}`);
    const review = await runReviewer(prUrl, config);
    console.log('[Reviewer] Review generated:');
    console.log(JSON.stringify(review, null, 2));
    appendJsonl(OUTBOX, review);
  } else {
    // Default loop mode (consume inbox, route tasks)
    const tasks = readJsonl(INBOX);
    console.log(`[Orchestrator] Found ${tasks.length} tasks in inbox`);

    for (const task of tasks) {
      if (task.role === 'planner') {
        console.log(`[Orchestrator] Routing to planner: ${task.objective}`);
        const result = await runPlanner(task.objective, config);
        appendJsonl(OUTBOX, result);
      } else if (task.role === 'reviewer') {
        console.log(`[Orchestrator] Routing to reviewer: ${task.objective}`);
        const result = await runReviewer(task.objective, config);
        appendJsonl(OUTBOX, result);
      } else {
        console.log(`[Orchestrator] Skipping task with role: ${task.role}`);
      }
    }

    // Clear inbox after processing
    if (tasks.length > 0) {
      fs.writeFileSync(INBOX, '', 'utf-8');
      console.log('[Orchestrator] Inbox cleared');
    }
  }

  console.log('[Orchestrator] Complete');
}

// CLI entry point
const mode = process.argv.find(arg => arg.startsWith('--mode='))?.split('=')[1];
orchestrate(mode).catch(err => {
  console.error('[Orchestrator] Error:', err);
  process.exit(1);
});
