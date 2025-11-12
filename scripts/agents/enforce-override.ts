#!/usr/bin/env tsx
/**
 * Override Gate - Cross-Drive Write Protection
 *
 * Enforces C-G OVERRIDE keyword requirement for writes outside D:\clientforge-crm
 *
 * Usage:
 *   npm run agent:override-check -- "User instruction text" "C:\target\path.txt"
 *   tsx scripts/agents/enforce-override.ts "C-G OVERRIDE create file" "C:\test.txt"
 *
 * Exit Codes:
 *   0 = Approved (write allowed)
 *   1 = Blocked (missing override or invalid path)
 */

import fs from "node:fs";
import path from "node:path";

// Parse command line arguments
const userInput = process.argv[2] || "";
const targetPath = process.argv[3] || "";

// Validation
if (!userInput || !targetPath) {
  console.error("❌ Usage: npm run agent:override-check -- <userInput> <targetPath>");
  console.error("   Example: npm run agent:override-check -- \"C-G OVERRIDE create file\" \"C:\\test.txt\"");
  process.exit(1);
}

// Check for C-G OVERRIDE keyword (case-insensitive)
const hasOverride = /c-g\s+override/i.test(userInput);

// Extract drive letter (e.g., "C:" or "D:")
const normalizedPath = path.normalize(targetPath);
const driveLetter = normalizedPath.slice(0, 2).toUpperCase();

// Check if target is outside D:\clientforge-crm
const isOutsideProject = !normalizedPath.toUpperCase().startsWith("D:\\CLIENTFORGE-CRM");

// System directories that are always blocked (even with override)
const systemDirs = [
  "C:\\WINDOWS",
  "C:\\PROGRAM FILES",
  "C:\\PROGRAM FILES (X86)",
];

const isSystemDir = systemDirs.some((dir) =>
  normalizedPath.toUpperCase().startsWith(dir)
);

// Decision logic
if (isSystemDir) {
  console.error("❌ System directory write blocked: " + targetPath);
  console.error("   Reason: Writes to system directories are prohibited");
  console.error("   Blocked paths: C:\\Windows, C:\\Program Files, C:\\Program Files (x86)");
  process.exit(1);
}

if (isOutsideProject && !hasOverride) {
  console.error("❌ Cross-drive write blocked");
  console.error("   Target: " + targetPath);
  console.error("   Reason: Missing 'C-G OVERRIDE' keyword");
  console.error("");
  console.error("   To proceed, add 'C-G OVERRIDE' to your instruction:");
  console.error("   Example: \"C-G OVERRIDE - Create a file at " + targetPath + "\"");
  console.error("");
  console.error("   This ensures explicit approval for cross-drive writes.");
  process.exit(1);
}

// If we get here, the write is approved
console.log("✅ Cross-drive write approved");
console.log("   Target: " + targetPath);
console.log("   Drive: " + driveLetter);
console.log("   Override: " + (hasOverride ? "YES" : "Not required (within project)"));

// Create parent directory if needed
const parentDir = path.dirname(targetPath);
if (!fs.existsSync(parentDir)) {
  console.log("   Creating parent directory: " + parentDir);
  fs.mkdirSync(parentDir, { recursive: true });
}

process.exit(0);
