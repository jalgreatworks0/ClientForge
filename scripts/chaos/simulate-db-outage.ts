#!/usr/bin/env tsx
/**
 * Chaos Engineering: Simulate Database Outage
 *
 * Stops PostgreSQL container for 60 seconds to trigger DB-001 error
 * Tests error handling, alerting, and automatic recovery
 *
 * **DEV/STAGING ONLY** - DO NOT RUN IN PRODUCTION
 *
 * Run: npm run chaos:db
 */

import { execSync } from "node:child_process";

const OUTAGE_DURATION_MS = 60000; // 60 seconds

console.log("⚠️  CHAOS ENGINEERING: Database Outage Simulation");
console.log("=" .repeat(60));
console.log(`⏰ Duration: ${OUTAGE_DURATION_MS / 1000} seconds`);
console.log(`🎯 Expected Error: DB-001 (PostgresUnavailable)`);
console.log(`📋 Expected Alerts: PagerDuty (critical)`);
console.log("");

// Safety check: Ensure we're not in production
const env = process.env.NODE_ENV || "development";
if (env === "production") {
  console.error("❌ ERROR: Cannot run chaos tests in production!");
  console.error("   Set NODE_ENV=development or NODE_ENV=staging");
  process.exit(1);
}

console.log(`✅ Environment: ${env} (safe to proceed)`);
console.log("");

try {
  // Stop PostgreSQL container
  console.log("🛑 Stopping PostgreSQL container...");
  execSync("docker compose stop postgres", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  console.log("");
  console.log("✅ PostgreSQL stopped successfully");
  console.log("");
  console.log("📊 Now monitoring for:");
  console.log("   1. DB-001 errors in application logs");
  console.log("   2. PagerDuty alerts triggered");
  console.log("   3. Error fingerprints for deduplication");
  console.log("   4. Retry attempts with exponential backoff");
  console.log("");
  console.log(`⏳ Waiting ${OUTAGE_DURATION_MS / 1000} seconds before recovery...`);

  // Wait for outage duration
  setTimeout(() => {
    console.log("");
    console.log("🔄 Restarting PostgreSQL container...");

    try {
      execSync("docker compose start postgres", {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      console.log("");
      console.log("✅ PostgreSQL restarted successfully");
      console.log("");
      console.log("📊 Verify:");
      console.log("   1. Application reconnects to database");
      console.log("   2. DB-001 errors stop appearing");
      console.log("   3. Retry logic succeeded");
      console.log("   4. Services return to healthy state");
      console.log("");
      console.log("🎯 Chaos test completed!");
      console.log("");
      console.log("Next steps:");
      console.log("   - Check MongoDB logs: db.app_logs.find({ 'meta.id': 'DB-001' })");
      console.log("   - Review PagerDuty incident");
      console.log("   - Verify automatic recovery in monitoring");
      console.log("");
    } catch (error) {
      console.error("❌ Failed to restart PostgreSQL:", error);
      process.exit(1);
    }
  }, OUTAGE_DURATION_MS);
} catch (error) {
  console.error("❌ Failed to stop PostgreSQL:", error);
  console.error("");
  console.error("Troubleshooting:");
  console.error("   - Ensure Docker is running");
  console.error("   - Check docker-compose.yml exists");
  console.error("   - Verify postgres service name matches");
  process.exit(1);
}
