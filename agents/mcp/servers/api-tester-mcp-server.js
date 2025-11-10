#!/usr/bin/env node

/**
 * API Tester MCP Server
 *
 * HTTP client for testing API endpoints, external APIs, and webhooks.
 *
 * Features:
 * - Make HTTP requests (GET, POST, PUT, PATCH, DELETE)
 * - Test ClientForge API endpoints
 * - Call external APIs (OpenAI, Stripe, SendGrid, etc.)
 * - Webhook simulation
 * - Response validation
 * - Save/replay requests
 *
 * Value: 9/10 - Essential for API development
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();
const DEFAULT_BASE_URL = process.env.DEFAULT_BASE_URL || 'http://localhost:3000';
const TIMEOUT_MS = parseInt(process.env.TIMEOUT_MS || '30000');
const SAVE_RESPONSES = process.env.SAVE_RESPONSES === 'true';

/**
 * Make HTTP request
 */
async function makeRequest(method, url, options = {}) {
  const {
    headers = {},
    body = null,
    timeout = TIMEOUT_MS,
    followRedirects = true
  } = options;

  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const fetchOptions = {
      method: method.toUpperCase(),
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      signal: controller.signal,
      redirect: followRedirects ? 'follow' : 'manual'
    };

    if (body && ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    const duration = Date.now() - startTime;
    const contentType = response.headers.get('content-type');

    let responseBody;
    if (contentType && contentType.includes('application/json')) {
      responseBody = await response.json();
    } else {
      responseBody = await response.text();
    }

    return {
      success: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody,
      duration: duration,
      url: response.url,
      redirected: response.redirected
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'Request timeout',
        duration: duration,
        timeout: timeout
      };
    }

    return {
      success: false,
      error: error.message,
      duration: duration
    };
  }
}

/**
 * Test API endpoint
 */
async function testEndpoint(method, endpoint, options = {}) {
  const {
    baseUrl = DEFAULT_BASE_URL,
    headers = {},
    body = null,
    expectedStatus = null,
    validateResponse = null
  } = options;

  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const result = await makeRequest(method, url, { headers, body });

  const validation = {
    statusMatch: expectedStatus ? result.status === expectedStatus : true,
    responseValid: true,
    errors: []
  };

  if (expectedStatus && result.status !== expectedStatus) {
    validation.errors.push(`Expected status ${expectedStatus}, got ${result.status}`);
  }

  if (validateResponse && result.body) {
    try {
      const validator = new Function('body', validateResponse);
      const valid = validator(result.body);
      if (!valid) {
        validation.responseValid = false;
        validation.errors.push('Response validation failed');
      }
    } catch (error) {
      validation.responseValid = false;
      validation.errors.push(`Validation error: ${error.message}`);
    }
  }

  return {
    ...result,
    validation: validation,
    testPassed: validation.errors.length === 0
  };
}

/**
 * Call external API
 */
async function callExternalAPI(service, options = {}) {
  const apis = {
    openai: {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: (apiKey) => ({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }),
      body: (opts) => ({
        model: opts.model || 'gpt-3.5-turbo',
        messages: opts.messages || [{ role: 'user', content: opts.prompt }],
        temperature: opts.temperature || 0.7,
        max_tokens: opts.max_tokens || 1000
      })
    },
    anthropic: {
      url: 'https://api.anthropic.com/v1/messages',
      headers: (apiKey) => ({
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }),
      body: (opts) => ({
        model: opts.model || 'claude-3-sonnet-20240229',
        messages: opts.messages || [{ role: 'user', content: opts.prompt }],
        max_tokens: opts.max_tokens || 1000
      })
    },
    stripe: {
      url: (endpoint) => `https://api.stripe.com/v1/${endpoint}`,
      headers: (apiKey) => ({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      })
    },
    sendgrid: {
      url: 'https://api.sendgrid.com/v3/mail/send',
      headers: (apiKey) => ({
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      })
    }
  };

  const api = apis[service.toLowerCase()];
  if (!api) {
    throw new Error(`Unknown API service: ${service}`);
  }

  const url = typeof api.url === 'function' ? api.url(options.endpoint) : api.url;
  const headers = api.headers(options.apiKey);
  const body = api.body ? api.body(options) : options.body;

  return await makeRequest('POST', url, { headers, body });
}

/**
 * Simulate webhook
 */
async function simulateWebhook(webhookUrl, event, payload, options = {}) {
  const {
    secret = null,
    signatureHeader = 'X-Webhook-Signature',
    timestamp = Date.now()
  } = options;

  const headers = {
    'Content-Type': 'application/json',
    'X-Event-Type': event,
    'X-Timestamp': timestamp.toString()
  };

  // Add signature if secret provided
  if (secret) {
    // Simple HMAC-like signature (simplified for demo)
    const crypto = await import('crypto');
    const signature = crypto.createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    headers[signatureHeader] = signature;
  }

  const body = {
    event: event,
    timestamp: timestamp,
    data: payload
  };

  return await makeRequest('POST', webhookUrl, { headers, body });
}

