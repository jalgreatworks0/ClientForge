#!/usr/bin/env tsx
/**
 * Error Registry Linter
 *
 * Validates error-registry.yaml for:
 * - Format compliance (XXX-### pattern)
 * - No duplicate error IDs
 * - Required fields present
 * - User message keys match frontend messages
 * - Runbook files exist
 *
 * Run: npm run errors:lint
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

interface YAMLErrorDefinition {
  id: string;
  name: string;
  http_status?: number;
  severity?: "minor" | "major" | "critical";
  visibility?: "internal" | "user";
  user_message_key?: string;
  runbook?: string;
  retry?: "none" | "safe" | "idempotent";
  notify?: boolean;
}

interface YAMLGroup {
  description: string;
  product_area: string;
  errors: YAMLErrorDefinition[];
}

interface YAMLRegistry {
  version: number;
  owner: string;
  defaults?: any;
  groups: {
    [groupName: string]: YAMLGroup;
  };
}

let errorCount = 0;
let warningCount = 0;

function error(message: string) {
  console.error(`❌ ERROR: ${message}`);
  errorCount++;
}

function warn(message: string) {
  console.warn(`⚠️  WARNING: ${message}`);
  warningCount++;
}

function info(message: string) {
  console.log(`ℹ️  ${message}`);
}

function lintRegistry() {
  const registryPath = path.resolve(
    process.cwd(),
    "config/errors/error-registry.yaml"
  );

  if (!fs.existsSync(registryPath)) {
    error(`Error registry not found at: ${registryPath}`);
    return;
  }

  info(`Linting: ${registryPath}`);

  const fileContent = fs.readFileSync(registryPath, "utf8");
  const doc = yaml.load(fileContent) as YAMLRegistry;

  // Check required top-level fields
  if (!doc.version) {
    error("Missing required field: version");
  }
  if (!doc.owner) {
    error("Missing required field: owner");
  }
  if (!doc.groups) {
    error("Missing required field: groups");
    return;
  }

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const userMessageKeys = new Set<string>();
  const runbookPaths = new Set<string>();

  // Validate each group
  for (const [groupName, group] of Object.entries(doc.groups || {})) {
    if (!group.description) {
      warn(`Group ${groupName}: Missing description`);
    }
    if (!group.product_area) {
      warn(`Group ${groupName}: Missing product_area`);
    }
    if (!group.errors || group.errors.length === 0) {
      warn(`Group ${groupName}: No errors defined`);
      continue;
    }

    // Validate each error
    for (const errorDef of group.errors) {
      const errorId = errorDef.id;

      // 1. Validate ID format
      if (!/^[A-Z]{2,10}-\d{3}$/.test(errorId)) {
        error(
          `${errorId}: Invalid ID format. Expected XXX-### (e.g., AUTH-001 or QUEUE-001)`
        );
      }

      // 2. Check for duplicate IDs
      if (seenIds.has(errorId)) {
        error(`${errorId}: Duplicate error ID`);
      }
      seenIds.add(errorId);

      // 3. Check for duplicate names
      if (seenNames.has(errorDef.name)) {
        warn(`${errorId}: Duplicate error name: ${errorDef.name}`);
      }
      seenNames.add(errorDef.name);

      // 4. Validate required fields
      if (!errorDef.name) {
        error(`${errorId}: Missing required field: name`);
      }

      // 5. Validate severity
      if (
        errorDef.severity &&
        !["minor", "major", "critical"].includes(errorDef.severity)
      ) {
        error(
          `${errorId}: Invalid severity: ${errorDef.severity}. Must be minor, major, or critical`
        );
      }

      // 6. Validate visibility
      if (
        errorDef.visibility &&
        !["internal", "user"].includes(errorDef.visibility)
      ) {
        error(
          `${errorId}: Invalid visibility: ${errorDef.visibility}. Must be internal or user`
        );
      }

      // 7. Validate retry strategy
      if (
        errorDef.retry &&
        !["none", "safe", "idempotent"].includes(errorDef.retry)
      ) {
        error(
          `${errorId}: Invalid retry: ${errorDef.retry}. Must be none, safe, or idempotent`
        );
      }

      // 8. User-facing errors must have user_message_key
      if (errorDef.visibility === "user" && !errorDef.user_message_key) {
        error(
          `${errorId}: User-facing error must have user_message_key`
        );
      }

      // 9. Collect user message keys for later validation
      if (errorDef.user_message_key) {
        userMessageKeys.add(errorDef.user_message_key);
      }

      // 10. Collect runbook paths for later validation
      if (errorDef.runbook) {
        runbookPaths.add(errorDef.runbook);
      } else {
        warn(`${errorId}: Missing runbook URL`);
      }

      // 11. Critical errors should notify
      if (errorDef.severity === "critical" && !errorDef.notify) {
        warn(`${errorId}: Critical error should have notify: true`);
      }
    }
  }

  // Check frontend messages exist
  const frontendMessagesPath = path.resolve(
    process.cwd(),
    "frontend/src/errors/messages.ts"
  );

  if (fs.existsSync(frontendMessagesPath)) {
    const messagesContent = fs.readFileSync(frontendMessagesPath, "utf8");

    for (const key of userMessageKeys) {
      if (!messagesContent.includes(`"${key}"`)) {
        error(
          `User message key not found in frontend/src/errors/messages.ts: ${key}`
        );
      }
    }
  } else {
    warn("Frontend messages file not found: frontend/src/errors/messages.ts");
  }

  // Check runbook files exist
  for (const runbookUrl of runbookPaths) {
    // Extract path from URL (e.g., /docs/errors/runbooks/auth-001.md)
    const match = runbookUrl.match(/\/docs\/errors\/runbooks\/(.+\.md)/);
    if (match) {
      const runbookPath = path.resolve(
        process.cwd(),
        `docs/errors/runbooks/${match[1]}`
      );
      if (!fs.existsSync(runbookPath)) {
        warn(`Runbook file not found: ${runbookPath}`);
      }
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("LINT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total Errors: ${seenIds.size}`);
  console.log(`Total Groups: ${Object.keys(doc.groups).length}`);
  console.log(`User Message Keys: ${userMessageKeys.size}`);
  console.log(`Runbooks Referenced: ${runbookPaths.size}`);
  console.log("");
  console.log(`❌ Errors: ${errorCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log("");

  if (errorCount === 0 && warningCount === 0) {
    console.log("✅ Error registry is valid!");
    process.exit(0);
  } else if (errorCount === 0) {
    console.log("✅ No errors found (warnings are non-blocking)");
    process.exit(0);
  } else {
    console.log("❌ Please fix the errors above");
    process.exit(1);
  }
}

// Run linter
try {
  lintRegistry();
} catch (error) {
  console.error("❌ Linting failed:", error);
  process.exit(1);
}
