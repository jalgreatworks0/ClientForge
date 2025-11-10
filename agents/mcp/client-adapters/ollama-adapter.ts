/**
 * Ollama Client Adapter - Connect Local GPU Agents to MCP Router
 *
 * Connects 4 Ollama models running on RTX 4090 to the MCP Router:
 * - Agent 1: Qwen2.5-Coder 32B (Code Generation)
 * - Agent 2: DeepSeek 6.7B (Test Writing)
 * - Agent 3: CodeLlama 13B (Refactoring)
 * - Agent 4: Mistral 7B (Documentation)
 *
 * Features:
 * - WebSocket connection to MCP Router
 * - Automatic reconnection on disconnect
 * - Heartbeat/ping every 30 seconds
 * - Task execution with streaming support
 * - Context synchronization
 */

import WebSocket from 'ws';
import axios from 'axios';
import { EventEmitter } from 'events';
import { logger } from '../../../backend/utils/logging/logger';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OllamaAgentConfig {
  agent_id: string;
  model: string;
  host: string;
  capabilities: string[];
  mcp_router_url: string;
}

interface Task {
  task_id: string;
  objective: string;
  constraints: {
    loc_max: number;
    pack: string;
    branch?: string;
  };
  context: {
    workspace: string;
    files_modified: string[];
    knowledge_base: string;
  };
}

interface TaskResult {
  code?: string;
  tests?: string;
  documentation?: string;
  files_modified: string[];
  verification_code: string;
}

// ============================================================================
// OLLAMA CLIENT ADAPTER
// ============================================================================

