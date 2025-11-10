/**
 * Test MCP Connection
 * Quick test to verify Elaria can connect to MCP Router
 */

import { MCPOrchestrator } from './src/mcp-integration.js';

async function testMCPConnection() {
  console.log('='.repeat(70));
  console.log('ELARIA ↔ MCP INTEGRATION TEST');
  console.log('='.repeat(70));
  console.log();

  const orchestrator = new MCPOrchestrator();

  // Test 1: Initialize and connect
  console.log('[Test 1] Connecting to MCP Router...');
  const init = await orchestrator.initialize();

  if (!init.success) {
    console.error('❌ Failed to connect to MCP Router');
    console.error('   Error:', init.message || 'Unknown error');
    console.log();
    console.log('💡 Tip: The MCP Router may not be running.');
    console.log('   Start it with: npm run mcp:all (from clientforge-crm root)');
    process.exit(1);
  }

  console.log('✅ Connected to MCP Router');
  console.log(`   Status: ${JSON.stringify(init.orchestrator, null, 2)}`);
  console.log();

  // Test 2: List available agents
  console.log('[Test 2] Listing available MCP agents...');
  const agents = await orchestrator.listAgents();

  if (agents.success) {
    console.log(`✅ Found ${agents.count} agents:`);
    agents.agents?.forEach((agent, i) => {
      console.log(`   ${i + 1}. ${agent.name || agent.id} (${agent.type || 'unknown'})`);
    });
  } else {
    console.log('⚠️  Could not list agents');
    console.log(`   Error: ${agents.error}`);
  }
  console.log();

  // Test 3: Submit a simple test task
  console.log('[Test 3] Submitting test task...');
  const taskResult = await orchestrator.execute(
    'List all files in the current directory',
    {
      kind: 'filesystem',
      priority: 'low',
      inputs: {},
      desired_outputs: ['file_list'],
      policy: {
        safe_write: false,
        max_runtime_s: 30
      }
    }
  );

  if (taskResult.success) {
    console.log('✅ Task completed successfully!');
    console.log(`   Result: ${JSON.stringify(taskResult.result, null, 2)}`);
    console.log(`   Duration: ${taskResult.duration}ms`);
  } else {
    console.log('❌ Task failed');
    console.log(`   Error: ${taskResult.error}`);
  }
  console.log();

  console.log('='.repeat(70));
  console.log('TEST COMPLETE');
  console.log('='.repeat(70));
}

// Run test
testMCPConnection().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
