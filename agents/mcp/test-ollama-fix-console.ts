/**
 * Test Ollama Integration - Fix Console.log Violations
 *
 * This tests if the local Qwen32B model can actually:
 * 1. Be called via Ollama API
 * 2. Analyze code with console.log violations
 * 3. Suggest fixes to replace with MongoDB logger
 *
 * If your PSU wattage increases, the GPU is working!
 */

import { OllamaClientAdapter } from './client-adapters/ollama-adapter';
import { logger } from '../../backend/utils/logging/logger';

async function testOllamaFixConsole() {
  logger.info('[Test] Starting Ollama integration test...');
  logger.info('[Test] ** WATCH YOUR PSU WATTAGE - IT SHOULD INCREASE **');
  logger.info('');

  try {
    // Connect to Qwen32B (most powerful local model)
    const agent = new OllamaClientAdapter({
      agent_id: 'agent-1-qwen32b',
      model: 'qwen2.5-coder:32b-instruct-q5_K_M',
      host: 'localhost:11434',
      capabilities: ['code_generation', 'multi_database_sync', 'type_safety'],
      mcp_router_url: 'ws://localhost:8765'
    });

    await agent.connect();
    logger.info('[Test] Connected to Qwen32B');

    // Wait for connection
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Give it a real code sample with console.log violations
    const codeSample = `
/**
 * MongoDB Configuration
 */
export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(mongodbConfig.uri, mongodbConfig.options)

    try {
      await client.connect()
      console.log('✅ MongoDB connected')

      client.on('error', (error) => {
        console.error('❌ MongoDB connection error:', error)
      })

      client.on('reconnect', () => {
        console.log('✅ MongoDB reconnected')
      })
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error)
      throw error
    }
  }

  return client
}
`;

    logger.info('[Test] Asking Qwen32B to fix console.log violations...');
    logger.info('[Test] This will load the GPU - check your PSU wattage!');
    logger.info('');

    const startTime = Date.now();

    const response = await agent.askQuestion(
      'all',
      `You are a code refactoring expert. Analyze this TypeScript code and replace ALL console.log/error statements with MongoDB logger calls.

RULES:
1. Import logger from the correct path: import { logger } from '../../backend/utils/logging/logger'
2. Replace console.log() with logger.info()
3. Replace console.error() with logger.error()
4. Include context objects for structured logging
5. Return ONLY the fixed code, no explanations

CODE TO FIX:
${codeSample}

FIXED CODE:`,
      {
        task: 'fix_console_violations',
        language: 'typescript',
        file_type: 'database_config'
      },
      'high'
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    logger.info('');
    logger.info('[Test] ============================================');
    logger.info('[Test] OLLAMA RESPONSE RECEIVED');
    logger.info('[Test] ============================================');
    logger.info(`[Test] Duration: ${duration} seconds`);
    logger.info(`[Test] Response length: ${response.length} characters`);
    logger.info('');
    logger.info('[Test] Response:');
    logger.info('');
    logger.info(response.substring(0, 1000)); // Show first 1000 chars
    logger.info('');
    logger.info('[Test] ============================================');
    logger.info('[Test] GPU TEST COMPLETE');
    logger.info('[Test] If you saw PSU wattage increase, GPU is working!');
    logger.info('[Test] ============================================');

    agent.disconnect();

  } catch (error) {
    logger.error('[Test] Test failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}

// Run test
testOllamaFixConsole()
  .then(() => {
    logger.info('[Test] Test completed');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('[Test] Test failed fatally', { error });
    process.exit(1);
  });