/**
 * Save response
 */
async function saveResponse(name, response) {
  if (!SAVE_RESPONSES) {
    return { saved: false, reason: 'SAVE_RESPONSES is disabled' };
  }

  const responsesDir = join(WORKSPACE_ROOT, '.api-responses');
  await mkdir(responsesDir, { recursive: true });

  const filename = `${name}-${Date.now()}.json`;
  const filepath = join(responsesDir, filename);

  await writeFile(filepath, JSON.stringify(response, null, 2), 'utf-8');

  return {
    saved: true,
    path: filepath,
    filename: filename
  };
}

/**
 * Initialize MCP server
 */
const server = new Server(
  {
    name: 'clientforge-api-tester',
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
      name: 'http_request',
      description: 'Make an HTTP request to any URL. Supports GET, POST, PUT, PATCH, DELETE.',
      inputSchema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            description: 'HTTP method'
          },
          url: {
            type: 'string',
            description: 'Full URL to request'
          },
          headers: {
            type: 'object',
            description: 'HTTP headers (optional)'
          },
          body: {
            type: 'object',
            description: 'Request body for POST/PUT/PATCH (optional)'
          }
        },
        required: ['method', 'url']
      }
    },
    {
      name: 'test_endpoint',
      description: 'Test an API endpoint with validation. Checks response status and validates response body.',
      inputSchema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
            description: 'HTTP method'
          },
          endpoint: {
            type: 'string',
            description: 'API endpoint path (e.g., /api/users)'
          },
          base_url: {
            type: 'string',
            description: 'Base URL (default: http://localhost:3000)'
          },
          headers: {
            type: 'object',
            description: 'HTTP headers (optional)'
          },
          body: {
            type: 'object',
            description: 'Request body (optional)'
          },
          expected_status: {
            type: 'number',
            description: 'Expected HTTP status code (optional)'
          }
        },
        required: ['method', 'endpoint']
      }
    },
    {
      name: 'call_external_api',
      description: 'Call external APIs like OpenAI, Anthropic, Stripe, SendGrid. Handles authentication and formatting.',
      inputSchema: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            enum: ['openai', 'anthropic', 'stripe', 'sendgrid'],
            description: 'API service to call'
          },
          api_key: {
            type: 'string',
            description: 'API key for authentication'
          },
          prompt: {
            type: 'string',
            description: 'Prompt for AI models (openai, anthropic)'
          },
          model: {
            type: 'string',
            description: 'Model name (optional)'
          },
          endpoint: {
            type: 'string',
            description: 'Specific endpoint for Stripe'
          },
          body: {
            type: 'object',
            description: 'Custom request body'
          }
        },
        required: ['service', 'api_key']
      }
    },
    {
      name: 'simulate_webhook',
      description: 'Simulate a webhook request with event, payload, and optional signature.',
      inputSchema: {
        type: 'object',
        properties: {
          webhook_url: {
            type: 'string',
            description: 'Webhook URL to send to'
          },
          event: {
            type: 'string',
            description: 'Event type (e.g., user.created, payment.success)'
          },
          payload: {
            type: 'object',
            description: 'Webhook payload data'
          },
          secret: {
            type: 'string',
            description: 'Secret for signing webhook (optional)'
          }
        },
        required: ['webhook_url', 'event', 'payload']
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
      case 'http_request': {
        const result = await makeRequest(args.method, args.url, {
          headers: args.headers,
          body: args.body
        });

        if (SAVE_RESPONSES) {
          await saveResponse(`http-${args.method.toLowerCase()}`, result);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'test_endpoint': {
        const result = await testEndpoint(args.method, args.endpoint, {
          baseUrl: args.base_url,
          headers: args.headers,
          body: args.body,
          expectedStatus: args.expected_status
        });

        if (SAVE_RESPONSES) {
          await saveResponse(`test-${args.endpoint.replace(/\//g, '-')}`, result);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'call_external_api': {
        const result = await callExternalAPI(args.service, args);

        if (SAVE_RESPONSES) {
          await saveResponse(`${args.service}-api`, result);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'simulate_webhook': {
        const result = await simulateWebhook(
          args.webhook_url,
          args.event,
          args.payload,
          { secret: args.secret }
        );

        if (SAVE_RESPONSES) {
          await saveResponse(`webhook-${args.event}`, result);
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
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
  console.error('API Tester MCP server running on stdio');
}

main().catch(console.error);
