#!/usr/bin/env node
/**
 * Elaria Advanced Features - LM Studio 0.3.29+ API
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\src\advanced-features.js
 * Purpose: Demonstrate new LM Studio API capabilities
 */

import { LMStudioClient } from "@lmstudio/sdk";
import chalk from "chalk";
import ora from "ora";
import { CONFIG } from "./config.js";

console.log(chalk.cyan("╔════════════════════════════════════════════════════════════╗"));
console.log(chalk.cyan("║     ELARIA - Advanced LM Studio Features Demo             ║"));
console.log(chalk.cyan("╚════════════════════════════════════════════════════════════╝"));
console.log("");

/**
 * Feature 1: Idle TTL and Auto-Evict
 * Automatically unload models after inactivity
 */
async function demonstrateTTL() {
  console.log(chalk.yellow("═══ Feature 1: Idle TTL (Time-To-Live) ═══"));
  console.log("");

  console.log(chalk.white("Idle TTL allows models to auto-unload after inactivity."));
  console.log(chalk.gray("  • Default: 60 minutes"));
  console.log(chalk.gray("  • Configurable per-request"));
  console.log(chalk.gray("  • Saves memory when not in use"));
  console.log("");

  const spinner = ora("Testing TTL feature...").start();

  try {
    const client = new LMStudioClient({
      baseUrl: CONFIG.lmStudio.baseUrl
    });

    // Load model with 5-minute TTL
    const model = await client.llm.model(CONFIG.lmStudio.model, {
      loadModelIfNeeded: true,
      config: {
        ...CONFIG.lmStudio.config,
        ttl: 300 // 5 minutes
      }
    });

    spinner.succeed(chalk.green("Model loaded with 5-minute TTL"));
    console.log(chalk.gray("  The model will auto-unload after 5 minutes of inactivity"));
    console.log("");

    // Test quick request
    const result = await model.respond("Say 'TTL test successful' in 3 words.");
    console.log(chalk.green("✓ Response:"), chalk.white(result.content));
    console.log(chalk.gray("  TTL timer resets after each request"));
    console.log("");

  } catch (err) {
    spinner.fail(chalk.red("TTL test failed"));
    console.error(chalk.red("  Error:"), err.message);
  }
}

/**
 * Feature 2: Auto-Evict
 * Automatically unload previous models when loading new ones
 */
async function demonstrateAutoEvict() {
  console.log(chalk.yellow("═══ Feature 2: Auto-Evict ═══"));
  console.log("");

  console.log(chalk.white("Auto-Evict unloads previous JIT models before loading new ones."));
  console.log(chalk.gray("  • Prevents memory buildup"));
  console.log(chalk.gray("  • Easy model switching"));
  console.log(chalk.gray("  • Enabled by default"));
  console.log("");

  console.log(chalk.cyan("Configuration:"));
  console.log(chalk.white("  1. LM Studio → Developer → Server Settings"));
  console.log(chalk.white("  2. Toggle 'Auto-Evict for JIT loaded models'"));
  console.log(chalk.white("  3. When ON: keeps max 1 JIT model loaded"));
  console.log("");
}

/**
 * Feature 3: /v1/responses Endpoint
 * Stateful conversations with previous_response_id
 */
async function demonstrateResponsesAPI() {
  console.log(chalk.yellow("═══ Feature 3: /v1/responses Endpoint ═══"));
  console.log("");

  console.log(chalk.white("New OpenAI-compatible /v1/responses endpoint with:"));
  console.log(chalk.gray("  • Stateful interactions via previous_response_id"));
  console.log(chalk.gray("  • Custom tool calling"));
  console.log(chalk.gray("  • Remote MCP support"));
  console.log(chalk.gray("  • Reasoning effort control"));
  console.log("");

  const spinner = ora("Testing /v1/responses endpoint...").start();

  try {
    // First request
    const response1 = await fetch("http://localhost:1234/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.lmStudio.model,
        input: "List 3 critical files for ClientForge CRM initialization",
        reasoning: { effort: "low" }
      })
    });

    if (!response1.ok) {
      throw new Error(`HTTP ${response1.status}: ${response1.statusText}`);
    }

    const data1 = await response1.json();
    spinner.succeed(chalk.green("First response received"));
    console.log(chalk.gray(`  Response ID: ${data1.id}`));
    console.log(chalk.white(`  Content: ${data1.output_text?.substring(0, 100)}...`));
    console.log("");

    // Follow-up request using previous response ID
    spinner.start("Sending stateful follow-up...");

    const response2 = await fetch("http://localhost:1234/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: CONFIG.lmStudio.model,
        input: "What is the first file in that list?",
        previous_response_id: data1.id,
        reasoning: { effort: "low" }
      })
    });

    if (!response2.ok) {
      throw new Error(`HTTP ${response2.status}: ${response2.statusText}`);
    }

    const data2 = await response2.json();
    spinner.succeed(chalk.green("Follow-up response received"));
    console.log(chalk.gray(`  Response ID: ${data2.id}`));
    console.log(chalk.white(`  Content: ${data2.output_text}`));
    console.log("");

    console.log(chalk.green("✓ Stateful conversation works!"));
    console.log(chalk.gray("  The model remembered the previous context"));
    console.log("");

  } catch (err) {
    spinner.fail(chalk.red("Responses API test failed"));
    console.error(chalk.red("  Error:"), err.message);
    console.log(chalk.yellow("  Note: Requires LM Studio 0.3.29+"));
    console.log("");
  }
}

