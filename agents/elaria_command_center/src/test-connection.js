#!/usr/bin/env node
/**
 * Test LM Studio Connection - Official SDK Test
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\src\test-connection.js
 * Purpose: Verify LM Studio TypeScript SDK connectivity
 */

import { LMStudioClient } from "@lmstudio/sdk";
import chalk from "chalk";

console.log(chalk.cyan("╔════════════════════════════════════════════════════════════╗"));
console.log(chalk.cyan("║     ELARIA - LM Studio SDK Connection Test                ║"));
console.log(chalk.cyan("╚════════════════════════════════════════════════════════════╝"));
console.log("");

async function testConnection() {
  let client;

  try {
    // Step 1: Connect to LM Studio
    console.log(chalk.yellow("[1/5] Connecting to LM Studio..."));
    client = new LMStudioClient({
      baseUrl: "ws://localhost:1234"
    });
    console.log(chalk.green("  ✓ Connected to LM Studio"));

    // Step 2: List available models
    console.log("");
    console.log(chalk.yellow("[2/5] Listing available models..."));
    const models = await client.llm.listLoaded();
    console.log(chalk.green(`  ✓ Found ${models.length} loaded model(s)`));

    if (models.length === 0) {
      console.log(chalk.red("  ✗ No models loaded!"));
      console.log(chalk.yellow("  Please load a model in LM Studio"));
      process.exit(1);
    }

    models.forEach((model, idx) => {
      console.log(chalk.gray(`    ${idx + 1}. ${model.path} (${model.architecture || 'unknown'})`));
    });

    // Step 3: Get specific model
    console.log("");
    console.log(chalk.yellow("[3/5] Loading Qwen model..."));
    let model;
    try {
      model = await client.llm.model("qwen2.5-30b-a3b", {
        loadModelIfNeeded: true,
        config: {
          contextLength: 32768,
          gpuLayers: 40
        }
      });
      console.log(chalk.green("  ✓ Model loaded successfully"));
      console.log(chalk.gray(`    Identifier: ${model.identifier || 'N/A'}`));
    } catch (err) {
      console.log(chalk.yellow("  ⚠ Specific model not found, using first available..."));
      model = await client.llm.model(models[0].path);
      console.log(chalk.green(`  ✓ Using: ${models[0].path}`));
    }

    // Step 4: Test basic response
    console.log("");
    console.log(chalk.yellow("[4/5] Testing basic response..."));
    const result = await model.respond("You are Elaria, the ClientForge command center. Respond with 'ONLINE' and your current status in one sentence.");
    console.log(chalk.green("  ✓ Response received:"));
    console.log(chalk.white(`    ${result.content}`));

    // Step 5: Test streaming
    console.log("");
    console.log(chalk.yellow("[5/5] Testing streaming response..."));
    process.stdout.write(chalk.gray("    Streaming: "));

    let streamedText = "";
    for await (const chunk of model.respond("Say hello in exactly 5 words.", { stream: true })) {
      process.stdout.write(chalk.white(chunk.content));
      streamedText += chunk.content;
    }
    console.log("");
    console.log(chalk.green("  ✓ Streaming works!"));

    // Success summary
    console.log("");
    console.log(chalk.cyan("╔════════════════════════════════════════════════════════════╗"));
    console.log(chalk.cyan("║     CONNECTION TEST PASSED                                 ║"));
    console.log(chalk.cyan("╚════════════════════════════════════════════════════════════╝"));
    console.log("");
    console.log(chalk.green("✓ LM Studio SDK is working correctly"));
    console.log(chalk.gray("  Next steps:"));
    console.log(chalk.white("    1. npm run test:sdk    - Test SDK features"));
    console.log(chalk.white("    2. npm run test:mcp    - Test MCP integration"));
    console.log(chalk.white("    3. npm run init        - Initialize Elaria"));
    console.log("");

  } catch (error) {
    console.log("");
    console.log(chalk.red("╔════════════════════════════════════════════════════════════╗"));
    console.log(chalk.red("║     CONNECTION TEST FAILED                                 ║"));
    console.log(chalk.red("╚════════════════════════════════════════════════════════════╝"));
    console.log("");
    console.log(chalk.red("✗ Error: " + error.message));
    console.log("");
    console.log(chalk.yellow("Troubleshooting:"));
    console.log(chalk.white("  1. Make sure LM Studio is running"));
    console.log(chalk.white("  2. Check that port 1234 is not blocked"));
    console.log(chalk.white("  3. Load a model in LM Studio"));
    console.log(chalk.white("  4. Verify WebSocket connection is allowed"));
    console.log("");
    process.exit(1);
  } finally {
    if (client) {
      // Cleanup connection
      // Note: LMStudioClient doesn't have explicit disconnect in current version
    }
  }
}

// Run test
testConnection().catch(err => {
  console.error(chalk.red("Fatal error:"), err);
  process.exit(1);
});
