#!/usr/bin/env node
/**
 * Initialize Elaria Command Center
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\src\init-elaria.js
 * Purpose: CRM-INIT command - Load all context and prepare Elaria
 */

import { LMStudioClient } from "@lmstudio/sdk";
import { readFile, readdir, access } from "fs/promises";
import { join } from "path";
import chalk from "chalk";
import ora from "ora";

// Configuration
const CONFIG = {
  lmStudio: {
    baseUrl: "ws://localhost:1234",
    model: "qwen2.5-30b-a3b"
  },
  clientforge: {
    root: "D:\\ClientForge",
    priorityFiles: [
      "README.md",
      "05_SHARED_AI\\context_pack\\project_overview.md",
      "05_SHARED_AI\\context_pack\\roles_rules.md",
      "05_SHARED_AI\\context_pack\\current_tasks.md",
      "05_SHARED_AI\\context_pack\\interfaces.md",
      "docs\\07_CHANGELOG.md",
      "docs\\00_MAP.md"
    ],
    buildLogsDir: "05_SHARED_AI\\build_logs"
  },
  orchestrator: {
    baseUrl: "http://127.0.0.1:8979",
    enabled: true
  }
};

console.log(chalk.cyan("╔════════════════════════════════════════════════════════════╗"));
console.log(chalk.cyan("║     ELARIA INITIALIZATION - CRM-INIT                       ║"));
console.log(chalk.cyan("╚════════════════════════════════════════════════════════════╝"));
console.log("");

/**
 * Check if file exists
 */
async function fileExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read file safely
 */
async function readFileSafe(path) {
  try {
    return await readFile(path, "utf-8");
  } catch (err) {
    return null;
  }
}

/**
 * Phase A: Load Context Files
 */
async function loadContext() {
  console.log(chalk.yellow("═══ Phase A: Loading Context Files ═══"));
  console.log("");

  const contextData = {
    loaded: [],
    missing: [],
    content: {}
  };

  for (const relativePath of CONFIG.clientforge.priorityFiles) {
    const fullPath = join(CONFIG.clientforge.root, relativePath);
    const spinner = ora(`Reading ${relativePath}`).start();

    const exists = await fileExists(fullPath);
    if (!exists) {
      spinner.fail(chalk.red(`Missing: ${relativePath}`));
      contextData.missing.push(relativePath);
      continue;
    }

    const content = await readFileSafe(fullPath);
    if (content) {
      const size = Buffer.byteLength(content, "utf-8");
      spinner.succeed(chalk.green(`Loaded: ${relativePath} (${size} bytes)`));
      contextData.loaded.push(relativePath);
      contextData.content[relativePath] = content;
    } else {
      spinner.fail(chalk.red(`Failed to read: ${relativePath}`));
      contextData.missing.push(relativePath);
    }
  }

  // List recent build logs
  const logsDir = join(CONFIG.clientforge.root, CONFIG.clientforge.buildLogsDir);
  const logsSpinner = ora("Scanning build logs...").start();

  try {
    const logFiles = await readdir(logsDir);
    const recentLogs = logFiles
      .filter(f => f.endsWith(".md") || f.endsWith(".log"))
      .sort()
      .reverse()
      .slice(0, 10);

    logsSpinner.succeed(chalk.green(`Found ${recentLogs.length} recent build logs`));
    contextData.recentLogs = recentLogs;
  } catch (err) {
    logsSpinner.warn(chalk.yellow("Build logs directory not found"));
    contextData.recentLogs = [];
  }

  console.log("");
  console.log(chalk.cyan("Context Summary:"));
  console.log(chalk.white(`  ✓ Loaded: ${contextData.loaded.length} files`));
  console.log(chalk.white(`  ✗ Missing: ${contextData.missing.length} files`));
  console.log(chalk.white(`  📋 Recent logs: ${contextData.recentLogs.length}`));
  console.log("");

  return contextData;
}

/**
 * Phase B: Check Orchestrator & Bots
 */
async function checkOrchestrator() {
  console.log(chalk.yellow("═══ Phase B: Checking Orchestrator ═══"));
  console.log("");

  if (!CONFIG.orchestrator.enabled) {
    console.log(chalk.gray("  Orchestrator disabled in config"));
    return null;
  }

  const statusSpinner = ora("Checking orchestrator status...").start();

  try {
    const response = await fetch(`${CONFIG.orchestrator.baseUrl}/status`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      statusSpinner.fail(chalk.yellow("Orchestrator returned non-OK status"));
      return null;
    }

    const status = await response.json();
    statusSpinner.succeed(chalk.green(`Orchestrator: ${status.status || "ONLINE"}`));

    // List bots
    const botsSpinner = ora("Listing available bots...").start();
    const botsResponse = await fetch(`${CONFIG.orchestrator.baseUrl}/bots`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000)
    });

    if (botsResponse.ok) {
      const bots = await botsResponse.json();
      botsSpinner.succeed(chalk.green(`Found ${bots.length || 0} bot(s)`));

      if (bots.length > 0) {
        bots.forEach((bot, idx) => {
          console.log(chalk.gray(`    ${idx + 1}. ${bot.name || bot.id} (${bot.status || "unknown"})`));
        });
      }

      return { status, bots };
    } else {
      botsSpinner.warn(chalk.yellow("Could not list bots"));
      return { status, bots: [] };
    }
  } catch (err) {
    statusSpinner.fail(chalk.yellow("Orchestrator not available"));
    console.log(chalk.gray(`    Reason: ${err.message}`));
    return null;
  } finally {
    console.log("");
  }
}

