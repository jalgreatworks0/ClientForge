/**
 * Elaria Configuration
 * Location: D:\ClientForge\03_BOTS\elaria_command_center\src\config.js
 * Purpose: Centralized configuration for Elaria Command Center
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env if exists
const envPath = join(__dirname, "..", ".env");
if (existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * Configuration object with environment variable support
 */
export const CONFIG = {
  lmStudio: {
    baseUrl: process.env.LM_STUDIO_BASE_URL || "ws://localhost:1234",
    // Use qwen3-30b-a3b which is available in LM Studio
    model: process.env.LM_STUDIO_MODEL || "qwen3-30b-a3b",
    // Draft model for speculative decoding (LM Studio 0.3.10+)
    draftModel: process.env.LM_STUDIO_DRAFT_MODEL || "qwen2.5-14b-instruct-uncensored",
    timeout: parseInt(process.env.LM_STUDIO_TIMEOUT) || 300000,
    config: {
      contextLength: 32768,
      gpuLayers: 40,
      temperature: 0.3,
      topP: 0.9,
      topK: 40,
      repeatPenalty: 1.1,
      // Idle TTL in seconds (LM Studio 0.3.9+)
      ttl: parseInt(process.env.LM_STUDIO_TTL) || 600 // 10 minutes default
    },
    // Advanced features (LM Studio 0.3.29+)
    features: {
      responsesAPI: true, // Use /v1/responses endpoint
      statefulConversations: true, // Use previous_response_id
      reasoningEffort: process.env.ELARIA_REASONING_EFFORT || "medium",
      autoEvict: true, // Auto-evict previous JIT models
      speculativeDecoding: false, // Enable if draft model available
      toolChoice: "auto" // auto, none, required
    }
  },

  clientforge: {
    root: process.env.CLIENTFORGE_ROOT || "D:\\ClientForge",
    code: process.env.CLIENTFORGE_CODE || "D:\\ClientForge\\02_CODE",
    staging: process.env.CLIENTFORGE_STAGING || "D:\\ClientForge\\_staging",
    backups: process.env.CLIENTFORGE_BACKUPS || "D:\\ClientForge\\06_BACKUPS",
    sharedAI: process.env.CLIENTFORGE_SHARED_AI || "D:\\ClientForge\\05_SHARED_AI",

    // Priority context files (in order)
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
    baseUrl: process.env.ORCHESTRATOR_URL || "http://127.0.0.1:8979",
    enabled: process.env.ORCHESTRATOR_ENABLED !== "false",
    timeout: parseInt(process.env.ORCHESTRATOR_TIMEOUT) || 30000
  },

  rag: {
    baseUrl: process.env.RAG_URL || "http://127.0.0.1:8920",
    enabled: process.env.RAG_ENABLED !== "false",
    topK: parseInt(process.env.RAG_TOP_K) || 12
  },

  mcp: {
    filesystemRoot: process.env.MCP_FILESYSTEM_ROOT || "D:\\ClientForge",
    processAllowedExtensions: (process.env.MCP_PROCESS_ALLOWED_EXTENSIONS || ".ps1,.sh,.py").split(","),
    httpAllowedHosts: (process.env.MCP_HTTP_ALLOWED_HOSTS || "127.0.0.1,localhost,render.com,notion.so,discord.com").split(",")
  },

  elaria: {
    reasoningEffort: process.env.ELARIA_REASONING_EFFORT || "medium",
    autoBackup: process.env.ELARIA_AUTO_BACKUP !== "false",
    safeWrite: process.env.ELARIA_SAFE_WRITE !== "false",
    maxRuntime: parseInt(process.env.ELARIA_MAX_RUNTIME) || 900,
    verbose: process.env.ELARIA_VERBOSE !== "false"
  },

  safety: {
    requireStaging: process.env.REQUIRE_STAGING !== "false",
    requireTests: process.env.REQUIRE_TESTS !== "false",
    requireBackup: process.env.REQUIRE_BACKUP !== "false",
    neverSkipValidation: process.env.NEVER_SKIP_VALIDATION !== "false"
  },

  performance: {
    apiP50Ms: parseInt(process.env.PERF_API_P50_MS) || 200,
    fcpS: parseFloat(process.env.PERF_FCP_S) || 1.5,
    bundleKb: parseInt(process.env.PERF_BUNDLE_KB) || 200
  },

  coverage: {
    general: parseInt(process.env.COVERAGE_GENERAL) || 85,
    auth: parseInt(process.env.COVERAGE_AUTH) || 95,
    payment: parseInt(process.env.COVERAGE_PAYMENT) || 95
  },

  logging: {
    level: process.env.LOG_LEVEL || "info",
    dir: process.env.LOG_DIR || "D:\\ClientForge\\05_SHARED_AI\\build_logs",
    sessionLogEnabled: process.env.SESSION_LOG_ENABLED !== "false"
  }
};

/**
 * Validate configuration
 */
export function validateConfig() {
  const errors = [];

  // Check required paths exist
  if (!existsSync(CONFIG.clientforge.root)) {
    errors.push(`ClientForge root not found: ${CONFIG.clientforge.root}`);
  }

  // Check LM Studio connection
  try {
    // Will be checked at runtime
  } catch (err) {
    errors.push(`LM Studio configuration error: ${err.message}`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get available model names (detected from LM Studio)
 */
export function getAvailableModels() {
  // This will be populated at runtime by connecting to LM Studio
  return [
    "qwen3-30b-a3b",
    "qwen3-42b-a3b-2507-thinking-abliterated-uncensored-total-recall-v2-medium-master-coder-i1",
    "openai/gpt-oss-20b",
    "openai/gpt-oss-20b@mxfp4",
    "openai-gpt-oss-20b-abliterated-uncensored-neo-imatrix"
  ];
}

/**
 * Print configuration summary
 */
export function printConfigSummary() {
  console.log("Configuration Summary:");
  console.log(`  LM Studio: ${CONFIG.lmStudio.baseUrl}`);
  console.log(`  Model: ${CONFIG.lmStudio.model}`);
  console.log(`  ClientForge Root: ${CONFIG.clientforge.root}`);
  console.log(`  Staging: ${CONFIG.clientforge.staging}`);
  console.log(`  Orchestrator: ${CONFIG.orchestrator.enabled ? CONFIG.orchestrator.baseUrl : "Disabled"}`);
  console.log(`  RAG: ${CONFIG.rag.enabled ? CONFIG.rag.baseUrl : "Disabled"}`);
  console.log(`  Safety Checks: ${CONFIG.safety.requireTests ? "Enabled" : "Disabled"}`);
}

export default CONFIG;
