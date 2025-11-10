/**
 * MCP Integration for Elaria Command Center (WebSocket Version)
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\mcp-integration-ws.js
 * Purpose: Connect LM Studio Elaria bot to ClientForge MCP orchestrator via WebSocket
 */

import { LMStudioClient } from '@lmstudio/sdk';
import WebSocket from 'ws';
import { EventEmitter } from 'events';

/**
 * MCP Orchestrator Client for Elaria (WebSocket-based)
 * Connects Elaria to the ClientForge MCP WebSocket server
 */
export class MCPOrchestrator extends EventEmitter {
  constructor(config = {}) {
    super();

    this.wsUrl = config.wsUrl || 'ws://localhost:8765';
    this.lmStudioClient = new LMStudioClient({ baseUrl: config.lmStudioUrl || 'ws://localhost:1234' });
    this.modelName = config.modelName || 'qwen3-30b-a3b';

    this.ws = null;
    this.connected = false;
    this.agentId = 'agent-elaria';
    this.activeTasks = new Map();
    this.messageHandlers = new Map();

    // Reconnection settings
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = config.maxReconnectAttempts || 10;
    this.reconnectDelay = config.initialReconnectDelay || 1000;
    this.maxReconnectDelay = config.maxReconnectDelay || 30000;
    this.reconnectTimer = null;
    this.shouldReconnect = true;
  }

