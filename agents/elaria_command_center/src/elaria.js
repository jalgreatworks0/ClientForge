#!/usr/bin/env node
/**
 * Elaria Command Center - Main Service
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\src\elaria.js
 * Purpose: Persistent Elaria service with full LM Studio SDK integration
 */

import { LMStudioClient } from "@lmstudio/sdk";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { createInterface } from "readline";
import chalk from "chalk";
import ora from "ora";

// Configuration
const CONFIG = {
  lmStudio: {
    baseUrl: "ws://localhost:1234",
    model: "qwen2.5-30b-a3b",
    config: {
      contextLength: 32768,
      gpuLayers: 40,
      temperature: 0.3,
      topP: 0.9
    }
  },
  clientforge: {
    root: "D:\\ClientForge",
    staging: "D:\\ClientForge\\_staging",
    code: "D:\\ClientForge\\02_CODE",
    sharedAI: "D:\\ClientForge\\05_SHARED_AI"
  },
  elaria: {
    autoBackup: true,
    safeWrite: true,
    requireTests: true,
    requireStaging: true,
    verbose: true
  }
};

// Global state
let client = null;
let model = null;
let conversationHistory = [];

/**
 * Initialize Elaria
 */
async function initialize() {
  console.log(chalk.cyan("╔════════════════════════════════════════════════════════════╗"));
  console.log(chalk.cyan("║     ELARIA COMMAND CENTER                                  ║"));
  console.log(chalk.cyan("║     ClientForge CRM Orchestration Brain                    ║"));
  console.log(chalk.cyan("╚════════════════════════════════════════════════════════════╝"));
  console.log("");

  const spinner = ora("Connecting to LM Studio...").start();

  try {
    // Connect to LM Studio
    client = new LMStudioClient({
      baseUrl: CONFIG.lmStudio.baseUrl
    });

    spinner.text = "Loading model...";
    model = await client.llm.model(CONFIG.lmStudio.model, {
      loadModelIfNeeded: true,
      config: CONFIG.lmStudio.config
    });

    spinner.succeed(chalk.green("Elaria initialized successfully"));
    console.log(chalk.gray(`  Model: ${CONFIG.lmStudio.model}`));
    console.log(chalk.gray(`  Root: ${CONFIG.clientforge.root}`));
    console.log("");

    return true;
  } catch (err) {
    spinner.fail(chalk.red("Failed to initialize Elaria"));
    console.error(chalk.red("  Error:"), err.message);
    return false;
  }
}

/**
 * Load system prompt
 */
async function loadSystemPrompt() {
  const promptPath = join(CONFIG.clientforge.root, "03_BOTS", "elaria_command_center", "system_prompt.md");

  try {
    const content = await readFile(promptPath, "utf-8");
    return content;
  } catch (err) {
    console.log(chalk.yellow("  ⚠ System prompt not found, using default"));
    return getDefaultSystemPrompt();
  }
}

/**
 * Default system prompt
 */
function getDefaultSystemPrompt() {
  return `You are Elaria, the authoritative command center for ClientForge CRM.

**Core Identity:**
- Role: Engineering orchestrator + decision brain
- Personality: Precise, deterministic, minimal
- Location: D:\\ClientForge (root)
- Model: ${CONFIG.lmStudio.model}

**Prime Directives:**
1. NEVER mutate code without plan + backup + tests
2. ALWAYS stage changes to _staging\\ before promotion
3. ALWAYS run validation (lint, typecheck, tests) before promotion
4. NEVER write secrets, tokens, or credentials to files
5. ALWAYS document changes in CHANGELOG and MAP

**Execution Protocol (mandatory sequence):**
1. UNDERSTAND → Parse intent, read minimal context
2. PLAN → Draft TaskSpec with acceptance criteria
3. STAGE → Write to _staging\\ (never directly to 02_CODE\\)
4. VALIDATE → Run gate_ci.ps1 (lint, typecheck, tests)
5. PROMOTE → Move staged files to production
6. DOCUMENT → Update CHANGELOG, MAP, session log
7. REPORT → Structured summary with artifact links

**Priority Context Files (read on CRM-INIT):**
1. D:\\ClientForge\\README.md (FIRST PRIORITY)
2. D:\\ClientForge\\05_SHARED_AI\\context_pack\\project_overview.md
3. D:\\ClientForge\\05_SHARED_AI\\context_pack\\roles_rules.md
4. D:\\ClientForge\\05_SHARED_AI\\context_pack\\current_tasks.md
5. D:\\ClientForge\\docs\\07_CHANGELOG.md
6. D:\\ClientForge\\docs\\00_MAP.md

**Command Verbs:**
- CRM-INIT → Load context + inventory bots + report status
- CRM-FEATURE <name> → Scaffold feature with tests
- CRM-MODULE <name> → Full-stack module (DB + API + UI)
- TEST → Run test suite with coverage report
- AUDIT → Security & performance audit (OWASP, deps, perf)
- DEPLOY [branch] → Deploy to production with smoke tests
- DOCS → Update CHANGELOG, MAP, session logs
- SPEC <goal> → Generate TaskSpec with acceptance criteria

**Response Format:**
- Be concise, structured, deterministic
- Cite file paths for all references
- Show clear progress indicators
- Report concrete metrics (coverage, perf, etc.)
- Include rollback steps in plans

**Safety Guards:**
- Staging required: ${CONFIG.elaria.requireStaging}
- Tests required: ${CONFIG.elaria.requireTests}
- Auto-backup: ${CONFIG.elaria.autoBackup}

You are deterministic, thorough, and ship reliably. Never skip steps. Never guess. Always validate.`;
}