export class OllamaClientAdapter extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: OllamaAgentConfig;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected: boolean = false;

  constructor(config: OllamaAgentConfig) {
    super();
    this.config = config;
  }

  /**
   * Connect to MCP Router
   */
  public async connect(): Promise<void> {
    try {
      this.ws = new WebSocket(this.config.mcp_router_url);

      this.ws.on('open', () => {
        this.handleOpen();
      });

      this.ws.on('message', (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      this.ws.on('close', () => {
        this.handleClose();
      });

      this.ws.on('error', (error) => {
        this.handleError(error);
      });

    } catch (error) {
      logger.error('[Ollama Adapter] Connection failed', {
        agent_id: this.config.agent_id,
        error: error instanceof Error ? error.message : String(error)
      });
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen(): void {
    this.isConnected = true;

    logger.info('[Ollama Adapter] Connected to MCP Router', {
      agent_id: this.config.agent_id,
      model: this.config.model,
      host: this.config.host
    });

    // Register with MCP Router
    this.send({
      type: 'agent_register',
      agent_id: this.config.agent_id,
      model: this.config.model,
      capabilities: this.config.capabilities,
      status: 'idle'
    });

    // Start heartbeat
    this.startHeartbeat();

    this.emit('connected');
  }

  /**
   * Handle WebSocket message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);

      switch (message.type) {
        case 'task_assigned':
          this.handleTaskAssignment(message.task);
          break;

        case 'context_sync':
          this.handleContextSync(message.files_modified);
          break;

        case 'question_answer':
          // Question from collaborative intelligence - answer and respond
          this.handleQuestion(message);
          break;

        case 'pong':
          // Heartbeat response - all good
          break;

        default:
          logger.warn('[Ollama Adapter] Unknown message type', {
            agent_id: this.config.agent_id,
            type: message.type
          });
      }
    } catch (error) {
      logger.error('[Ollama Adapter] Failed to parse message', {
        agent_id: this.config.agent_id,
        error
      });
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(): void {
    this.isConnected = false;

    logger.warn('[Ollama Adapter] Disconnected from MCP Router', {
      agent_id: this.config.agent_id
    });

    this.stopHeartbeat();
    this.scheduleReconnect();
    this.emit('disconnected');
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error): void {
    logger.error('[Ollama Adapter] WebSocket error', {
      agent_id: this.config.agent_id,
      error: error.message
    });
  }

  /**
   * Handle task assignment from MCP Router
   */
  private async handleTaskAssignment(task: Task): Promise<void> {
    logger.info('[Ollama Adapter] Task received', {
      agent_id: this.config.agent_id,
      task_id: task.task_id,
      objective: task.objective.substring(0, 100)
    });

    try {
      // Execute task on Ollama model
      const result = await this.executeTask(task);

      // Send result back to MCP Router
      this.send({
        type: 'task_completed',
        task_id: task.task_id,
        result
      });

      logger.info('[Ollama Adapter] Task completed', {
        agent_id: this.config.agent_id,
        task_id: task.task_id,
        verification: result.verification_code
      });

    } catch (error) {
      logger.error('[Ollama Adapter] Task execution failed', {
        agent_id: this.config.agent_id,
        task_id: task.task_id,
        error: error instanceof Error ? error.message : String(error)
      });

      // Send failure notification
      this.send({
        type: 'task_failed',
        task_id: task.task_id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Handle incoming question from MCP Router (Collaborative Intelligence)
   */
  private async handleQuestion(message: any): Promise<void> {
    logger.info('[Ollama Adapter] Question received', {
      agent_id: this.config.agent_id,
      question_id: message.question_id,
      question_length: message.question?.length || 0
    });

    try {
      // Extract question and answer from the message (router sends full prompt)
      const prompt = message.answer || message.question || '';

      // Call Ollama API directly
      logger.info('[Ollama Adapter] Calling Ollama for question', {
        agent_id: this.config.agent_id,
        model: this.config.model,
        host: this.config.host,
        prompt_length: prompt.length
      });

      const response = await axios.post(`http://${this.config.host}/api/generate`, {
        model: this.config.model,
        prompt,
        stream: false,
        options: {
          num_ctx: 128000,
          temperature: 0.7,
          num_gpu: 1,
          num_thread: 16
        }
      }, {
        timeout: 120000  // 2 minute timeout
      });

      const answer = response.data.response;

      logger.info('[Ollama Adapter] Ollama response received', {
        agent_id: this.config.agent_id,
        answer_length: answer.length,
        eval_count: response.data.eval_count,
        eval_duration: response.data.eval_duration
      });

      // Don't send response back - collaborative intelligence handles it
      // The response was already sent in message.type='question_answer'

    } catch (error) {
      logger.error('[Ollama Adapter] Question handling failed', {
        agent_id: this.config.agent_id,
        question_id: message.question_id,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Execute task on Ollama model
   */
  private async executeTask(task: Task): Promise<TaskResult> {
    const prompt = this.buildPrompt(task);

    logger.info('[Ollama Adapter] Executing on Ollama', {
      agent_id: this.config.agent_id,
      model: this.config.model,
      host: this.config.host,
      prompt_length: prompt.length
    });

    // Call Ollama API
    const response = await axios.post(`http://${this.config.host}/api/generate`, {
      model: this.config.model,
      prompt,
      stream: false,
      options: {
        num_ctx: 128000,
        temperature: 0.2,
        num_gpu: 1,        // Use GPU 1 (RTX 4090)
        num_thread: 16,
        f16_kv: true,
        use_mlock: true
      }
    }, {
      timeout: 300000  // 5 minute timeout
    });

    const generatedText = response.data.response;

    // Parse response based on agent capability
    const result: TaskResult = {
      files_modified: this.extractFilesModified(generatedText),
      verification_code: this.extractVerificationCode(generatedText)
    };

    // Store generated content based on agent type
    if (this.config.capabilities.includes('code_generation')) {
      result.code = generatedText;
    } else if (this.config.capabilities.includes('test_generation')) {
      result.tests = generatedText;
    } else if (this.config.capabilities.includes('documentation')) {
      result.documentation = generatedText;
    }

    return result;
  }

  /**
   * Build prompt with task details and context
   */
  private buildPrompt(task: Task): string {
    const capability = this.config.capabilities[0];
    const promptParts: string[] = [];

    // Add task header
    promptParts.push('# ClientForge CRM - Code Generation Task');
    promptParts.push('');
    promptParts.push(`**Agent**: ${this.config.agent_id} (${this.config.model})`);
    promptParts.push(`**Capability**: ${capability}`);
    promptParts.push('');

    // Add objective
    promptParts.push('## Objective');
    promptParts.push(task.objective);
    promptParts.push('');

    // Add constraints
    promptParts.push('## Constraints');
    promptParts.push(`- Maximum lines of code: ${task.constraints.loc_max}`);
    promptParts.push(`- Context pack: ${task.constraints.pack}`);
    promptParts.push(`- Git branch: ${task.constraints.branch || 'main'}`);
    promptParts.push('');

    // Add shared context
    promptParts.push('## Shared Context');
    promptParts.push(`- Workspace: ${task.context.workspace}`);
    promptParts.push(`- Recently modified files: ${task.context.files_modified.slice(-10).join(', ') || 'none'}`);
    promptParts.push('');

    // Add knowledge base excerpt
    if (task.context.knowledge_base) {
      promptParts.push('## Knowledge Base (Excerpt)');
      promptParts.push(task.context.knowledge_base.substring(0, 2000));
      promptParts.push('...');
      promptParts.push('');
    }

    // Add requirements based on capability
    promptParts.push('## Requirements');

    if (capability === 'code_generation') {
      promptParts.push('Generate complete TypeScript implementation with:');
      promptParts.push('- Zero "any" types (use proper TypeScript typing)');
      promptParts.push('- Multi-database sync (PostgreSQL → Elasticsearch → MongoDB → Redis)');
      promptParts.push('- Zod input validation schemas');
      promptParts.push('- Structured logging via Winston (MongoDB transport)');
      promptParts.push('- Error handling with try-catch');
      promptParts.push('- OWASP Top 10 security compliance');
      promptParts.push('');
      promptParts.push('Include verification code: OLLAMA-CODE-GEN-COMPLETE');

    } else if (capability === 'test_generation') {
      promptParts.push('Generate comprehensive test suite with:');
      promptParts.push('- Happy path tests (expected behavior)');
      promptParts.push('- Edge case tests (null, undefined, empty arrays, max limits)');
      promptParts.push('- Error case tests (validation failures, database errors)');
      promptParts.push('- Security tests (SQL injection, XSS, auth bypass)');
      promptParts.push('- Performance tests (API response <200ms)');
      promptParts.push('- Target: 95%+ code coverage');
      promptParts.push('');
      promptParts.push('Include verification code: OLLAMA-TEST-WRITER-95%-COVERAGE');

    } else if (capability === 'refactoring') {
      promptParts.push('Refactor code to improve:');
      promptParts.push('- Remove "any" types, add proper typing');
      promptParts.push('- Extract duplicate code into utilities');
      promptParts.push('- Optimize database queries (remove N+1, add batching)');
      promptParts.push('- Improve error handling patterns');
      promptParts.push('- Add missing input validation');
      promptParts.push('- Performance optimization (caching, indexes)');
      promptParts.push('');
      promptParts.push('Include verification code: OLLAMA-REFACTOR-COMPLETE');

    } else if (capability === 'documentation') {
      promptParts.push('Generate documentation:');
      promptParts.push('- JSDoc comments for all public functions');
      promptParts.push('- Inline comments only for complex logic');
      promptParts.push('- Clear, concise descriptions');
      promptParts.push('- Parameter types and return types');
      promptParts.push('- Usage examples where appropriate');
      promptParts.push('');
      promptParts.push('Include verification code: OLLAMA-DOCS-COMPLETE');
    }

    return promptParts.join('\n');
  }

  /**
   * Extract files modified from generated response
   */
  private extractFilesModified(response: string): string[] {
    const fileRegex = /(?:backend|frontend|config|tests)\/[\w\-\/]+\.(?:ts|tsx|js|jsx|json)/g;
    const matches = response.match(fileRegex);
    return matches ? Array.from(new Set(matches)) : [];
  }

  /**
   * Extract verification code from response
   */
  private extractVerificationCode(response: string): string {
    const match = response.match(/OLLAMA-[A-Z]+-[A-Z]+-[A-Z0-9%-]*-COMPLETE/);
    return match ? match[0] : 'OLLAMA-NO-VERIFICATION-CODE';
  }

  /**
   * Handle context synchronization from MCP Router
   */
  private handleContextSync(filesModified: string[]): void {
    logger.info('[Ollama Adapter] Context sync received', {
      agent_id: this.config.agent_id,
      files_count: filesModified.length
    });

    this.emit('context_updated', filesModified);
  }

  /**
   * Send message to MCP Router
   */
  private send(message: any): void {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(message));
    } else {
      logger.error('[Ollama Adapter] Cannot send - not connected', {
        agent_id: this.config.agent_id
      });
    }
  }

  /**
   * Start heartbeat (ping every 30 seconds)
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping', agent_id: this.config.agent_id });
    }, 30000);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    if (this.reconnectInterval) return;

    logger.info('[Ollama Adapter] Scheduling reconnect in 5 seconds', {
      agent_id: this.config.agent_id
    });

    this.reconnectInterval = setTimeout(() => {
      this.reconnectInterval = null;
      this.connect();
    }, 5000);
  }

  /**
   * Disconnect from MCP Router
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.stopHeartbeat();

    if (this.reconnectInterval) {
      clearTimeout(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    this.isConnected = false;

    logger.info('[Ollama Adapter] Disconnected', {
      agent_id: this.config.agent_id
    });
  }

  // ============================================================================
  // COLLABORATIVE INTELLIGENCE METHODS
  // ============================================================================

  /**
   * Ask a question to another agent or all agents
   */
  public async askQuestion(
    toAgentId: string | 'all',
    question: string,
    context: any,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<string> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to MCP Router');
    }

    const questionId = this.generateId('question');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Question timeout (30 seconds)'));
      }, 30000);

      const messageHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.type === 'question_answer' && response.question_id === questionId) {
            clearTimeout(timeout);
            this.ws?.removeListener('message', messageHandler);
            resolve(response.answer);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      this.ws.on('message', messageHandler);

      this.send({
        type: 'ask_question',
        question_id: questionId,
        from_agent_id: this.config.agent_id,
        to_agent_id: toAgentId,
        question,
        context,
        priority,
        timestamp: Date.now()
      });

      logger.info('[Ollama Adapter] Question sent', {
        agent_id: this.config.agent_id,
        to_agent: toAgentId,
        question_length: question.length
      });
    });
  }

  /**
   * Start a debate with other agents
   */
  public async startDebate(
    topic: string,
    participantIds: string[],
    initialPositions?: Map<string, string>
  ): Promise<string> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to MCP Router');
    }

    const debateId = this.generateId('debate');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Debate timeout (60 seconds)'));
      }, 60000);

      const messageHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.type === 'debate_result' && response.debate_id === debateId) {
            clearTimeout(timeout);
            this.ws?.removeListener('message', messageHandler);
            resolve(response.consensus);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      this.ws.on('message', messageHandler);

      this.send({
        type: 'start_debate',
        debate_id: debateId,
        topic,
        participant_ids: participantIds,
        initial_positions: initialPositions ? Object.fromEntries(initialPositions) : undefined,
        timestamp: Date.now()
      });

      logger.info('[Ollama Adapter] Debate started', {
        agent_id: this.config.agent_id,
        topic,
        participants: participantIds.length
      });
    });
  }

  /**
   * Request collaborative problem-solving
   */
  public async solveCollaboratively(
    problem: string,
    context: any
  ): Promise<any> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to MCP Router');
    }

    const requestId = this.generateId('collab');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Collaboration timeout (90 seconds)'));
      }, 90000);

      const messageHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.type === 'collaborative_solution' && response.request_id === requestId) {
            clearTimeout(timeout);
            this.ws?.removeListener('message', messageHandler);
            resolve(response.solution);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      this.ws.on('message', messageHandler);

      this.send({
        type: 'request_collaboration',
        request_id: requestId,
        problem,
        context,
        timestamp: Date.now()
      });

      logger.info('[Ollama Adapter] Collaboration requested', {
        agent_id: this.config.agent_id,
        problem_length: problem.length
      });
    });
  }

  /**
   * Verify a solution created by another agent
   */
  public async verifySolution(
    solutionCode: string,
    criteria: string[]
  ): Promise<any> {
    if (!this.ws || !this.isConnected) {
      throw new Error('Not connected to MCP Router');
    }

    const requestId = this.generateId('verify');

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Verification timeout (45 seconds)'));
      }, 45000);

      const messageHandler = (data: Buffer) => {
        try {
          const response = JSON.parse(data.toString());
          if (response.type === 'verification_result' && response.request_id === requestId) {
            clearTimeout(timeout);
            this.ws?.removeListener('message', messageHandler);
            resolve(response.verification);
          }
        } catch (error) {
          // Ignore parse errors
        }
      };

      this.ws.on('message', messageHandler);

      this.send({
        type: 'verify_solution',
        request_id: requestId,
        verifier_agent_id: this.config.agent_id,
        solution_code: solutionCode,
        criteria,
        timestamp: Date.now()
      });

      logger.info('[Ollama Adapter] Verification requested', {
        agent_id: this.config.agent_id,
        code_length: solutionCode.length,
        criteria_count: criteria.length
      });
    });
  }

  /**
   * Generate unique ID for collaborative requests
   */
  private generateId(prefix: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default OllamaClientAdapter;
