#!/usr/bin/env tsx
/**
 * Error Type Generator
 *
 * Generates TypeScript type definitions from error-registry.yaml
 * Run: npm run errors:gen
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

function generateTypes() {
  const registryPath = path.resolve(
    process.cwd(),
    "config/errors/error-registry.yaml"
  );

  if (!fs.existsSync(registryPath)) {
    console.error(`❌ Error registry not found at: ${registryPath}`);
    process.exit(1);
  }

  const fileContent = fs.readFileSync(registryPath, "utf8");
  const doc = yaml.load(fileContent) as YAMLRegistry;

  // Collect all error IDs
  const errorIds: string[] = [];
  const errorNames: string[] = [];
  const userMessageKeys: string[] = [];

  for (const [groupName, group] of Object.entries(doc.groups || {})) {
    if (!group.errors) continue;

    for (const errorDef of group.errors) {
      errorIds.push(errorDef.id);
      errorNames.push(errorDef.name);
      if (errorDef.user_message_key) {
        userMessageKeys.push(errorDef.user_message_key);
      }
    }
  }

  // Generate TypeScript types
  const output = `/**
 * Auto-generated Error Types
 * DO NOT EDIT MANUALLY
 * Generated from: config/errors/error-registry.yaml
 * Generated at: ${new Date().toISOString()}
 */

/**
 * All registered error IDs
 */
export type ErrorId =
${errorIds.map((id) => `  | "${id}"`).join("\n")};

/**
 * All registered error names
 */
export type ErrorName =
${errorNames.map((name) => `  | "${name}"`).join("\n")};

/**
 * All user message keys
 */
export type UserMessageKey =
${userMessageKeys.length > 0 ? userMessageKeys.map((key) => `  | "${key}"`).join("\n") : '  | string'};

/**
 * Error registry metadata
 */
export const ERROR_REGISTRY_META = {
  version: ${doc.version},
  owner: "${doc.owner}",
  totalErrors: ${errorIds.length},
  errorIds: ${JSON.stringify(errorIds, null, 2)},
  errorNames: ${JSON.stringify(errorNames, null, 2)},
  userMessageKeys: ${JSON.stringify(userMessageKeys, null, 2)},
} as const;
`;

  const outputPath = path.resolve(
    process.cwd(),
    "backend/utils/errors/generated-types.ts"
  );

  fs.writeFileSync(outputPath, output, "utf8");

  console.log(`✅ Generated error types: ${outputPath}`);
  console.log(`   - ${errorIds.length} error IDs`);
  console.log(`   - ${errorNames.length} error names`);
  console.log(`   - ${userMessageKeys.length} user message keys`);
}

// Run generator
try {
  generateTypes();
} catch (error) {
  console.error("❌ Error generation failed:", error);
  process.exit(1);
}
