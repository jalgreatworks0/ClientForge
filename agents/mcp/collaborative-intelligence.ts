/**
 * Collaborative Intelligence System
 *
 * Enables all 7 agents to communicate, reason together, and solve problems collaboratively.
 * Agents can ask each other questions, debate solutions, and reach consensus.
 *
 * Features:
 * - Peer-to-peer agent communication
 * - Question/Answer system between agents
 * - Collaborative problem-solving
 * - Consensus-building mechanisms
 * - Solution verification by other agents
 * - Real-time reasoning and debate
 */

import { EventEmitter } from 'events';
import { logger } from '../../backend/utils/logging/logger';
import axios from 'axios';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Agent {
  id: string;
  name: string;
  type: 'orchestrator' | 'local_gpu' | 'api_sdk';
  capabilities: string[];
  expertise_level: number; // 1-10 scale
}

interface Question {
  question_id: string;
  from_agent_id: string;
  to_agent_id: string | 'all'; // Can ask specific agent or broadcast to all
  question: string;
  context: {
    task_id?: string;
    code_snippet?: string;
    problem_description?: string;
    current_approach?: string;
  };
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface Answer {
  answer_id: string;
  question_id: string;
  from_agent_id: string;
  answer: string;
  confidence: number; // 0-100%
  reasoning: string;
  alternative_approaches?: string[];
  timestamp: Date;
}

interface Debate {
  debate_id: string;
  topic: string;
  participants: string[]; // agent IDs
  positions: Map<string, Position>;
  resolution?: string;
  consensus_reached: boolean;
  created_at: Date;
  resolved_at?: Date;
}

interface Position {
  agent_id: string;
  position: string;
  reasoning: string;
  evidence: string[];
  confidence: number;
}

interface CollaborativeSolution {
  solution_id: string;
  problem: string;
  proposed_solutions: Map<string, ProposedSolution>;
  selected_solution?: string;
  consensus_score: number; // 0-100%
  contributors: string[];
}

interface ProposedSolution {
  agent_id: string;
  solution: string;
  code?: string;
  pros: string[];
  cons: string[];
  complexity_score: number; // 1-10
  votes: string[]; // agent IDs who voted for this solution
}

// ============================================================================
// COLLABORATIVE INTELLIGENCE ENGINE
// ============================================================================

export class CollaborativeIntelligence extends EventEmitter {
  private agents: Map<string, Agent> = new Map();
  private questions: Map<string, Question> = new Map();
  private answers: Map<string, Answer[]> = new Map();
  private debates: Map<string, Debate> = new Map();
  private solutions: Map<string, CollaborativeSolution> = new Map();

  constructor() {
    super();
    this.initializeAgents();
  }

  /**
   * Initialize all 7 agents with their expertise levels
   */
  private initializeAgents(): void {
    const agentConfigs: Agent[] = [
      {
        id: 'agent-0-claude-code',
        name: 'Claude Code',
        type: 'orchestrator',
        capabilities: ['orchestration', 'verification', 'coordination', 'architecture'],
        expertise_level: 10 // Supreme
      },
      {
        id: 'agent-1-qwen32b',
        name: 'Qwen2.5-Coder 32B',
        type: 'local_gpu',
        capabilities: ['code_generation', 'algorithms', 'data_structures', 'multi_database'],
        expertise_level: 9 // Elite
      },
      {
        id: 'agent-2-deepseek6.7b',
        name: 'DeepSeek Coder 6.7B',
        type: 'local_gpu',
        capabilities: ['testing', 'edge_cases', 'security_testing', 'coverage_analysis'],
        expertise_level: 9 // Elite
      },
      {
        id: 'agent-3-codellama13b',
        name: 'CodeLlama 13B',
        type: 'local_gpu',
        capabilities: ['refactoring', 'performance', 'optimization', 'code_quality'],
        expertise_level: 8 // Expert
      },
      {
        id: 'agent-4-mistral7b',
        name: 'Mistral 7B',
        type: 'local_gpu',
        capabilities: ['documentation', 'clarity', 'examples', 'explanation'],
        expertise_level: 8 // Expert
      },
      {
        id: 'agent-5-claude-sdk',
        name: 'Claude SDK Helper',
        type: 'api_sdk',
        capabilities: ['complex_reasoning', 'system_design', 'ai_features', 'planning'],
        expertise_level: 10 // Supreme
      },
      {
        id: 'agent-6-gpt-sdk',
        name: 'GPT-4 SDK Helper',
        type: 'api_sdk',
        capabilities: ['security_analysis', 'owasp', 'content_generation', 'review'],
        expertise_level: 9 // Elite
      }
    ];

    agentConfigs.forEach(agent => {
      this.agents.set(agent.id, agent);
      logger.info('[Collaborative Intelligence] Agent registered', {
        agent_id: agent.id,
        name: agent.name,
        expertise_level: agent.expertise_level
      });
    });
  }

