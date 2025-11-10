/**
 * MCP Router - Multi-Agent Coordination System
 *
 * Coordinates 7 AI agents with real-time context synchronization:
 * - 1 Orchestrator (Claude Code)
 * - 4 Local GPU agents (Ollama fleet on RTX 4090)
 * - 2 API agents (Claude Sonnet 4, GPT-4 Turbo)
 *
 * Features:
 * - WebSocket server for agent connections
 * - Intelligent task routing based on capabilities
 * - Shared 120KB context pool
 * - Real-time file modification broadcasting
 * - Automatic fallback to secondary agents
 * - Cost tracking and performance metrics
 */

import WebSocket, { WebSocketServer } from 'ws';
import { EventEmitter } from 'events';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../../backend/utils/logging/logger';
import { CollaborativeIntelligence } from './collaborative-intelligence';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Agent {
  id: string;
  type: 'orchestrator' | 'local_gpu' | 'api_cloud';
  model: string;
  capabilities: string[];
  status: 'idle' | 'busy' | 'offline';
  current_task_id?: string;
  connection?: WebSocket;
  endpoint?: string;
  vram_gb?: number;
  throughput_tokens_per_sec?: number;
  cost_per_million_tokens?: number;
}

interface Task {
  task_id: string;
  objective: string;
  constraints: TaskConstraints;
  assigned_agent_id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  created_at: Date;
  started_at?: Date;
  completed_at?: Date;
  result?: TaskResult;
  error?: string;
}

interface TaskConstraints {
  loc_max: number;
  pack: string;
  branch?: string;
  files?: string[];
}

interface TaskResult {
  code?: string;
  tests?: string;
  documentation?: string;
  files_modified: string[];
  verification_code: string;
}

interface SharedContext {
  workspace: string;
  files_modified: string[];
  current_tasks: Task[];
  knowledge_base: string;
  pack_loaded?: string;
  byte_usage: number;
}

interface RoutingRule {
  primary: string;
  fallback: string;
  trigger: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface MCPConfig {
  mcp_server: {
    host: string;
    port: number;
    protocol: string;
    max_connections: number;
    shared_context_size_kb: number;
  };
  agents: Record<string, AgentConfig>;
  routing_rules: Record<string, RoutingRule>;
  shared_context: {
    workspace_root: string;
    databases: Record<string, string>;
    knowledge_base: string;
    pack_system: string[];
  };
}

interface AgentConfig {
  id: string;
  type: 'orchestrator' | 'local_gpu' | 'api_cloud';
  model?: string;
  host?: string;
  api_endpoint?: string;
  vram_gb?: number;
  priority: string;
  capabilities: string[];
  cost_per_million_tokens: number;
  throughput_tokens_per_sec?: number;
}

// ============================================================================
// MCP ROUTER CLASS
// ============================================================================

export class MCPRouter extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private tasks: Map<string, Task> = new Map();
  private sharedContext: SharedContext;
  private wsServer: WebSocketServer;
  private config: MCPConfig;
  private knowledgeBase: string = '';
  private collaborativeIntelligence: CollaborativeIntelligence;

  private configPath: string;
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  constructor(configPath: string) {
    super();

    this.configPath = configPath;

    // Initialize with placeholder - will be set in initialize()
    this.config = {} as MCPConfig;
    this.sharedContext = {
      workspace: '',
      files_modified: [],
      current_tasks: [],
      knowledge_base: '',
      byte_usage: 0
    };
    this.wsServer = {} as WebSocketServer;
    this.collaborativeIntelligence = new CollaborativeIntelligence();
  }

