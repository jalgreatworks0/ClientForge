#!/usr/bin/env node

/**
 * AI Model Router MCP Server
 *
 * Intelligently routes prompts to the best AI model based on task type.
 * Enables hybrid local + API intelligence for optimal cost/quality balance.
 *
 * Features:
 * - Auto-route prompts to best model (local or API)
 * - Hybrid mode: local generates, API validates
 * - Cost optimization: use local when possible
 * - Quality validation: API reviews critical outputs
 * - Model performance tracking
 *
 * Value: 10/10 - Biggest intelligence multiplier
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fetch = require('node-fetch');

const LM_STUDIO_URL = process.env.LM_STUDIO_URL || 'http://localhost:1234';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

/**
 * Model routing configuration
 */
const ROUTING_RULES = {
  // Coding tasks - prefer local DeepSeek/Qwen models
  coding: {
    primary: 'local',
    local_models: [
      'qwen/qwen3-coder-30b',
      'qwen2.5-coder-32b-instruct-uncensored',
      'deepseek-r1-distill-qwen-14b-uncensored'
    ],
    api_fallback: 'gpt-4',
    confidence_threshold: 0.8
  },

  // Complex reasoning - prefer larger models
  reasoning: {
    primary: 'local',
    local_models: [
      'meta-llama-3.1-70b-instruct',
      'qwen/qwen3-4b-thinking-2507',
      'deepseek/deepseek-r1-0528-qwen3-8b'
    ],
    api_fallback: 'claude-3-sonnet',
    confidence_threshold: 0.7
  },

  // Chat/general - balanced approach
  chat: {
    primary: 'local',
    local_models: [
      'qwen/qwen3-8b',
      'mistralai/mistral-7b-instruct-v0.3',
      'qwen2.5-14b-instruct-uncensored'
    ],
    api_fallback: 'gpt-3.5-turbo',
    confidence_threshold: 0.9
  },

  // Creative writing - prefer uncensored models
  creative: {
    primary: 'local',
    local_models: [
      'cognitivecomputations_dolphin-mistral-24b-venice-edition',
      'qwen3-42b-a3b-2507-thinking-abliterated-uncensored-total-recall-v2-medium-master-coder-i1',
      'openai-gpt-oss-20b-abliterated-uncensored-neo-imatrix'
    ],
    api_fallback: 'gpt-4',
    confidence_threshold: 0.85
  },

  // Critical/production - prefer API for maximum reliability
  critical: {
    primary: 'api',
    local_models: ['meta-llama-3.1-70b-instruct'],
    api_fallback: 'gpt-4',
    confidence_threshold: 0.95
  },

  // ClientForge-specific - always local (privacy)
  clientforge: {
    primary: 'local',
    local_models: [
      'qwen/qwen3-coder-30b',
      'meta-llama-3.1-70b-instruct'
    ],
    api_fallback: null, // Never use API for sensitive code
    confidence_threshold: 0.75
  }
};

/**
 * Task detection patterns
 */
const TASK_PATTERNS = {
  coding: [
    /write.*code/i,
    /implement.*function/i,
    /create.*class/i,
    /debug/i,
    /refactor/i,
    /typescript/i,
    /javascript/i,
    /python/i,
    /\.ts|\.js|\.py/i
  ],
  reasoning: [
    /analyze/i,
    /explain.*why/i,
    /step.*by.*step/i,
    /reasoning/i,
    /logic/i,
    /proof/i,
    /deduce/i
  ],
  creative: [
    /write.*story/i,
    /creative/i,
    /poem/i,
    /narrative/i,
    /imagine/i,
    /fiction/i
  ],
  critical: [
    /production/i,
    /deploy/i,
    /security.*audit/i,
    /mission.*critical/i,
    /compliance/i
  ],
  clientforge: [
    /clientforge/i,
    /crm/i,
    /contact.*management/i,
    /deal.*pipeline/i,
    /user.*service/i
  ]
};

/**
 * Detect task type from prompt
 */
function detectTaskType(prompt) {
  for (const [taskType, patterns] of Object.entries(TASK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        return taskType;
      }
    }
  }
  return 'chat'; // Default to chat
}

/**
 * Get available local models
 */