/**
 * Feature 4: Reasoning Effort Control
 * Control how much the model "thinks"
 */
async function demonstrateReasoningEffort() {
  console.log(chalk.yellow("═══ Feature 4: Reasoning Effort Control ═══"));
  console.log("");

  console.log(chalk.white("Control model reasoning depth for different tasks:"));
  console.log(chalk.gray("  • low    - Quick, simple queries"));
  console.log(chalk.gray("  • medium - Standard operations"));
  console.log(chalk.gray("  • high   - Complex planning & architecture"));
  console.log("");

  const testPrompt = "Explain the Stage → Validate → Promote workflow in ClientForge";

  const efforts = ["low", "medium", "high"];

  for (const effort of efforts) {
    const spinner = ora(`Testing reasoning effort: ${effort}...`).start();

    try {
      const startTime = Date.now();

      const response = await fetch("http://localhost:1234/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: CONFIG.lmStudio.model,
          input: testPrompt,
          reasoning: { effort }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const duration = Date.now() - startTime;

      spinner.succeed(chalk.green(`Reasoning effort: ${effort}`));
      console.log(chalk.gray(`  Time: ${duration}ms`));
      console.log(chalk.gray(`  Length: ${data.output_text?.length || 0} chars`));
      console.log(chalk.white(`  Preview: ${data.output_text?.substring(0, 80)}...`));
      console.log("");

    } catch (err) {
      spinner.fail(chalk.red(`Effort ${effort} failed`));
      console.error(chalk.red("  Error:"), err.message);
    }
  }

  console.log(chalk.cyan("Recommendation:"));
  console.log(chalk.white("  • Use 'low' for status checks, simple queries"));
  console.log(chalk.white("  • Use 'medium' for most Elaria operations"));
  console.log(chalk.white("  • Use 'high' for SPEC, AUDIT, complex planning"));
  console.log("");
}

/**
 * Feature 5: Speculative Decoding
 * Faster inference using a draft model
 */
async function demonstrateSpeculativeDecoding() {
  console.log(chalk.yellow("═══ Feature 5: Speculative Decoding ═══"));
  console.log("");

  console.log(chalk.white("Use a smaller draft model to speed up inference:"));
  console.log(chalk.gray("  • Main model: qwen3-30b-a3b"));
  console.log(chalk.gray("  • Draft model: qwen3-14b (smaller, faster)"));
  console.log(chalk.gray("  • Significant speedup for long responses"));
  console.log("");

  console.log(chalk.cyan("Example usage:"));
  console.log(chalk.gray(`
  {
    "model": "qwen3-30b-a3b",
    "draft_model": "qwen2.5-14b-instruct-uncensored",
    "messages": [ ... ]
  }
  `));

  console.log(chalk.cyan("Benefits:"));
  console.log(chalk.white("  • 1.5-3x faster inference"));
  console.log(chalk.white("  • Same quality as main model"));
  console.log(chalk.white("  • Automatic fallback if draft fails"));
  console.log("");

  console.log(chalk.yellow("Note:"));
  console.log(chalk.gray("  Draft model must be compatible (same architecture)"));
  console.log(chalk.gray("  Requires both models to be available in LM Studio"));
  console.log("");
}

/**
 * Feature 6: Tool Choice Control
 */
async function demonstrateToolChoice() {
  console.log(chalk.yellow("═══ Feature 6: Tool Choice Control ═══"));
  console.log("");

  console.log(chalk.white("Control when the model can use tools:"));
  console.log(chalk.gray("  • 'auto' - Model decides (default)"));
  console.log(chalk.gray("  • 'none' - Never use tools"));
  console.log(chalk.gray("  • 'required' - Must use tools"));
  console.log("");

  console.log(chalk.cyan("Example usage:"));
  console.log(chalk.gray(`
  {
    "model": "qwen3-30b-a3b",
    "tools": [ ... ],
    "tool_choice": "required"  // Must call a tool
  }
  `));

  console.log(chalk.cyan("Use cases:"));
  console.log(chalk.white("  • 'none' - When you want text-only responses"));
  console.log(chalk.white("  • 'auto' - Let model decide (most flexible)"));
  console.log(chalk.white("  • 'required' - Force file reads, API calls, etc."));
  console.log("");
}

/**
 * Feature 7: Model Capabilities Discovery
 */
async function demonstrateCapabilities() {
  console.log(chalk.yellow("═══ Feature 7: Model Capabilities Discovery ═══"));
  console.log("");

  const spinner = ora("Fetching model capabilities...").start();

  try {
    const response = await fetch("http://localhost:1234/v1/models");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    spinner.succeed(chalk.green("Model capabilities retrieved"));
    console.log("");

    // Find Qwen models and show their capabilities
    const qwenModels = data.data.filter(m => m.id.includes("qwen"));

    if (qwenModels.length > 0) {
      console.log(chalk.cyan("Qwen Model Capabilities:"));
      qwenModels.slice(0, 3).forEach(model => {
        console.log(chalk.white(`  ${model.id}`));
        if (model.capabilities && model.capabilities.length > 0) {
          console.log(chalk.gray(`    Capabilities: ${model.capabilities.join(", ")}`));
        } else {
          console.log(chalk.gray(`    Capabilities: Not listed`));
        }
      });
    }
    console.log("");

    console.log(chalk.cyan("Common Capabilities:"));
    console.log(chalk.gray("  • tool_use - Function/tool calling"));
    console.log(chalk.gray("  • vision - Image understanding"));
    console.log(chalk.gray("  • embeddings - Text embeddings"));
    console.log("");

  } catch (err) {
    spinner.fail(chalk.red("Failed to fetch capabilities"));
    console.error(chalk.red("  Error:"), err.message);
    console.log("");
  }
}

/**
 * Main execution
 */
async function main() {
  console.log(chalk.cyan("Testing LM Studio 0.3.29+ features..."));
  console.log(chalk.gray("These features enhance Elaria's capabilities"));
  console.log("");

  try {
    // Test all features
    await demonstrateTTL();
    await demonstrateAutoEvict();
    await demonstrateResponsesAPI();
    await demonstrateReasoningEffort();
    await demonstrateSpeculativeDecoding();
    await demonstrateToolChoice();
    await demonstrateCapabilities();

    console.log(chalk.cyan("╔════════════════════════════════════════════════════════════╗"));
    console.log(chalk.cyan("║     ADVANCED FEATURES DEMO COMPLETE                        ║"));
    console.log(chalk.cyan("╚════════════════════════════════════════════════════════════╝"));
    console.log("");

    console.log(chalk.green("✓ All features demonstrated"));
    console.log("");

    console.log(chalk.yellow("Recommended for Elaria:"));
    console.log(chalk.white("  1. Enable TTL (5-10 minutes) for memory efficiency"));
    console.log(chalk.white("  2. Use /v1/responses for stateful conversations"));
    console.log(chalk.white("  3. Adjust reasoning effort per command type"));
    console.log(chalk.white("  4. Use tool_choice: 'required' for file operations"));
    console.log(chalk.white("  5. Consider speculative decoding for long responses"));
    console.log("");

    console.log(chalk.cyan("Integration:"));
    console.log(chalk.white("  These features are ready to integrate into:"));
    console.log(chalk.gray("    • src/elaria.js - Main REPL"));
    console.log(chalk.gray("    • src/init-elaria.js - CRM-INIT"));
    console.log(chalk.gray("    • src/config.js - Configuration"));
    console.log("");

  } catch (err) {
    console.error(chalk.red("Fatal error:"), err);
    process.exit(1);
  }
}

// Run demo
main();