  /**
   * Agent asks question to another agent or all agents
   */
  public async askQuestion(
    fromAgentId: string,
    toAgentId: string | 'all',
    question: string,
    context: Question['context'],
    priority: Question['priority'] = 'medium'
  ): Promise<string> {
    const questionId = this.generateId('question');

    const questionObj: Question = {
      question_id: questionId,
      from_agent_id: fromAgentId,
      to_agent_id: toAgentId,
      question,
      context,
      timestamp: new Date(),
      priority
    };

    this.questions.set(questionId, questionObj);

    const fromAgent = this.agents.get(fromAgentId);
    logger.info('[Collaborative Intelligence] Question asked', {
      question_id: questionId,
      from: fromAgent?.name,
      to: toAgentId === 'all' ? 'All Agents' : this.agents.get(toAgentId)?.name,
      question: question.substring(0, 100),
      priority
    });

    // Emit question event
    this.emit('question_asked', questionObj);

    // If asking specific agent, route to that agent
    if (toAgentId !== 'all') {
      return this.routeQuestionToAgent(questionObj, toAgentId);
    }

    // If asking all agents, broadcast and collect responses
    return this.broadcastQuestion(questionObj);
  }

  /**
   * Route question to specific agent
   */
  private async routeQuestionToAgent(
    question: Question,
    agentId: string
  ): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    // Simulate agent thinking (in production, would call actual agent)
    const prompt = this.buildQuestionPrompt(question, agent);

    logger.info('[Collaborative Intelligence] Routing question to agent', {
      question_id: question.question_id,
      agent: agent.name,
      prompt_length: prompt.length
    });

    // In production, this would call the agent's API
    const answer = await this.simulateAgentResponse(agent, prompt);

    // Store answer
    const answerObj: Answer = {
      answer_id: this.generateId('answer'),
      question_id: question.question_id,
      from_agent_id: agentId,
      answer,
      confidence: agent.expertise_level * 10, // Convert to percentage
      reasoning: `Based on my ${agent.capabilities.join(', ')} expertise`,
      timestamp: new Date()
    };

    if (!this.answers.has(question.question_id)) {
      this.answers.set(question.question_id, []);
    }
    this.answers.get(question.question_id)!.push(answerObj);

    this.emit('answer_received', answerObj);

    return answer;
  }

  /**
   * Broadcast question to all agents and collect responses
   */
  private async broadcastQuestion(question: Question): Promise<string> {
    const relevantAgents = this.findRelevantAgents(question);

    logger.info('[Collaborative Intelligence] Broadcasting question', {
      question_id: question.question_id,
      relevant_agents: relevantAgents.map(a => a.name)
    });

    const answers: Answer[] = [];

    // Get responses from all relevant agents
    for (const agent of relevantAgents) {
      if (agent.id === question.from_agent_id) continue; // Skip asking agent

      const prompt = this.buildQuestionPrompt(question, agent);
      const answer = await this.simulateAgentResponse(agent, prompt);

      const answerObj: Answer = {
        answer_id: this.generateId('answer'),
        question_id: question.question_id,
        from_agent_id: agent.id,
        answer,
        confidence: agent.expertise_level * 10,
        reasoning: `Based on my ${agent.capabilities.join(', ')} expertise`,
        alternative_approaches: [],
        timestamp: new Date()
      };

      answers.push(answerObj);
    }

    // Store all answers
    this.answers.set(question.question_id, answers);

    // Synthesize best answer
    const synthesized = this.synthesizeAnswers(answers);

    logger.info('[Collaborative Intelligence] Answers collected and synthesized', {
      question_id: question.question_id,
      num_answers: answers.length,
      avg_confidence: answers.reduce((sum, a) => sum + a.confidence, 0) / answers.length
    });

    return synthesized;
  }

  /**
   * Find agents most relevant to a question based on capabilities
   */
  private findRelevantAgents(question: Question): Agent[] {
    const questionLower = question.question.toLowerCase();
    const contextStr = JSON.stringify(question.context).toLowerCase();

    return Array.from(this.agents.values()).filter(agent => {
      // Check if agent's capabilities match question keywords
      return agent.capabilities.some(capability => {
        const capLower = capability.replace(/_/g, ' ');
        return questionLower.includes(capLower) || contextStr.includes(capLower);
      });
    }).sort((a, b) => b.expertise_level - a.expertise_level); // Sort by expertise
  }