/**
 * Phase C: Initialize LM Studio & Generate Report
 */
async function initializeElaria(contextData, orchestratorData) {
  console.log(chalk.yellow("═══ Phase C: Initializing Elaria ═══"));
  console.log("");

  const spinner = ora("Connecting to LM Studio...").start();

  try {
    // Connect to LM Studio
    const client = new LMStudioClient({
      baseUrl: CONFIG.lmStudio.baseUrl
    });

    spinner.text = "Loading model...";
    const model = await client.llm.model(CONFIG.lmStudio.model, {
      loadModelIfNeeded: true,
      config: {
        contextLength: 32768,
        gpuLayers: 40
      }
    });

    spinner.succeed(chalk.green("Elaria model loaded"));

    // Build initialization prompt
    const initPrompt = buildInitPrompt(contextData, orchestratorData);

    // Send initialization request
    const reportSpinner = ora("Generating initialization report...").start();

    const result = await model.respond(initPrompt, {
      maxPredictedTokens: 2048
    });

    reportSpinner.succeed(chalk.green("Initialization complete"));

    console.log("");
    console.log(chalk.cyan("═══ Elaria Initialization Report ═══"));
    console.log("");
    console.log(chalk.white(result.content));
    console.log("");

    return {
      success: true,
      report: result.content,
      context: contextData,
      orchestrator: orchestratorData
    };

  } catch (err) {
    spinner.fail(chalk.red("Initialization failed"));
    console.log(chalk.red(`  Error: ${err.message}`));
    return {
      success: false,
      error: err.message
    };
  }
}

/**
 * Build initialization prompt
 */
function buildInitPrompt(contextData, orchestratorData) {
  const filesLoaded = contextData.loaded.map(f => `  - ${f}`).join("\n");
  const filesMissing = contextData.missing.length > 0
    ? `\n\nMissing files:\n${contextData.missing.map(f => `  - ${f}`).join("\n")}`
    : "";

  const orchestratorStatus = orchestratorData
    ? `\n\nOrchestrator Status: ${orchestratorData.status?.status || "ONLINE"}\nBots available: ${orchestratorData.bots?.length || 0}`
    : "\n\nOrchestrator: Not available";

  return `You are Elaria, the ClientForge CRM command center. You have just been initialized with the following context:

**CRM-INIT Execution Report**

Project: ClientForge CRM
Root: ${CONFIG.clientforge.root}
Model: ${CONFIG.lmStudio.model}

Context Files Loaded (${contextData.loaded.length}):
${filesLoaded}${filesMissing}

Recent Build Logs: ${contextData.recentLogs?.length || 0}${orchestratorStatus}

**Instructions:**
1. Confirm you have loaded the context successfully
2. Provide a brief summary of the ClientForge project based on README.md (if loaded)
3. List your primary capabilities as command center
4. Report your readiness status

Respond in a structured format:
- Status: [ONLINE/PARTIAL/ERROR]
- Context Quality: [COMPLETE/PARTIAL/INSUFFICIENT]
- Primary Capabilities: [bulleted list]
- Ready: [YES/NO]
- Notes: [any important observations]

Keep response concise (max 300 words).`;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Phase A: Load context
    const contextData = await loadContext();

    // Phase B: Check orchestrator
    const orchestratorData = await checkOrchestrator();

    // Phase C: Initialize Elaria
    const result = await initializeElaria(contextData, orchestratorData);

    if (result.success) {
      console.log(chalk.cyan("╔════════════════════════════════════════════════════════════╗"));
      console.log(chalk.cyan("║     ELARIA IS READY                                        ║"));
      console.log(chalk.cyan("╚════════════════════════════════════════════════════════════╝"));
      console.log("");
      console.log(chalk.green("✓ Initialization complete"));
      console.log(chalk.white("  You can now send commands to Elaria"));
      console.log("");
      console.log(chalk.yellow("Available commands:"));
      console.log(chalk.white("  • CRM-FEATURE <name>  - Scaffold new feature"));
      console.log(chalk.white("  • CRM-MODULE <name>   - Create full-stack module"));
      console.log(chalk.white("  • TEST                - Run test suite"));
      console.log(chalk.white("  • AUDIT               - Security & performance audit"));
      console.log(chalk.white("  • DEPLOY [branch]     - Deploy to production"));
      console.log(chalk.white("  • DOCS                - Update documentation"));
      console.log(chalk.white("  • SPEC <goal>         - Generate TaskSpec"));
      console.log("");
      process.exit(0);
    } else {
      console.log(chalk.red("╔════════════════════════════════════════════════════════════╗"));
      console.log(chalk.red("║     INITIALIZATION FAILED                                  ║"));
      console.log(chalk.red("╚════════════════════════════════════════════════════════════╝"));
      console.log("");
      console.log(chalk.red("✗ Could not initialize Elaria"));
      console.log(chalk.yellow("  Check the error messages above"));
      console.log("");
      process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red("Fatal error during initialization:"), err);
    process.exit(1);
  }
}

// Execute
main();