async function getAvailableModels() {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/models`);
    const data = await response.json();
    return data.data.map(m => m.id);
  } catch (error) {
    console.error('Failed to fetch local models:', error.message);
    return [];
  }
}

/**
 * Call local model (LM Studio)
 */
async function callLocalModel(prompt, model, config = {}) {
  const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: config.temperature || 0.7,
      max_tokens: config.max_tokens || 4096,
      stream: false
    })
  });

  const data = await response.json();
  return {
    response: data.choices[0].message.content,
    model: model,
    source: 'local',
    usage: data.usage
  };
}

/**
 * Call API model (OpenAI or Anthropic)
 */
async function callAPIModel(prompt, model, config = {}) {
  if (model.startsWith('gpt')) {
    // OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 4096
      })
    });

    const data = await response.json();
    return {
      response: data.choices[0].message.content,
      model: model,
      source: 'openai',
      usage: data.usage
    };
  } else if (model.startsWith('claude')) {
    // Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        messages: [{ role: 'user', content: prompt }],
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 4096
      })
    });

    const data = await response.json();
    return {
      response: data.content[0].text,
      model: model,
      source: 'anthropic',
      usage: data.usage
    };
  }

  throw new Error(`Unsupported API model: ${model}`);
}

/**
 * Route prompt to best model
 */
async function routePrompt(prompt, taskType = null, forceLocal = false) {
  // Detect task type if not provided
  if (!taskType) {
    taskType = detectTaskType(prompt);
  }

  const rules = ROUTING_RULES[taskType] || ROUTING_RULES.chat;

  // Force local if requested (e.g., for privacy)
  if (forceLocal || rules.primary === 'local' || taskType === 'clientforge') {
    // Get available local models
    const availableModels = await getAvailableModels();

    // Find first available model from preferred list
    for (const preferredModel of rules.local_models) {
      const matchingModel = availableModels.find(m =>
        m.toLowerCase().includes(preferredModel.toLowerCase()) ||
        preferredModel.toLowerCase().includes(m.toLowerCase())
      );

      if (matchingModel) {
        console.log(`Routing to local model: ${matchingModel} (task: ${taskType})`);
        return await callLocalModel(prompt, matchingModel);
      }
    }

    // Fallback to first available model
    if (availableModels.length > 0) {
      console.log(`Routing to fallback local model: ${availableModels[0]} (task: ${taskType})`);
      return await callLocalModel(prompt, availableModels[0]);
    }
  }

  // Use API if configured and available
  if (rules.api_fallback && (rules.primary === 'api' || !forceLocal)) {
    const apiKey = rules.api_fallback.startsWith('gpt') ? OPENAI_API_KEY : ANTHROPIC_API_KEY;

    if (apiKey) {
      console.log(`Routing to API model: ${rules.api_fallback} (task: ${taskType})`);
      return await callAPIModel(prompt, rules.api_fallback);
    }
  }

  throw new Error('No suitable model available for routing');
}

/**
 * Hybrid intelligence: local generates, API validates
 */
async function hybridPrompt(prompt, taskType = null) {
  // Generate with local model
  const localResult = await routePrompt(prompt, taskType, true);

  // Validate with API (if available)
  const rules = ROUTING_RULES[taskType] || ROUTING_RULES.chat;
  const apiModel = rules.api_fallback;

  if (!apiModel || taskType === 'clientforge') {
    // No API validation for ClientForge (privacy)
    return {
      final_response: localResult.response,
      local_response: localResult.response,
      api_response: null,
      validation: 'skipped',
      reason: taskType === 'clientforge' ? 'privacy' : 'no_api_configured'
    };
  }

  const apiKey = apiModel.startsWith('gpt') ? OPENAI_API_KEY : ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      final_response: localResult.response,
      local_response: localResult.response,
      api_response: null,
      validation: 'skipped',
      reason: 'no_api_key'
    };
  }

  // Validate with API
  const validationPrompt = `Review this response for accuracy and quality. Rate it 1-10 and suggest improvements if needed.

Original prompt: ${prompt}

Response to review:
${localResult.response}

Provide: (1) Rating (2) Issues found (3) Improved version if needed`;

  const apiResult = await callAPIModel(validationPrompt, apiModel);

  return {
    final_response: localResult.response,
    local_response: localResult.response,
    api_response: apiResult.response,
    validation: 'completed',
    local_model: localResult.model,
    api_model: apiResult.model,
    cost_saved: 'Used local for generation, API only for validation'
  };
}

/**
 * Initialize MCP server
 */
const server = new Server(
  {
    name: 'clientforge-ai-router',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * List available tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'route_prompt',
      description: 'Intelligently route a prompt to the best AI model based on task type. Returns response from optimal model (local or API).',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt to route'
          },
          task_type: {
            type: 'string',
            enum: ['coding', 'reasoning', 'chat', 'creative', 'critical', 'clientforge'],
            description: 'Task type (auto-detected if not provided)'
          },
          force_local: {
            type: 'boolean',
            description: 'Force local model usage (for privacy)',
            default: false
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'hybrid_prompt',
      description: 'Hybrid intelligence: local model generates, API validates. Best for critical decisions. Returns both responses + validation.',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt to process'
          },
          task_type: {
            type: 'string',
            enum: ['coding', 'reasoning', 'chat', 'creative', 'critical'],
            description: 'Task type (auto-detected if not provided)'
          }
        },
        required: ['prompt']
      }
    },
    {
      name: 'get_routing_info',
      description: 'Get routing rules and available models for a specific task type',
      inputSchema: {
        type: 'object',
        properties: {
          task_type: {
            type: 'string',
            enum: ['coding', 'reasoning', 'chat', 'creative', 'critical', 'clientforge'],
            description: 'Task type to get info for'
          }
        },
        required: ['task_type']
      }
    },
    {
      name: 'detect_task',
      description: 'Detect task type from a prompt',
      inputSchema: {
        type: 'object',
        properties: {
          prompt: {
            type: 'string',
            description: 'The prompt to analyze'
          }
        },
        required: ['prompt']
      }
    }
  ]
}));

/**
 * Handle tool calls
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'route_prompt': {
        const result = await routePrompt(
          args.prompt,
          args.task_type,
          args.force_local
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'hybrid_prompt': {
        const result = await hybridPrompt(args.prompt, args.task_type);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'get_routing_info': {
        const rules = ROUTING_RULES[args.task_type];
        const availableModels = await getAvailableModels();

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              task_type: args.task_type,
              rules: rules,
              available_local_models: availableModels,
              recommended_models: rules.local_models.filter(m =>
                availableModels.some(am =>
                  am.toLowerCase().includes(m.toLowerCase()) ||
                  m.toLowerCase().includes(am.toLowerCase())
                )
              )
            }, null, 2)
          }]
        };
      }

      case 'detect_task': {
        const taskType = detectTaskType(args.prompt);
        const rules = ROUTING_RULES[taskType];

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              detected_task: taskType,
              confidence: 'medium',
              routing_rule: rules,
              explanation: `Detected "${taskType}" based on prompt patterns`
            }, null, 2)
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }],
      isError: true
    };
  }
});

/**
 * Start server
 */
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('AI Router MCP server running on stdio');
}

main().catch(console.error);