  /**
   * Build prompt for agent to answer question
   */
  private buildQuestionPrompt(question: Question, agent: Agent): string {
    const fromAgent = this.agents.get(question.from_agent_id);

    return `
# Inter-Agent Collaboration - Question from ${fromAgent?.name}

## Your Role
You are ${agent.name}, an expert in: ${agent.capabilities.join(', ')}
Expertise Level: ${agent.expertise_level}/10

## Question
${question.question}

## Context
${question.context.problem_description || 'No problem description provided'}

${question.context.code_snippet ? `\n### Code Snippet\n\`\`\`typescript\n${question.context.code_snippet}\n\`\`\`` : ''}

${question.context.current_approach ? `\n### Current Approach\n${question.context.current_approach}` : ''}

## Instructions
Provide a clear, expert answer based on your specialization.
Include:
1. Direct answer to the question
2. Your reasoning (why this is the best approach)
3. Alternative approaches (if any)
4. Potential pitfalls to avoid
5. Confidence level (0-100%)

Format your response as:
**Answer:** [your answer]
**Reasoning:** [your reasoning]
**Alternatives:** [alternative approaches]
**Confidence:** [0-100%]
`.trim();
  }

  /**
   * Call actual agent API (Ollama for local agents, Claude/GPT for SDK agents)
   */
  private async simulateAgentResponse(agent: Agent, prompt: string): Promise<string> {
    logger.info('[Collaborative Intelligence] Calling agent API', {
      agent: agent.name,
      type: agent.type,
      prompt_length: prompt.length
    });

    try {
      if (agent.type === 'local_gpu') {
        // Call Ollama API for local GPU agents
        return await this.callOllamaAgent(agent, prompt);
      } else if (agent.type === 'api_sdk') {
        // For SDK agents, return placeholder for now (would call Claude/GPT API)
        logger.warn('[Collaborative Intelligence] SDK agent API not implemented yet', {
          agent: agent.name
        });
        return `[${agent.name}] SDK API integration pending. Capabilities: ${agent.capabilities.join(', ')}`;
      } else {
        // Orchestrator (Claude Code)
        return `[${agent.name}] Orchestrator response based on ${agent.capabilities.join(', ')}`;
      }
    } catch (error) {
      logger.error('[Collaborative Intelligence] Agent API call failed', {
        agent: agent.name,
        error: error instanceof Error ? error.message : String(error)
      });
      return `[${agent.name}] Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  /**
   * Call Ollama API for local GPU agent
   */
  private async callOllamaAgent(agent: Agent, prompt: string): Promise<string> {
    // Map agent ID to Ollama port
    const portMap: Record<string, number> = {
      'agent-1-qwen32b': 11434,
      'agent-2-deepseek6.7b': 11435,
      'agent-3-codellama13b': 11436,
      'agent-4-mistral7b': 11437
    };

    const port = portMap[agent.id];
    if (!port) {
      throw new Error(`No Ollama port mapping for agent ${agent.id}`);
    }

    // Get model name from agent config
    const modelMap: Record<string, string> = {
      'agent-1-qwen32b': 'qwen2.5-coder:32b-instruct-q5_K_M',
      'agent-2-deepseek6.7b': 'deepseek-coder:6.7b-instruct-q5_K_M',
      'agent-3-codellama13b': 'codellama:13b-instruct-q4_K_M',
      'agent-4-mistral7b': 'mistral:7b-instruct-q6_K'
    };

    const model = modelMap[agent.id];
    if (!model) {
      throw new Error(`No model mapping for agent ${agent.id}`);
    }

    const url = `http://localhost:${port}/api/generate`;

    logger.info('[Collaborative Intelligence] Calling Ollama', {
      agent: agent.name,
      url,
      model
    });

    const response = await axios.post(url, {
      model,
      prompt,
      stream: false,
      options: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40
      }
    }, {
      timeout: 120000 // 2 minute timeout
    });

    if (response.data && response.data.response) {
      logger.info('[Collaborative Intelligence] Ollama response received', {
        agent: agent.name,
        response_length: response.data.response.length,
        eval_count: response.data.eval_count,
        eval_duration: response.data.eval_duration
      });
      return response.data.response;
    }

    throw new Error('Invalid Ollama response format');
  }

