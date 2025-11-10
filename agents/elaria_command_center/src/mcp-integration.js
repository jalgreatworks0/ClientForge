/**
 * MCP Integration for Elaria Command Center
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\mcp-integration.js
 * Purpose: Connect LM Studio Elaria bot to ClientForge MCP orchestrator
 */

import { LMStudioClient } from '@lmstudio/sdk';
import { spawn } from 'child_process';
import { EventEmitter } from 'events';

/**
 * MCP Orchestrator Client for Elaria
 * Connects Elaria to the ClientForge MCP server infrastructure
 */
export class MCPOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();

    this.baseUrl = config.baseUrl || 'http://127.0.0.1:8765';
    this.lmStudioClient = new LMStudioClient({ baseUrl: config.lmStudioUrl || 'ws://localhost:1234' });
    this.modelName = config.modelName || 'qwen3-30b-a3b';

    this.mcpServers = new Map();
    this.activeTasks = new Map();
  }

  /**
   * Initialize MCP connection and list available servers
   */
  async initialize() {
    console.log('[MCP] Initializing Elaria-MCP integration...');

    try {
      // Connect to orchestrator
      const response = await fetch(`${this.baseUrl}/status`);
      if (!response.ok) {
        throw new Error('Orchestrator not available');
      }

      const status = await response.json();
      console.log('[MCP] ✅ Connected to orchestrator');
      console.log(`[MCP] Available agents: ${status.agents?.length || 0}`);

      return {
        success: true,
        orchestrator: status,
      };
    } catch (error) {
      console.error('[MCP] ❌ Orchestrator connection failed:', error.message);
      console.log('[MCP] Attempting to start orchestrator...');

      return this.startOrchestrator();
    }
  }

  /**
   * Start the MCP orchestrator server
   */
  async startOrchestrator() {
    return new Promise((resolve, reject) => {
      console.log('[MCP] Starting orchestrator server...');

      // Use npm script to start MCP server (uses tsx for TypeScript)
      const process = spawn('npm', ['run', 'mcp:start'], {
        cwd: 'D:\\clientforge-crm',
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: true,
        shell: true,
      });

      let started = false;

      process.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[MCP Orchestrator]', output);

        if (output.includes('listening') || output.includes('started')) {
          started = true;
          resolve({
            success: true,
            message: 'Orchestrator started successfully',
            pid: process.pid,
          });
        }
      });

      process.stderr.on('data', (data) => {
        console.error('[MCP Orchestrator Error]', data.toString());
      });

      process.on('error', (error) => {
        reject(error);
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (!started) {
          reject(new Error('Orchestrator startup timeout'));
        }
      }, 10000);

      process.unref();
    });
  }

  /**
   * List all available MCP agents/servers
   */
  async listAgents() {
    try {
      const response = await fetch(`${this.baseUrl}/bots`);
      const data = await response.json();

      return {
        success: true,
        agents: data.bots || data.agents || [],
        count: data.bots?.length || data.agents?.length || 0,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Submit a task to the MCP orchestrator
   * Uses Elaria's LM Studio intelligence to route and execute
   */
  async submitTask(taskSpec) {
    try {
      console.log(`[MCP] Submitting task: ${taskSpec.kind}`);

      // First, use Elaria's intelligence to understand the task
      const model = await this.lmStudioClient.llm.get({ identifier: this.modelName });

      const analysisPrompt = `You are Elaria, the ClientForge command center AI. Analyze this task and determine the best agent(s) to handle it.

Task Spec:
${JSON.stringify(taskSpec, null, 2)}

Available MCP Agents:
1. filesystem - File operations (read, write, search, navigate)
2. database - Multi-database operations (PostgreSQL, MongoDB, Elasticsearch, Redis)
3. codebase - Code analysis (definitions, references, dependencies, call graph)
4. testing - Test execution (run tests, coverage, generate tests)
5. git - Version control (status, commit, diff, branch)
6. documentation - Documentation (generate, update, cross-reference)
7. build - Build & CI/CD (lint, type-check, build, deploy)
8. rag - Semantic search (query docs, reindex, context)
9. security - Security analysis (OWASP, dependency audit, secret scan)
10. logger - Structured logging (query logs, error analysis)

Return a JSON object with:
{
  "selectedAgents": ["agent1", "agent2"],
  "reasoning": "why these agents",
  "executionPlan": ["step 1", "step 2"],
  "estimatedDuration": "2 minutes"
}`;

      const analysis = await model.respond(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 1024,
      });

      let agentPlan;
      try {
        // Extract JSON from response
        const jsonMatch = analysis.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          agentPlan = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (e) {
        // Fallback to basic routing
        agentPlan = {
          selectedAgents: ['filesystem'],
          reasoning: 'Default filesystem agent',
          executionPlan: ['Execute task'],
          estimatedDuration: 'unknown',
        };
      }

      console.log('[MCP] Agent routing plan:', agentPlan);

      // Submit to orchestrator
      const response = await fetch(`${this.baseUrl}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskSpec,
          meta: {
            ...taskSpec.meta,
            routedBy: 'elaria',
            agentPlan,
          },
        }),
      });

      const result = await response.json();

      if (result.task_id) {
        this.activeTasks.set(result.task_id, {
          spec: taskSpec,
          plan: agentPlan,
          startTime: Date.now(),
        });

        this.emit('taskSubmitted', {
          taskId: result.task_id,
          agents: agentPlan.selectedAgents,
        });
      }

      return {
        success: true,
        taskId: result.task_id,
        plan: agentPlan,
      };
    } catch (error) {
      console.error('[MCP] Task submission failed:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get task status and results
   */
  async getTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/task/${taskId}`);
      const result = await response.json();

      if (result.status === 'completed') {
        this.emit('taskCompleted', {
          taskId,
          result,
        });
      }

      return {
        success: true,
        task: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Cancel a running task
   */
  async cancelTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/cancel/${taskId}`, {
        method: 'POST',
      });

      const result = await response.json();

      this.activeTasks.delete(taskId);

      this.emit('taskCancelled', { taskId });

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Execute a task through MCP and wait for completion
   * This is the main method Elaria will use
   */
  async execute(objective, taskSpec = {}) {
    const task = {
      task_id: null,
      kind: taskSpec.kind || 'custom',
      priority: taskSpec.priority || 'normal',
      instructions: objective,
      inputs: taskSpec.inputs || {},
      desired_outputs: taskSpec.desired_outputs || ['summary', 'artifacts'],
      policy: {
        safe_write: true,
        max_runtime_s: 900,
        ...taskSpec.policy,
      },
    };

    // Submit task
    const submission = await this.submitTask(task);

    if (!submission.success) {
      return {
        success: false,
        error: submission.error,
      };
    }

    const taskId = submission.taskId;

    console.log(`[MCP] Task ${taskId} submitted, waiting for completion...`);

    // Poll for completion
    const maxAttempts = 60; // 5 minutes max
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollInterval));

      const status = await this.getTask(taskId);

      if (status.success && status.task) {
        const taskStatus = status.task.status;

        if (taskStatus === 'completed') {
          console.log(`[MCP] ✅ Task ${taskId} completed successfully`);
          return {
            success: true,
            result: status.task.result,
            duration: status.task.duration,
          };
        } else if (taskStatus === 'failed') {
          console.error(`[MCP] ❌ Task ${taskId} failed:`, status.task.error);
          return {
            success: false,
            error: status.task.error,
          };
        }

        // Still running, continue polling
        console.log(`[MCP] Task ${taskId} status: ${taskStatus} (${attempt + 1}/${maxAttempts})`);
      }
    }

    // Timeout
    console.warn(`[MCP] ⚠️  Task ${taskId} timeout after ${maxAttempts * pollInterval / 1000}s`);
    return {
      success: false,
      error: 'Task execution timeout',
    };
  }

  /**
   * High-level convenience methods
   */

  async analyzeCode(filePath) {
    return this.execute(`Analyze code in ${filePath} for quality, security, and maintainability`, {
      kind: 'code_analysis',
      inputs: { file_path: filePath },
      desired_outputs: ['analysis', 'recommendations', 'metrics'],
    });
  }

  async runTests(testPath = null) {
    return this.execute(`Run tests${testPath ? ` in ${testPath}` : ''}`, {
      kind: 'test',
      inputs: testPath ? { test_path: testPath } : {},
      desired_outputs: ['results', 'coverage', 'summary'],
    });
  }

  async generateDocs(scope = 'all') {
    return this.execute(`Generate documentation for ${scope}`, {
      kind: 'documentation',
      inputs: { scope },
      desired_outputs: ['updated_files', 'summary'],
    });
  }

  async buildProject() {
    return this.execute('Build the entire project with lint, typecheck, and compilation', {
      kind: 'build',
      inputs: {},
      desired_outputs: ['build_artifacts', 'metrics', 'warnings'],
    });
  }

  async securityAudit() {
    return this.execute('Run comprehensive security audit', {
      kind: 'security',
      inputs: {},
      desired_outputs: ['vulnerabilities', 'owasp_score', 'recommendations'],
    });
  }

  async semanticSearch(query) {
    return this.execute(`Search documentation for: ${query}`, {
      kind: 'rag',
      inputs: { query },
      desired_outputs: ['results', 'context'],
    });
  }
}

// Usage example
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('Starting Elaria MCP Integration Demo...\n');

    const orchestrator = new MCPOrchestrator();

    // Initialize
    const init = await orchestrator.initialize();
    if (!init.success) {
      console.error('Failed to initialize MCP orchestrator');
      process.exit(1);
    }

    // List available agents
    const agents = await orchestrator.listAgents();
    console.log('\n✅ Available MCP Agents:');
    agents.agents?.forEach((agent, i) => {
      console.log(`   ${i + 1}. ${agent.name || agent.id}`);
    });

    // Example: Run tests
    console.log('\n📋 Example: Running tests...');
    const testResult = await orchestrator.runTests();
    console.log('Test result:', testResult);

    console.log('\n✅ MCP Integration Demo Complete!');
  })();
}
