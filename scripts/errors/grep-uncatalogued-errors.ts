#!/usr/bin/env tsx
/**
 * CI Gate: Grep for Uncatalogued Errors
 *
 * Scans codebase for getErrorById() calls with unknown error IDs
 * Prevents developers from using ad-hoc error codes
 *
 * Run: npm run errors:grep
 * Exit code: 1 if uncatalogued errors found, 0 if all valid
 */

import fs from "node:fs";
import path from "node:path";
import glob from "fast-glob";
import { loadErrorRegistry } from "../../backend/utils/errors/registry";

interface Offender {
  file: string;
  line: number;
  snippet: string;
  errorId: string;
}

async function main() {
  console.log("🔍 Scanning codebase for uncatalogued error IDs...\n");

  // Load error registry
  const registry = loadErrorRegistry();
  const validIds = new Set(Object.keys(registry));

  console.log(`✅ Loaded ${validIds.size} valid error IDs from registry\n`);

  // Find all TypeScript/TSX files
  const files = await glob(
    ["backend/**/*.ts", "frontend/**/*.ts", "frontend/**/*.tsx"],
    {
      dot: false,
      ignore: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/*.test.ts",
        "**/*.spec.ts",
      ],
    }
  );

  console.log(`📁 Scanning ${files.length} files...\n`);

  const offenders: Offender[] = [];

  // Scan each file for getErrorById() calls
  for (const filePath of files) {
    const fullPath = path.resolve(filePath);
    const content = fs.readFileSync(fullPath, "utf8");
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      // Match getErrorById('ERROR-ID') or getErrorById("ERROR-ID")
      const match = line.match(/getErrorById\(\s*["'`](.+?)["'`]\s*\)/);

      if (match) {
        const errorId = match[1];

        // Check if error ID exists in registry
        if (!validIds.has(errorId)) {
          offenders.push({
            file: filePath,
            line: index + 1,
            snippet: line.trim(),
            errorId: errorId,
          });
        }
      }
    });
  }

  // Report results
  if (offenders.length > 0) {
    console.error("❌ Found uncatalogued error IDs:\n");

    offenders.forEach((offender) => {
      console.error(`  ${offender.file}:${offender.line}`);
      console.error(`    Error ID: ${offender.errorId}`);
      console.error(`    Code: ${offender.snippet}`);
      console.error("");
    });

    console.error(
      `\n❌ ${offenders.length} uncatalogued error ID(s) found. Please add them to config/errors/error-registry.yaml\n`
    );
    process.exit(1);
  } else {
    console.log("✅ All error IDs are registered in the error registry!");
    console.log("✅ No uncatalogued errors found.\n");
    process.exit(0);
  }
}

// Run the scanner
main().catch((error) => {
  console.error("❌ Scanner failed:", error);
  process.exit(1);
});
