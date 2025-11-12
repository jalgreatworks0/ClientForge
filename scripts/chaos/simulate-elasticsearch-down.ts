#!/usr/bin/env tsx
/**
 * Chaos Engineering: Simulate Elasticsearch Outage
 *
 * Stops Elasticsearch container for 60 seconds to trigger ES-003 error
 * Tests search degradation, alerting, and recovery
 *
 * **DEV/STAGING ONLY** - DO NOT RUN IN PRODUCTION
 *
 * Run: npm run chaos:elasticsearch
 */

import { execSync } from "node:child_process";

const OUTAGE_DURATION_MS = 60000; // 60 seconds

console.log("⚠️  CHAOS ENGINEERING: Elasticsearch Outage Simulation");
console.log("=".repeat(60));
console.log(`⏰ Duration: ${OUTAGE_DURATION_MS / 1000} seconds`);
console.log(`🎯 Expected Error: ES-003 (ElasticsearchUnavailable)`);
console.log(`📋 Expected Alerts: PagerDuty (critical)`);
console.log(`🔍 Expected Impact: Search functionality degraded`);
console.log("");

// Safety check
const env = process.env.NODE_ENV || "development";
if (env === "production") {
  console.error("❌ ERROR: Cannot run chaos tests in production!");
  process.exit(1);
}

console.log(`✅ Environment: ${env}`);
console.log("");

try {
  console.log("🛑 Stopping Elasticsearch container...");
  execSync("docker compose stop elasticsearch", {
    stdio: "inherit",
    cwd: process.cwd(),
  });

  console.log("");
  console.log("✅ Elasticsearch stopped");
  console.log("");
  console.log("📊 Expected behavior:");
  console.log("   - Search requests return ES-003");
  console.log("   - Application continues (graceful degradation)");
  console.log("   - Alert routed to PagerDuty");
  console.log("");
  console.log(`⏳ Waiting ${OUTAGE_DURATION_MS / 1000} seconds...`);

  setTimeout(() => {
    console.log("");
    console.log("🔄 Restarting Elasticsearch...");

    try {
      execSync("docker compose start elasticsearch", {
        stdio: "inherit",
        cwd: process.cwd(),
      });

      console.log("");
      console.log("✅ Elasticsearch restarted");
      console.log("");
      console.log("🎯 Chaos test completed!");
    } catch (error) {
      console.error("❌ Failed to restart:", error);
      process.exit(1);
    }
  }, OUTAGE_DURATION_MS);
} catch (error) {
  console.error("❌ Failed:", error);
  process.exit(1);
}