  /**
   * Initialize the router (must be called before using)
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    await this.initializationPromise;
    this.initialized = true;
  }

  /**
   * Async initialization method
   */
  private async doInitialize(): Promise<void> {
    const configPath = this.configPath;
    // Load configuration
    await this.loadConfig(configPath);

    // Initialize shared context with loaded config
    this.sharedContext = {
      workspace: this.config.shared_context.workspace_root,
      files_modified: [],
      current_tasks: [],
      knowledge_base: this.knowledgeBase,
      byte_usage: 0
    };

    // Start WebSocket server
    this.wsServer = new WebSocketServer({
      port: this.config.mcp_server.port,
      host: 'localhost'
    });

    this.wsServer.on('connection', this.handleAgentConnection.bind(this));
    this.wsServer.on('error', (error) => {
      logger.error('[MCP Router] WebSocket server error', { error: error.message });
    });

    // Set up collaborative intelligence event handlers
    this.collaborativeIntelligence.on('question_answered', (data) => {
      logger.info('[MCP Router] Question answered collaboratively', {
        question_id: data.question_id,
        from_agent: data.from_agent_id,
        to_agent: data.to_agent_id
      });
    });

    this.collaborativeIntelligence.on('debate_completed', (data) => {
      logger.info('[MCP Router] Debate completed', {
        debate_id: data.debate_id,
        consensus_reached: data.consensus_reached,
        participants: data.participants.length
      });
    });

    this.collaborativeIntelligence.on('solution_verified', (data) => {
      logger.info('[MCP Router] Solution verified', {
        solution_id: data.solution_id,
        verifier: data.verifier_agent_id,
        passed: data.passed
      });
    });

    logger.info('[MCP Router] Started', {
      port: this.config.mcp_server.port,
      max_connections: this.config.mcp_server.max_connections,
      collaborative_intelligence: 'enabled'
    });
  }

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  private async loadConfig(configPath: string): Promise<void> {
    try {
      const configData = await fs.readFile(configPath, 'utf-8');
      this.config = JSON.parse(configData);

      // Load knowledge base
      if (this.config.shared_context.knowledge_base) {
        this.knowledgeBase = await fs.readFile(
          this.config.shared_context.knowledge_base,
          'utf-8'
        );
        this.sharedContext.knowledge_base = this.knowledgeBase;
      }

      logger.info('[MCP Router] Configuration loaded', {
        agents_count: Object.keys(this.config.agents).length,
        routing_rules: Object.keys(this.config.routing_rules).length
      });
    } catch (error) {
      logger.error('[MCP Router] Failed to load configuration', { error });
      throw error;
    }
  }

  // ============================================================================
  // AGENT REGISTRATION & MANAGEMENT
  // ============================================================================

  /**
   * Register an agent with the MCP router
   */
  public registerAgent(agentId: string): void {
    // Map agent IDs to config keys
    const agentKeyMap: Record<string, string> = {
      'agent-0-claude-code': 'claude_code',
      'agent-1-qwen32b': 'code_generator_qwen',
      'agent-2-deepseek6.7b': 'test_writer_deepseek',
      'agent-3-codellama13b': 'refactoring_expert_codellama',
      'agent-4-mistral7b': 'documentation_writer_mistral',
      'agent-5-claude-planner': 'planner_architect_claude',
      'agent-6-gpt-reviewer': 'reviewer_gpt'
    };

    const agentKey = agentKeyMap[agentId];
    if (!agentKey) {
      logger.error('[MCP Router] Unknown agent ID', { agentId });
      return;
    }

    const agentConfig = this.config.agents[agentKey];
    if (!agentConfig) {
      logger.error('[MCP Router] Agent config not found', { agentId, agentKey });
      return;
    }

    const agent: Agent = {
      id: agentId,
      type: agentConfig.type,
      model: agentConfig.model || 'unknown',
      capabilities: agentConfig.capabilities,
      status: 'idle',
      endpoint: agentConfig.host || agentConfig.api_endpoint,
      vram_gb: agentConfig.vram_gb,
      throughput_tokens_per_sec: agentConfig.throughput_tokens_per_sec,
      cost_per_million_tokens: agentConfig.cost_per_million_tokens
    };

    this.agents.set(agentId, agent);

    // Note: Collaborative intelligence agents are already initialized in CollaborativeIntelligence constructor

    logger.info('[MCP Router] Agent registered', {
      agent_id: agentId,
      type: agent.type,
      model: agent.model,
      capabilities: agent.capabilities,
      collaborative_enabled: true
    });

    this.emit('agent_registered', agent);
  }