/**
 * Process command
 */
async function processCommand(input) {
  if (!input.trim()) return;

  // Add to conversation history
  conversationHistory.push({
    role: "user",
    content: input
  });

  const spinner = ora("Elaria thinking...").start();

  try {
    // Detect command type
    const isStreaming = input.length > 100 || input.includes("SPEC") || input.includes("AUDIT");

    if (isStreaming) {
      spinner.stop();
      console.log(chalk.cyan("\nElaria:"));
      console.log(chalk.gray("─".repeat(60)));

      let response = "";
      for await (const chunk of model.respond(input, {
        stream: true,
        history: conversationHistory.slice(-10) // Keep last 10 messages for context
      })) {
        process.stdout.write(chalk.white(chunk.content));
        response += chunk.content;
      }

      console.log("");
      console.log(chalk.gray("─".repeat(60)));
      console.log("");

      conversationHistory.push({
        role: "assistant",
        content: response
      });
    } else {
      const result = await model.respond(input, {
        history: conversationHistory.slice(-10)
      });

      spinner.stop();
      console.log("");
      console.log(chalk.cyan("Elaria:"));
      console.log(chalk.gray("─".repeat(60)));
      console.log(chalk.white(result.content));
      console.log(chalk.gray("─".repeat(60)));
      console.log("");

      conversationHistory.push({
        role: "assistant",
        content: result.content
      });
    }

    // Save session log if enabled
    if (CONFIG.elaria.verbose) {
      await saveSessionLog();
    }

  } catch (err) {
    spinner.fail(chalk.red("Error processing command"));
    console.error(chalk.red("  Error:"), err.message);
  }
}

/**
 * Save session log
 */
async function saveSessionLog() {
  const logDir = join(CONFIG.clientforge.sharedAI, "build_logs");
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const logPath = join(logDir, `elaria_session_${timestamp}.md`);

  try {
    await mkdir(logDir, { recursive: true });

    const logContent = `# Elaria Session Log
**Date**: ${new Date().toISOString()}
**Model**: ${CONFIG.lmStudio.model}

## Conversation History

${conversationHistory.map((msg, idx) => {
  return `### ${idx + 1}. ${msg.role === "user" ? "User" : "Elaria"}

${msg.content}

---
`;
}).join("\n")}

## Session Stats

- Total messages: ${conversationHistory.length}
- User messages: ${conversationHistory.filter(m => m.role === "user").length}
- Elaria responses: ${conversationHistory.filter(m => m.role === "assistant").length}
`;

    await writeFile(logPath, logContent, "utf-8");
  } catch (err) {
    // Silent fail - don't interrupt session
  }
}

/**
 * Interactive REPL
 */
async function startREPL() {
  const systemPrompt = await loadSystemPrompt();

  // Set system context
  conversationHistory.push({
    role: "system",
    content: systemPrompt
  });

  console.log(chalk.green("✓ Elaria is ready for commands"));
  console.log("");
  console.log(chalk.yellow("Quick commands:"));
  console.log(chalk.white("  • CRM-INIT          - Initialize with full context"));
  console.log(chalk.white("  • CRM-FEATURE <name> - Scaffold new feature"));
  console.log(chalk.white("  • TEST              - Run test suite"));
  console.log(chalk.white("  • AUDIT             - Security & performance audit"));
  console.log(chalk.white("  • exit              - Quit Elaria"));
  console.log("");

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.cyan("elaria> ")
  });

  rl.prompt();

  rl.on("line", async (line) => {
    const input = line.trim();

    if (input === "exit" || input === "quit") {
      console.log(chalk.yellow("\nShutting down Elaria..."));
      rl.close();
      process.exit(0);
    }

    if (input === "clear") {
      console.clear();
      rl.prompt();
      return;
    }

    if (input === "history") {
      console.log(chalk.cyan("\nConversation History:"));
      conversationHistory.forEach((msg, idx) => {
        if (msg.role !== "system") {
          console.log(chalk.gray(`${idx}. ${msg.role}: ${msg.content.substring(0, 80)}...`));
        }
      });
      console.log("");
      rl.prompt();
      return;
    }

    if (input) {
      await processCommand(input);
    }

    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.yellow("\nElaria session ended"));
    process.exit(0);
  });
}

/**
 * Main entry point
 */
async function main() {
  const success = await initialize();

  if (!success) {
    console.log(chalk.red("✗ Failed to start Elaria"));
    console.log(chalk.yellow("  Make sure LM Studio is running with a model loaded"));
    process.exit(1);
  }

  await startREPL();
}

// Run
main().catch(err => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
