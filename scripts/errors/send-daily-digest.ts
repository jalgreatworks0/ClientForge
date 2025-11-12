#!/usr/bin/env tsx
/**
 * Send Daily Error Digest
 *
 * Scheduled script to generate and send daily error digest
 * Should be run via cron or scheduled task at 9 AM daily
 *
 * Usage:
 *   npm run errors:digest
 *   tsx scripts/errors/send-daily-digest.ts
 *
 * Schedule with cron:
 *   0 9 * * * cd /path/to/clientforge-crm && npm run errors:digest
 */

import { sendDailyDigest } from "../../backend/utils/errors/alert-router";

async function main() {
  console.log("📧 Generating daily error digest...");

  try {
    await sendDailyDigest();
    console.log("✅ Daily digest sent successfully");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to send daily digest:", error);
    process.exit(1);
  }
}

main();