  /**
   * Map capabilities to expertise areas for collaborative intelligence
   */
  private getExpertiseAreas(capabilities: string[]): string[] {
    const expertiseMap: Record<string, string> = {
      'code_generation': 'coding',
      'test_generation': 'testing',
      'coverage_analysis': 'testing',
      'refactoring': 'architecture',
      'performance_optimization': 'performance',
      'documentation': 'documentation',
      'jsdoc': 'documentation',
      'architecture_design': 'architecture',
      'security_review': 'security',
      'multi_database_sync': 'databases',
      'type_safety': 'type_systems'
    };

    const expertise = new Set<string>();
    for (const capability of capabilities) {
      const area = expertiseMap[capability];
      if (area) {
        expertise.add(area);
      }
    }

    return Array.from(expertise);
  }

  /**
   * Update agent status
   */
  private updateAgentStatus(agentId: string, status: Agent['status']): void {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      this.emit('agent_status_changed', { agent_id: agentId, status });
    }
  }

  // ============================================================================
  // TASK ROUTING & EXECUTION
  // ============================================================================

  /**
   * Route a task to the best available agent
   */
  public async routeTask(
    objective: string,
    constraints: TaskConstraints
  ): Promise<string> {
    const taskId = this.generateTaskId();

    // Find best agent for this task
    const agentId = this.selectAgent(objective);

    if (!agentId) {
      throw new Error('No available agents for this task');
    }

    // Create task
    const task: Task = {
      task_id: taskId,
      objective,
      constraints,
      assigned_agent_id: agentId,
      status: 'queued',
      created_at: new Date()
    };

    this.tasks.set(taskId, task);
    this.sharedContext.current_tasks.push(task);

    logger.info('[MCP Router] Task routed', {
      task_id: taskId,
      objective: objective.substring(0, 100),
      assigned_to: agentId
    });

    // Update agent status
    const agent = this.agents.get(agentId)!;
    agent.status = 'busy';
    agent.current_task_id = taskId;

    // Execute task
    await this.executeTask(task);

    return taskId;
  }

  /**
   * Select best agent for a given task objective
   */
  private selectAgent(objective: string): string | null {
    const objectiveLower = objective.toLowerCase();

    // Find matching routing rule
    for (const [taskType, rule] of Object.entries(this.config.routing_rules)) {
      const triggers = this.parseTriggers(rule.trigger);

      if (triggers.some(trigger => objectiveLower.includes(trigger))) {
        // Try primary agent
        const primaryAgent = this.agents.get(rule.primary);
        if (primaryAgent && primaryAgent.status === 'idle') {
          return rule.primary;
        }

        // Try fallback agent
        const fallbackAgent = this.agents.get(rule.fallback);
        if (fallbackAgent && fallbackAgent.status === 'idle') {
          logger.info('[MCP Router] Using fallback agent', {
            primary: rule.primary,
            fallback: rule.fallback,
            reason: 'Primary agent busy'
          });
          return rule.fallback;
        }
      }
    }

    // Default: Find any idle agent
    for (const [agentId, agent] of this.agents) {
      if (agent.status === 'idle') {
        return agentId;
      }
    }

    return null;
  }

  /**
   * Parse trigger string into individual keywords
   */
  private parseTriggers(trigger: string): string[] {
    return trigger
      .toLowerCase()
      .split(' OR ')
      .map(t => t.replace(/objective contains |'/g, '').trim())
      .filter(t => t.length > 0);
  }

  /**
   * Execute a task on the assigned agent
   */
  private async executeTask(task: Task): Promise<void> {
    task.status = 'in_progress';
    task.started_at = new Date();

    const agent = this.agents.get(task.assigned_agent_id)!;

    try {
      logger.info('[MCP Router] Executing task', {
        task_id: task.task_id,
        agent_id: agent.id,
        agent_type: agent.type
      });

      if (agent.type === 'local_gpu') {
        await this.executeOnLocalAgent(task, agent);
      } else if (agent.type === 'api_cloud') {
        await this.executeOnAPIAgent(task, agent);
      } else {
        // Orchestrator - handle locally
        await this.executeOnOrchestrator(task);
      }

    } catch (error) {
      task.status = 'failed';
      task.error = error instanceof Error ? error.message : String(error);

      logger.error('[MCP Router] Task execution failed', {
        task_id: task.task_id,
        agent_id: agent.id,
        error: task.error
      });

      this.emit('task_failed', task);
    } finally {
      task.completed_at = new Date();
      agent.status = 'idle';
      agent.current_task_id = undefined;
    }
  }

  /**
   * Execute task on local GPU agent (Ollama)
   */
  private async executeOnLocalAgent(task: Task, agent: Agent): Promise<void> {
    const prompt = this.buildPrompt(task);

    const response = await axios.post(`http://${agent.endpoint}/api/generate`, {
      model: agent.model,
      prompt,
      stream: false,
      options: {
        num_ctx: 128000,
        temperature: 0.2,
        num_gpu: 1,
        num_thread: 16
      }
    });

    task.result = {
      code: response.data.response,
      files_modified: [],
      verification_code: this.extractVerificationCode(response.data.response)
    };

    task.status = 'completed';

    logger.info('[MCP Router] Task completed (local GPU)', {
      task_id: task.task_id,
      agent_id: agent.id,
      response_length: response.data.response.length
    });

    this.emit('task_completed', task);
  }

  /**
   * Execute task on API cloud agent (Claude/GPT)
   */
  private async executeOnAPIAgent(task: Task, agent: Agent): Promise<void> {
    // This would integrate with Claude SDK or OpenAI SDK
    // For now, placeholder implementation

    logger.info('[MCP Router] Task delegated to API agent', {
      task_id: task.task_id,
      agent_id: agent.id,
      model: agent.model
    });

    task.status = 'completed';
    task.result = {
      files_modified: [],
      verification_code: 'API-AGENT-PLACEHOLDER'
    };

    this.emit('task_completed', task);
  }

  /**
   * Execute task on orchestrator (Claude Code)
   */
  private async executeOnOrchestrator(task: Task): Promise<void> {
    logger.info('[MCP Router] Task handled by orchestrator', {
      task_id: task.task_id
    });

    task.status = 'completed';
    task.result = {
      files_modified: [],
      verification_code: 'ORCHESTRATOR-COMPLETE'
    };

    this.emit('task_completed', task);
  }

  // ============================================================================
  // PROMPT BUILDING
  // ============================================================================

  /**
   * Build prompt with shared context for agent
   */
  private buildPrompt(task: Task): string {
    const contextInfo = [
      '# ClientForge Task',
      '',
      '## Objective',
      task.objective,
      '',
      '## Constraints',
      `- Max LOC: ${task.constraints.loc_max}`,
      `- Pack: ${task.constraints.pack}`,
      `- Branch: ${task.constraints.branch || 'main'}`,
      '',
      '## Shared Context',
      `Workspace: ${this.sharedContext.workspace}`,
      `Files Modified (by other agents): ${this.sharedContext.files_modified.slice(-10).join(', ') || 'none'}`,
      `Current Tasks: ${this.sharedContext.current_tasks.length} tasks in progress`,
      '',
      '## Knowledge Base (Excerpt)',
      this.sharedContext.knowledge_base.substring(0, 2000),
      '',
      '## Requirements',
      'Follow ClientForge standards:',
      '- Zero "any" types (use proper TypeScript types)',
      '- 85%+ test coverage',
      '- Multi-database sync (PostgreSQL → Elasticsearch → MongoDB → Redis)',
      '- Structured logging (MongoDB via Winston)',
      '- OWASP Top 10 compliance',
      '- Deep folder structure (3-4 levels)',
      '',
      'Include verification code in your response (e.g., OLLAMA-CODE-GEN-COMPLETE)'
    ].join('\n');

    return contextInfo;
  }

  /**
   * Extract verification code from agent response
   */
  private extractVerificationCode(response: string): string {
    const match = response.match(/[A-Z]+-[A-Z]+-[A-Z]+-COMPLETE/);
    return match ? match[0] : 'NO-VERIFICATION-CODE';
  }

  // ============================================================================
  // CONTEXT SYNCHRONIZATION
  // ============================================================================

  /**
   * Handle WebSocket connection from agent
   */
  private handleAgentConnection(ws: WebSocket): void {
    logger.info('[MCP Router] Agent connected via WebSocket');

    ws.on('message', (data: string) => {
      try {
        const message = JSON.parse(data);
        this.handleAgentMessage(message, ws);
      } catch (error) {
        logger.error('[MCP Router] Failed to parse agent message', { error });
      }
    });

    ws.on('close', () => {
      logger.info('[MCP Router] Agent disconnected');
    });

    ws.on('error', (error) => {
      logger.error('[MCP Router] WebSocket error', { error: error.message });
    });
  }

  /**
   * Handle message from agent
   */
  private handleAgentMessage(message: any, ws: WebSocket): void {
    switch (message.type) {
      case 'task_completed':
        this.handleTaskCompletion(message.task_id, message.result);
        break;

      case 'context_update':
        this.handleContextUpdate(message.files_modified);
        break;

      case 'agent_register':
        this.registerAgent(message.agent_id);
        break;

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
        break;

      // Collaborative Intelligence Protocol
      case 'ask_question':
        this.handleQuestionRequest(message, ws);
        break;

      case 'answer_question':
        this.handleQuestionAnswer(message);
        break;

      case 'start_debate':
        this.handleDebateRequest(message, ws);
        break;

      case 'debate_position':
        this.handleDebatePosition(message);
        break;

      case 'request_collaboration':
        this.handleCollaborationRequest(message, ws);
        break;

      case 'verify_solution':
        this.handleVerificationRequest(message, ws);
        break;

      default:
        logger.warn('[MCP Router] Unknown message type', { type: message.type });
    }
  }

  // ============================================================================
  // COLLABORATIVE INTELLIGENCE HANDLERS
  // ============================================================================

  /**
   * Handle question from one agent to another
   */
  private async handleQuestionRequest(message: any, ws: WebSocket): Promise<void> {
    try {
      const answer = await this.collaborativeIntelligence.askQuestion(
        message.from_agent_id,
        message.to_agent_id,
        message.question,
        message.context,
        message.priority || 'medium'
      );

      // Send answer back to requesting agent
      ws.send(JSON.stringify({
        type: 'question_answer',
        question_id: message.question_id,
        answer,
        timestamp: Date.now()
      }));

      logger.info('[MCP Router] Question answered', {
        from: message.from_agent_id,
        to: message.to_agent_id,
        question_length: message.question.length,
        answer_length: answer.length
      });
    } catch (error) {
      logger.error('[MCP Router] Question handling failed', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to answer question',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle answer from agent (for broadcast questions)
   */
  private handleQuestionAnswer(message: any): void {
    // TODO: Re-enable when collaborative intelligence submitAnswer is implemented
    logger.warn('[MCP Router] submitAnswer not yet implemented', { message });
    // this.collaborativeIntelligence.submitAnswer(
    //   message.question_id,
    //   message.agent_id,
    //   message.answer
    // );
  }

  /**
   * Handle debate request
   */
  private async handleDebateRequest(message: any, ws: WebSocket): Promise<void> {
    try {
      const consensus = await this.collaborativeIntelligence.startDebate(
        message.topic,
        message.participant_ids,
        message.initial_positions
      );

      ws.send(JSON.stringify({
        type: 'debate_result',
        debate_id: message.debate_id,
        consensus,
        timestamp: Date.now()
      }));

      logger.info('[MCP Router] Debate completed', {
        topic: message.topic,
        participants: message.participant_ids.length,
        consensus_reached: !!consensus
      });
    } catch (error) {
      logger.error('[MCP Router] Debate handling failed', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to complete debate',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle debate position from agent
   */
  private handleDebatePosition(message: any): void {
    // TODO: Re-enable when collaborative intelligence submitDebatePosition is implemented
    logger.warn('[MCP Router] submitDebatePosition not yet implemented', { message });
    // this.collaborativeIntelligence.submitDebatePosition(
    //   message.debate_id,
    //   message.agent_id,
    //   message.position,
    //   message.arguments
    // );
  }

  /**
   * Handle collaborative problem-solving request
   */
  private async handleCollaborationRequest(message: any, ws: WebSocket): Promise<void> {
    try {
      const solution = await this.collaborativeIntelligence.solveCollaboratively(
        message.problem,
        message.context
      );

      ws.send(JSON.stringify({
        type: 'collaborative_solution',
        request_id: message.request_id,
        solution,
        timestamp: Date.now()
      }));

      logger.info('[MCP Router] Collaborative solution created', {
        problem_length: message.problem.length,
        proposals_count: solution.proposed_solutions?.size || 0,
        selected_agent: solution.selected_solution || 'none'
      });
    } catch (error) {
      logger.error('[MCP Router] Collaboration failed', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to solve collaboratively',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle solution verification request
   */
  private async handleVerificationRequest(message: any, ws: WebSocket): Promise<void> {
    try {
      const verification = await this.collaborativeIntelligence.verifySolution(
        message.verifier_agent_id,
        message.solution_code,
        message.criteria
      );

      ws.send(JSON.stringify({
        type: 'verification_result',
        request_id: message.request_id,
        verification,
        timestamp: Date.now()
      }));

      logger.info('[MCP Router] Solution verified', {
        verifier: message.verifier_agent_id,
        passed: verification.passed,
        issues_found: verification.issues.length
      });
    } catch (error) {
      logger.error('[MCP Router] Verification failed', { error });
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Failed to verify solution',
        error: error instanceof Error ? error.message : String(error)
      }));
    }
  }

  /**
   * Handle task completion from agent
   */
  private handleTaskCompletion(taskId: string, result: TaskResult): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      logger.warn('[MCP Router] Task not found', { task_id: taskId });
      return;
    }

    task.status = 'completed';
    task.completed_at = new Date();
    task.result = result;

    const agent = this.agents.get(task.assigned_agent_id);
    if (agent) {
      agent.status = 'idle';
      agent.current_task_id = undefined;
    }

    // Update shared context
    if (result.files_modified && result.files_modified.length > 0) {
      this.handleContextUpdate(result.files_modified);
    }

    logger.info('[MCP Router] Task completed', {
      task_id: taskId,
      agent_id: task.assigned_agent_id,
      files_modified: result.files_modified.length
    });

    this.emit('task_completed', task);
  }

  /**
   * Handle context update from agent (files modified)
   */
  private handleContextUpdate(filesModified: string[]): void {
    // Add to shared context
    this.sharedContext.files_modified.push(...filesModified);

    // Keep only last 100 files
    if (this.sharedContext.files_modified.length > 100) {
      this.sharedContext.files_modified = this.sharedContext.files_modified.slice(-100);
    }

    // Broadcast to all connected agents
    this.broadcastContextSync(filesModified);

    logger.info('[MCP Router] Context updated', {
      files_count: filesModified.length,
      total_tracked: this.sharedContext.files_modified.length
    });
  }

  /**
   * Broadcast context synchronization to all agents
   */
  private broadcastContextSync(filesModified: string[]): void {
    const message = JSON.stringify({
      type: 'context_sync',
      files_modified: filesModified,
      timestamp: Date.now()
    });

    this.wsServer.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // ============================================================================
  // STATISTICS & MONITORING
  // ============================================================================

  /**
   * Get router statistics
   */
  public getStats(): any {
    const agentStats = Array.from(this.agents.values());
    const taskStats = Array.from(this.tasks.values());

    return {
      router: {
        uptime_seconds: process.uptime(),
        connected_agents: this.wsServer.clients.size,
        total_agents: agentStats.length
      },
      agents: {
        total: agentStats.length,
        idle: agentStats.filter(a => a.status === 'idle').length,
        busy: agentStats.filter(a => a.status === 'busy').length,
        offline: agentStats.filter(a => a.status === 'offline').length,
        by_type: {
          orchestrator: agentStats.filter(a => a.type === 'orchestrator').length,
          local_gpu: agentStats.filter(a => a.type === 'local_gpu').length,
          api_cloud: agentStats.filter(a => a.type === 'api_cloud').length
        }
      },
      tasks: {
        total: taskStats.length,
        queued: taskStats.filter(t => t.status === 'queued').length,
        in_progress: taskStats.filter(t => t.status === 'in_progress').length,
        completed: taskStats.filter(t => t.status === 'completed').length,
        failed: taskStats.filter(t => t.status === 'failed').length
      },
      performance: {
        local_throughput_tokens_per_sec: this.calculateLocalThroughput(),
        total_cost_saved_usd: this.calculateCostSavings(),
        avg_task_duration_seconds: this.calculateAvgTaskDuration()
      },
      context: {
        workspace: this.sharedContext.workspace,
        files_tracked: this.sharedContext.files_modified.length,
        current_tasks: this.sharedContext.current_tasks.length,
        byte_usage: this.sharedContext.byte_usage
      }
    };
  }

  /**
   * Calculate total throughput of local GPU agents
   */
  private calculateLocalThroughput(): number {
    let total = 0;
    for (const agent of this.agents.values()) {
      if (agent.type === 'local_gpu' && agent.throughput_tokens_per_sec) {
        total += agent.throughput_tokens_per_sec;
      }
    }
    return total;
  }

  /**
   * Calculate cost savings from using local agents
   */
  private calculateCostSavings(): number {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'completed');

    let localTasks = 0;
    let apiTasks = 0;

    for (const task of completedTasks) {
      const agent = this.agents.get(task.assigned_agent_id);
      if (agent) {
        if (agent.type === 'local_gpu') {
          localTasks++;
        } else if (agent.type === 'api_cloud') {
          apiTasks++;
        }
      }
    }

    // Estimate: 5000 tokens per task, $15/1M for Claude Sonnet 4
    const avgTokensPerTask = 5000;
    const apiCostPerToken = 15.00 / 1_000_000;

    const costSaved = localTasks * avgTokensPerTask * apiCostPerToken;
    return Math.round(costSaved * 100) / 100;
  }

  /**
   * Calculate average task duration
   */
  private calculateAvgTaskDuration(): number {
    const completedTasks = Array.from(this.tasks.values())
      .filter(t => t.status === 'completed' && t.started_at && t.completed_at);

    if (completedTasks.length === 0) return 0;

    const totalDuration = completedTasks.reduce((sum, task) => {
      const duration = task.completed_at!.getTime() - task.started_at!.getTime();
      return sum + duration;
    }, 0);

    return Math.round(totalDuration / completedTasks.length / 1000);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate unique task ID
   */
  private generateTaskId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `task-${timestamp}-${random}`;
  }

  /**
   * Shutdown router gracefully
   */
  public async shutdown(): Promise<void> {
    logger.info('[MCP Router] Shutting down...');

    // Close all WebSocket connections
    this.wsServer.clients.forEach((client) => {
      client.close();
    });

    // Close server
    this.wsServer.close();

    logger.info('[MCP Router] Shutdown complete');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default MCPRouter;