  /**
   * Initialize MCP connection via WebSocket
   */
  async initialize() {
    console.log('[MCP] Initializing Elaria-MCP WebSocket integration...');

    return new Promise((resolve, reject) => {
      try {
        // Connect to WebSocket server
        this.ws = new WebSocket(this.wsUrl);

        this.ws.on('open', () => {
          console.log('[MCP] ✅ Connected to MCP Router via WebSocket');
          this.connected = true;

          // Register Elaria as an agent
          this.sendMessage({
            type: 'agent_register',
            agent_id: this.agentId,
            agent_name: 'Elaria (LM Studio)',
            capabilities: ['lm_studio_integration', 'vision', 'embeddings', 'rag'],
            model: this.modelName
          });

          resolve({
            success: true,
            message: 'Connected to MCP Router',
            wsUrl: this.wsUrl
          });
        });

        this.ws.on('message', (data) => {
          this.handleMessage(data);
        });

        this.ws.on('error', (error) => {
          console.error('[MCP] WebSocket error:', error.message);
          this.connected = false;

          if (!this.connected) {
            reject(new Error(`Failed to connect to MCP Router at ${this.wsUrl}`));
          }
        });

        this.ws.on('close', () => {
          console.log('[MCP] WebSocket connection closed');
          this.connected = false;
          this.emit('disconnected');

          // Attempt reconnection
          if (this.shouldReconnect) {
            this.scheduleReconnect();
          }
        });

        // Timeout after 5 seconds
        setTimeout(() => {
          if (!this.connected) {
            reject(new Error('Connection timeout'));
          }
        }, 5000);

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Send message to MCP Router
   */
  sendMessage(message) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected');
    }

    this.ws.send(JSON.stringify(message));
  }

  /**
   * Handle incoming messages from MCP Router
   */
  handleMessage(data) {
    try {
      const message = JSON.parse(data.toString());

      console.log(`[MCP] Received: ${message.type}`);

      switch (message.type) {
        case 'pong':
          // Heartbeat response
          break;

        case 'context_sync':
          // File modification sync
          this.emit('context_sync', message.files_modified);
          break;

        case 'question_answer':
          this.emit('question_answer', message);
          break;

        case 'task_completed':
          if (message.task_id && this.activeTasks.has(message.task_id)) {
            const resolve = this.activeTasks.get(message.task_id);
            resolve(message.result);
            this.activeTasks.delete(message.task_id);
          }
          break;

        case 'error':
          console.error('[MCP] Error from server:', message.message);
          this.emit('error', message);
          break;

        default:
          console.warn('[MCP] Unknown message type:', message.type);
      }

      // Call registered handler if exists
      if (this.messageHandlers.has(message.type)) {
        const handler = this.messageHandlers.get(message.type);
        handler(message);
      }

    } catch (error) {
      console.error('[MCP] Failed to parse message:', error);
    }
  }

  /**
   * Register a message handler
   */
  onMessage(messageType, handler) {
    this.messageHandlers.set(messageType, handler);
  }

  /**
   * Submit a task through MCP Router using Elaria's intelligence
   */
  async submitTask(objective, taskSpec = {}) {
    try {
      console.log(`[MCP] Using Elaria to analyze task: ${objective}`);

      // Use Elaria's intelligence to understand the task
      const model = await this.lmStudioClient.llm.get({ identifier: this.modelName });

      const analysisPrompt = `You are Elaria, the ClientForge command center AI. Analyze this task and determine the best approach.

Task: ${objective}

Available MCP Agents:
1. agent-0-claude-code (Orchestrator) - User interface, task routing, context management
2. agent-5-claude-planner (API) - Planning, system design, complex reasoning
3. agent-6-gpt-reviewer (API) - Code review, security, OWASP audits

Return a JSON object with:
{
  "selectedAgent": "agent-id",
  "reasoning": "why this agent",
  "executionPlan": ["step 1", "step 2"],
  "estimatedDuration": "X minutes"
}`;

      const analysis = await model.respond(analysisPrompt, {
        temperature: 0.2,
        maxTokens: 1024,
      });

      let agentPlan;
      try {
        const jsonMatch = analysis.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          agentPlan = JSON.parse(jsonMatch[0]);
        } else {
          agentPlan = {
            selectedAgent: 'agent-0-claude-code',
            reasoning: 'Default to orchestrator',
            executionPlan: ['Execute task'],
            estimatedDuration: 'unknown'
          };
        }
      } catch (e) {
        agentPlan = {
          selectedAgent: 'agent-0-claude-code',
          reasoning: 'Fallback routing',
          executionPlan: ['Execute task'],
          estimatedDuration: 'unknown'
        };
      }

      console.log('[MCP] Agent routing plan:', agentPlan);

      // Generate task ID
      const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      // Create task promise that will resolve when task completes
      const taskPromise = new Promise((resolve) => {
        this.activeTasks.set(taskId, resolve);
      });

      // Send task to MCP Router
      // Note: The MCP Router doesn't have a built-in task submission protocol yet
      // For now, we'll use the routeTask method directly
      console.log('[MCP] Task would be routed to:', agentPlan.selectedAgent);
      console.log('[MCP] Note: Direct task submission via WebSocket not yet implemented');
      console.log('[MCP] Elaria can route tasks but needs MCP Router REST API');

      return {
        success: true,
        taskId,
        plan: agentPlan,
        note: 'WebSocket connection established, but MCP Router needs REST API for task submission'
      };

    } catch (error) {
      console.error('[MCP] Task submission failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Ask a question to another agent via Collaborative Intelligence
   */
  async askQuestion(toAgentId, question, context = {}, priority = 'medium') {
    return new Promise((resolve, reject) => {
      const questionId = `question-${Date.now()}`;

      // Register one-time handler for the answer
      this.onMessage('question_answer', (message) => {
        if (message.question_id === questionId) {
          resolve(message.answer);
        }
      });

      // Send question
      this.sendMessage({
        type: 'ask_question',
        question_id: questionId,
        from_agent_id: this.agentId,
        to_agent_id: toAgentId,
        question,
        context,
        priority
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        reject(new Error('Question timeout'));
      }, 30000);
    });
  }

  /**
   * Send ping to keep connection alive
   */
  ping() {
    if (this.connected) {
      this.sendMessage({ type: 'ping' });
    }
  }

  /**
   * Start heartbeat
   */
  startHeartbeat(intervalMs = 30000) {
    setInterval(() => {
      this.ping();
    }, intervalMs);
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  scheduleReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error(`[MCP] Max reconnection attempts (${this.maxReconnectAttempts}) reached. Giving up.`);
      this.emit('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;

    // Calculate exponential backoff delay
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    console.log(`[MCP] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  /**
   * Attempt to reconnect to MCP Router
   */
  async reconnect() {
    console.log('[MCP] Attempting to reconnect...');

    try {
      await this.initialize();
      console.log('[MCP] Reconnection successful!');
      this.reconnectAttempts = 0; // Reset counter on successful reconnection
      this.emit('reconnected');
    } catch (error) {
      console.error('[MCP] Reconnection failed:', error.message);
      this.scheduleReconnect();
    }
  }

  /**
   * Cancel reconnection attempts
   */
  cancelReconnect() {
    this.shouldReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Disconnect from MCP Router
   */
  disconnect() {
    this.cancelReconnect();
    if (this.ws) {
      this.ws.close();
      this.connected = false;
    }
  }
}

// Usage example
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    console.log('Starting Elaria MCP WebSocket Integration Demo...\n');

    const orchestrator = new MCPOrchestrator();

    // Initialize
    const init = await orchestrator.initialize();
    if (!init.success) {
      console.error('Failed to initialize MCP orchestrator');
      process.exit(1);
    }

    console.log('✅ Elaria connected to MCP Router');
    console.log(`   WebSocket URL: ${init.wsUrl}`);

    // Start heartbeat
    orchestrator.startHeartbeat();

    // Listen for context updates
    orchestrator.on('context_sync', (files) => {
      console.log('[MCP] Context update - files modified:', files);
    });

    // Example: Ask Claude Code orchestrator a question
    console.log('\n📋 Example: Asking question to Claude Code orchestrator...');
    try {
      const answer = await orchestrator.askQuestion(
        'agent-0-claude-code',
        'What is the current status of the MCP Router?',
        { source: 'elaria' }
      );
      console.log('Answer:', answer);
    } catch (error) {
      console.log('Question timed out or failed:', error.message);
    }

    console.log('\n✅ MCP WebSocket Integration Demo Complete!');
    console.log('Press Ctrl+C to exit...');

  })();
}
