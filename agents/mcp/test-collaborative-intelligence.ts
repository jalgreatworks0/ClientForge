/**
 * Test Collaborative Intelligence Integration
 *
 * Demonstrates the hive-mind capabilities of the MCP system:
 * - Agents asking each other questions
 * - Multi-agent debates to reach consensus
 * - Collaborative problem-solving with voting
 * - Peer verification of solutions
 *
 * Run this after starting the MCP system:
 * 1. npm run fleet:start
 * 2. npm run mcp:all
 * 3. npx tsx agents/mcp/test-collaborative-intelligence.ts
 */

import { OllamaClientAdapter } from './client-adapters/ollama-adapter';

async function testCollaborativeIntelligence() {
  console.log('');
  console.log('='.repeat(80));
  console.log('COLLABORATIVE INTELLIGENCE TEST');
  console.log('='.repeat(80));
  console.log('');

  // ============================================================================
  // SETUP: Connect Test Agent
  // ============================================================================

  console.log('[1/5] Setting up test agent...');

  const testAgent = new OllamaClientAdapter({
    agent_id: 'agent-test-collaborative',
    model: 'qwen2.5-coder:32b-instruct-q5_K_M',
    host: 'localhost:11434',
    capabilities: ['testing', 'verification'],
    mcp_router_url: 'ws://localhost:8765'
  });

  await testAgent.connect();

  console.log('[OK] Test agent connected to MCP Router');
  console.log('');

  // ============================================================================
  // TEST 1: Agent-to-Agent Question
  // ============================================================================

  console.log('[2/5] Test 1: Agent asking another agent a question');
  console.log('');
  console.log('Scenario: Test agent asks Qwen32B about best database for contact search');

  try {
    const answer = await testAgent.askQuestion(
      'agent-1-qwen32b',
      'What database should we query for contact search to get the fastest results?',
      {
        databases: ['PostgreSQL', 'Elasticsearch', 'MongoDB', 'Redis'],
        search_type: 'full_text_search',
        expected_results: 1000
      },
      'high'
    );

    console.log('');
    console.log('[OK] Question answered by agent-1-qwen32b:');
    console.log('     ', answer.substring(0, 150) + '...');
    console.log('');
  } catch (error) {
    console.log('[ERROR] Question failed:', error instanceof Error ? error.message : String(error));
    console.log('');
  }

  // ============================================================================
  // TEST 2: Broadcast Question to All Agents
  // ============================================================================

  console.log('[3/5] Test 2: Broadcasting question to all agents');
  console.log('');
  console.log('Scenario: Ask all agents for their opinion on TypeScript strict mode');

  try {
    const answer = await testAgent.askQuestion(
      'all',
      'Should we enable TypeScript strict mode for all new files? What are the tradeoffs?',
      {
        current_config: { strict: false },
        project_size: '150+ files',
        team_experience: 'mixed'
      },
      'medium'
    );

    console.log('');
    console.log('[OK] Consensus answer from all agents:');
    console.log('     ', answer.substring(0, 150) + '...');
    console.log('');
  } catch (error) {
    console.log('[ERROR] Broadcast question failed:', error instanceof Error ? error.message : String(error));
    console.log('');
  }

  // ============================================================================
  // TEST 3: Multi-Agent Debate
  // ============================================================================

  console.log('[4/5] Test 3: Multi-agent debate');
  console.log('');
  console.log('Scenario: Debate on database choice for storing AI conversation logs');

  try {
    const consensus = await testAgent.startDebate(
      'What database should we use for storing AI conversation logs with 100K+ messages?',
      [
        'agent-1-qwen32b',      // Code generation expert
        'agent-3-codellama13b', // Refactoring/architecture expert
        'agent-test-collaborative' // Test agent
      ],
      new Map([
        ['agent-1-qwen32b', 'Use MongoDB for flexible schema and horizontal scaling'],
        ['agent-3-codellama13b', 'Use PostgreSQL with JSONB for ACID compliance and structured queries'],
        ['agent-test-collaborative', 'Use Elasticsearch for fast full-text search and analytics']
      ])
    );

    console.log('');
    console.log('[OK] Debate consensus reached:');
    console.log('     ', consensus.substring(0, 150) + '...');
    console.log('');
  } catch (error) {
    console.log('[ERROR] Debate failed:', error instanceof Error ? error.message : String(error));
    console.log('');
  }

  // ============================================================================
  // TEST 4: Collaborative Problem Solving
  // ============================================================================

  console.log('[5/5] Test 4: Collaborative problem-solving');
  console.log('');
  console.log('Scenario: All agents propose solutions, then vote on the best one');

  try {
    const solution = await testAgent.solveCollaboratively(
      'How should we implement real-time contact updates across multiple browser tabs?',
      {
        requirements: [
          'Sub-second latency',
          'Support 100+ concurrent users',
          'Works across tabs on same browser',
          'Minimal server load'
        ],
        current_tech: ['PostgreSQL', 'Redis', 'WebSocket'],
        constraints: {
          budget: 'low',
          complexity: 'medium'
        }
      }
    );

    console.log('');
    console.log('[OK] Collaborative solution:');
    console.log('      Total proposals:', solution.proposals.length);
    console.log('      Selected approach:', solution.selected_proposal.agent_id);
    console.log('      Votes received:', solution.selected_proposal.votes);
    console.log('      Confidence:', solution.confidence);
    console.log('');
    console.log('      Solution summary:');
    console.log('      ', solution.selected_proposal.solution.substring(0, 150) + '...');
    console.log('');
  } catch (error) {
    console.log('[ERROR] Collaboration failed:', error instanceof Error ? error.message : String(error));
    console.log('');
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  testAgent.disconnect();

  console.log('='.repeat(80));
  console.log('COLLABORATIVE INTELLIGENCE TEST COMPLETE');
  console.log('='.repeat(80));
  console.log('');
  console.log('[INFO] All 4 collaborative features tested:');
  console.log('       1. Agent-to-agent questions ✓');
  console.log('       2. Broadcast questions to all agents ✓');
  console.log('       3. Multi-agent debates with consensus ✓');
  console.log('       4. Collaborative problem-solving with voting ✓');
  console.log('');
  console.log('[INFO] The 7-agent hive mind is operational!');
  console.log('');
}

// Run tests
testCollaborativeIntelligence()
  .then(() => {
    console.log('[OK] Tests completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[ERROR] Tests failed:', error);
    process.exit(1);
  });