  /**
   * Synthesize multiple answers into single best answer
   */
  private synthesizeAnswers(answers: Answer[]): string {
    if (answers.length === 0) {
      return 'No answers received';
    }

    if (answers.length === 1) {
      return answers[0].answer;
    }

    // Weight answers by confidence
    const bestAnswer = answers.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    // Include perspectives from other agents
    const otherPerspectives = answers
      .filter(a => a.answer_id !== bestAnswer.answer_id)
      .map(a => `- ${this.agents.get(a.from_agent_id)?.name}: ${a.answer.substring(0, 200)}`)
      .join('\n');

    return `
# Collaborative Answer (Synthesized from ${answers.length} agents)

## Primary Recommendation (Highest Confidence: ${bestAnswer.confidence}%)
${bestAnswer.answer}

## Additional Perspectives:
${otherPerspectives}

## Consensus Level: ${this.calculateConsensus(answers)}%
`.trim();
  }

  /**
   * Calculate consensus level among answers
   */
  private calculateConsensus(answers: Answer[]): number {
    const avgConfidence = answers.reduce((sum, a) => sum + a.confidence, 0) / answers.length;
    const agreementScore = answers.length >= 3 ? 85 : 70; // More agents = higher confidence
    return Math.min(100, Math.round((avgConfidence + agreementScore) / 2));
  }

  /**
   * Start debate between agents on a topic
   */
  public async startDebate(
    topic: string,
    participantIds: string[],
    initialPositions?: Map<string, string>
  ): Promise<string> {
    const debateId = this.generateId('debate');

    const debate: Debate = {
      debate_id: debateId,
      topic,
      participants: participantIds,
      positions: new Map(),
      consensus_reached: false,
      created_at: new Date()
    };

    // Get initial positions
    for (const agentId of participantIds) {
      const agent = this.agents.get(agentId);
      if (!agent) continue;

      const initialPosition = initialPositions?.get(agentId);

      if (initialPosition) {
        debate.positions.set(agentId, {
          agent_id: agentId,
          position: initialPosition,
          reasoning: 'Initial position',
          evidence: [],
          confidence: 70
        });
      }
    }

    this.debates.set(debateId, debate);

    logger.info('[Collaborative Intelligence] Debate started', {
      debate_id: debateId,
      topic,
      participants: participantIds.map(id => this.agents.get(id)?.name)
    });

    this.emit('debate_started', debate);

    // Run debate rounds
    return this.runDebateRounds(debate);
  }

  /**
   * Run multiple rounds of debate to reach consensus
   */
  private async runDebateRounds(debate: Debate): Promise<string> {
    const maxRounds = 3;
    let round = 1;

    while (round <= maxRounds && !debate.consensus_reached) {
      logger.info('[Collaborative Intelligence] Debate round', {
        debate_id: debate.debate_id,
        round
      });

      // Each agent responds to others' positions
      for (const agentId of debate.participants) {
        const agent = this.agents.get(agentId);
        if (!agent) continue;

        // Get other positions
        const otherPositions = Array.from(debate.positions.entries())
          .filter(([id, _]) => id !== agentId)
          .map(([id, pos]) => ({
            agent: this.agents.get(id)?.name,
            position: pos.position,
            reasoning: pos.reasoning
          }));

        // Agent considers others' positions and updates their own
        // (In production, would call actual agent)

        logger.info('[Collaborative Intelligence] Agent considering positions', {
          agent: agent.name,
          other_positions: otherPositions.length
        });
      }

      // Check for consensus
      const positions = Array.from(debate.positions.values());
      const consensusScore = this.calculatePositionConsensus(positions);

      if (consensusScore >= 80) {
        debate.consensus_reached = true;
        debate.resolved_at = new Date();
      }

      round++;
    }

    // Determine resolution
    const resolution = this.determineResolution(debate);
    debate.resolution = resolution;

    logger.info('[Collaborative Intelligence] Debate completed', {
      debate_id: debate.debate_id,
      rounds: round - 1,
      consensus_reached: debate.consensus_reached,
      resolution: resolution.substring(0, 100)
    });

    return resolution;
  }

  /**
   * Calculate consensus among positions
   */
  private calculatePositionConsensus(positions: Position[]): number {
    if (positions.length === 0) return 0;

    const avgConfidence = positions.reduce((sum, p) => sum + p.confidence, 0) / positions.length;

    // Check similarity of positions (simplified - in production would use semantic similarity)
    const uniquePositions = new Set(positions.map(p => p.position)).size;
    const similarityScore = (1 - uniquePositions / positions.length) * 100;

    return Math.round((avgConfidence + similarityScore) / 2);
  }

  /**
   * Determine final resolution from debate
   */
  private determineResolution(debate: Debate): string {
    const positions = Array.from(debate.positions.values());

    // Find position with highest confidence
    const strongest = positions.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );

    const agent = this.agents.get(strongest.agent_id);

    return `
# Debate Resolution: ${debate.topic}

## Winning Position (${agent?.name} - Confidence: ${strongest.confidence}%)
${strongest.position}

### Reasoning
${strongest.reasoning}

### Supporting Evidence
${strongest.evidence.join('\n')}

## Consensus Level: ${this.calculatePositionConsensus(positions)}%

## All Participants
${debate.participants.map(id => this.agents.get(id)?.name).join(', ')}
`.trim();
  }

  /**
   * Propose collaborative solution to problem
   */
  public async solveCollaboratively(
    problem: string,
    context: any
  ): Promise<CollaborativeSolution> {
    const solutionId = this.generateId('solution');

    const solution: CollaborativeSolution = {
      solution_id: solutionId,
      problem,
      proposed_solutions: new Map(),
      consensus_score: 0,
      contributors: []
    };

    logger.info('[Collaborative Intelligence] Starting collaborative problem-solving', {
      solution_id: solutionId,
      problem: problem.substring(0, 100)
    });

    // Get proposals from all agents
    for (const [agentId, agent] of this.agents) {
      const proposal = await this.getAgentProposal(agent, problem, context);

      solution.proposed_solutions.set(agentId, proposal);
      solution.contributors.push(agentId);
    }

    // Agents vote on each other's solutions
    await this.conductVoting(solution);

    // Select best solution
    this.selectBestSolution(solution);

    this.solutions.set(solutionId, solution);

    logger.info('[Collaborative Intelligence] Collaborative solution complete', {
      solution_id: solutionId,
      proposals: solution.proposed_solutions.size,
      consensus_score: solution.consensus_score,
      selected: solution.selected_solution
    });

    return solution;
  }

  /**
   * Get solution proposal from agent
   */
  private async getAgentProposal(
    agent: Agent,
    problem: string,
    context: any
  ): Promise<ProposedSolution> {
    // In production, would call actual agent
    return {
      agent_id: agent.id,
      solution: `[${agent.name}] Proposed solution using ${agent.capabilities[0]}`,
      pros: ['Pro 1', 'Pro 2'],
      cons: ['Con 1'],
      complexity_score: agent.expertise_level,
      votes: []
    };
  }

  /**
   * Conduct voting among agents
   */
  private async conductVoting(solution: CollaborativeSolution): Promise<void> {
    for (const [voterId, agent] of this.agents) {
      // Each agent votes for best solutions (can vote for multiple)
      for (const [proposalId, proposal] of solution.proposed_solutions) {
        if (proposalId === voterId) continue; // Don't vote for own solution

        // Simulate voting (in production, agent would evaluate)
        const shouldVote = Math.random() > 0.5;

        if (shouldVote) {
          proposal.votes.push(voterId);
        }
      }
    }
  }

  /**
   * Select best solution based on votes and expertise
   */
  private selectBestSolution(solution: CollaborativeSolution): void {
    let bestScore = -1;
    let bestId = '';

    for (const [id, proposal] of solution.proposed_solutions) {
      const agent = this.agents.get(proposal.agent_id);
      const expertiseBonus = agent ? agent.expertise_level * 2 : 0;
      const voteScore = proposal.votes.length * 10;
      const complexityPenalty = proposal.complexity_score * 2;

      const score = voteScore + expertiseBonus - complexityPenalty;

      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    }

    solution.selected_solution = bestId;
    solution.consensus_score = Math.min(100, Math.round(bestScore));
  }

  /**
   * Verify solution created by another agent
   */
  public async verifySolution(
    verifierAgentId: string,
    solutionCode: string,
    criteria: string[]
  ): Promise<VerificationResult> {
    const agent = this.agents.get(verifierAgentId);
    if (!agent) {
      throw new Error(`Verifier agent not found: ${verifierAgentId}`);
    }

    logger.info('[Collaborative Intelligence] Verifying solution', {
      verifier: agent.name,
      criteria_count: criteria.length,
      code_length: solutionCode.length
    });

    // In production, would call actual agent for verification
    const issues: string[] = [];
    const passed = Math.random() > 0.3; // Simulate 70% pass rate

    if (!passed) {
      issues.push('Type safety issue detected');
      issues.push('Missing error handling');
    }

    return {
      verifier_agent_id: verifierAgentId,
      passed,
      issues,
      suggestions: passed ? [] : ['Add input validation', 'Improve error handling'],
      confidence: agent.expertise_level * 10
    };
  }

  /**
   * Generate unique ID
   */
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
}

interface VerificationResult {
  verifier_agent_id: string;
  passed: boolean;
  issues: string[];
  suggestions: string[];
  confidence: number;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default CollaborativeIntelligence;
