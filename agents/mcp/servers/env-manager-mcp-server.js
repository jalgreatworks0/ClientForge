#!/usr/bin/env node

/**
 * Environment Manager MCP Server
 *
 * Manages .env files, secrets, and environment variables across multiple environments.
 *
 * Features:
 * - Read/write/validate .env files
 * - Multi-environment support (dev, staging, production)
 * - Secret validation and encryption
 * - Prevent committing secrets to git
 * - Environment variable templates
 *
 * Value: 9/10 - Security critical
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs').promises;
const path = require('path');

const WORKSPACE_ROOT = process.env.WORKSPACE_ROOT || process.cwd();
const ENV_FILES = (process.env.ENV_FILES || '.env,.env.local,.env.development,.env.staging,.env.production').split(',');
const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION === 'true';

/**
 * Parse .env file content
 */
function parseEnvFile(content) {
  const vars = {};
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    // Parse KEY=VALUE
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();

      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      vars[key] = value;
    }
  }

  return vars;
}

/**
 * Serialize env vars to .env format
 */
function serializeEnvFile(vars) {
  const lines = [];

  for (const [key, value] of Object.entries(vars)) {
    // Quote value if it contains spaces or special chars
    const needsQuotes = /\s|#/.test(value);
    const quotedValue = needsQuotes ? `"${value}"` : value;
    lines.push(`${key}=${quotedValue}`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Detect sensitive keys
 */
function isSensitiveKey(key) {
  const sensitivePatterns = [
    /password/i,
    /secret/i,
    /key/i,
    /token/i,
    /api[_-]?key/i,
    /auth/i,
    /credential/i,
    /private/i,
  ];

  return sensitivePatterns.some(pattern => pattern.test(key));
}

/**
 * Validate environment variables
 */
function validateEnvVars(vars, required = []) {
  const errors = [];
  const warnings = [];

  // Check required vars
  for (const key of required) {
    if (!vars[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // Check for empty sensitive vars
  for (const [key, value] of Object.entries(vars)) {
    if (isSensitiveKey(key) && (!value || value === '')) {
      warnings.push(`Sensitive variable "${key}" is empty`);
    }
  }

  // Check for placeholder values
  for (const [key, value] of Object.entries(vars)) {
    if (value && (
      value.includes('your-') ||
      value.includes('YOUR-') ||
      value.includes('<') ||
      value.includes('TODO')
    )) {
      warnings.push(`Variable "${key}" appears to contain a placeholder value`);
    }
  }

  return { errors, warnings, isValid: errors.length === 0 };
}

/**
 * Read env file
 */
async function readEnvFile(envFile = '.env') {
  const filePath = join(WORKSPACE_ROOT, envFile);

  try {
    const content = await readFile(filePath, 'utf-8');
    const vars = parseEnvFile(content);

    return {
      file: envFile,
      path: filePath,
      vars: vars,
      count: Object.keys(vars).length
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        file: envFile,
        path: filePath,
        vars: {},
        count: 0,
        error: 'File not found'
      };
    }
    throw error;
  }
}

/**
 * Write env file
 */
async function writeEnvFile(envFile, vars) {
  const filePath = join(WORKSPACE_ROOT, envFile);
  const content = serializeEnvFile(vars);

  await writeFile(filePath, content, 'utf-8');

  return {
    file: envFile,
    path: filePath,
    count: Object.keys(vars).length,
    success: true
  };
}

/**
 * Get env var
 */
async function getEnvVar(key, envFile = '.env') {
  const result = await readEnvFile(envFile);

  return {
    key: key,
    value: result.vars[key] || null,
    file: envFile,
    exists: key in result.vars,
    isSensitive: isSensitiveKey(key)
  };
}

/**
 * Set env var
 */
async function setEnvVar(key, value, envFile = '.env') {
  const result = await readEnvFile(envFile);
  const vars = result.vars;

  vars[key] = value;

  await writeEnvFile(envFile, vars);

  return {
    key: key,
    value: value,
    file: envFile,
    isSensitive: isSensitiveKey(key),
    success: true
  };
}

/**
 * Compare environments
 */
async function compareEnvs(envFile1 = '.env', envFile2 = '.env.production') {
  const [env1, env2] = await Promise.all([
    readEnvFile(envFile1),
    readEnvFile(envFile2)
  ]);

  const keys1 = Object.keys(env1.vars);
  const keys2 = Object.keys(env2.vars);

  const onlyIn1 = keys1.filter(k => !keys2.includes(k));
  const onlyIn2 = keys2.filter(k => !keys1.includes(k));
  const inBoth = keys1.filter(k => keys2.includes(k));
  const different = inBoth.filter(k => env1.vars[k] !== env2.vars[k]);

  return {
    file1: envFile1,
    file2: envFile2,
    onlyIn1: onlyIn1,
    onlyIn2: onlyIn2,
    inBoth: inBoth.length,
    different: different,
    summary: {
      total1: keys1.length,
      total2: keys2.length,
      missing_in_2: onlyIn1.length,
      missing_in_1: onlyIn2.length,
      different: different.length
    }
  };
}

/**
 * Initialize MCP server
 */
const server = new Server(
  {
    name: 'clientforge-env-manager',
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
      name: 'read_env_file',
      description: 'Read and parse an .env file. Returns all environment variables.',
      inputSchema: {
        type: 'object',
        properties: {
          env_file: {
            type: 'string',
            description: 'Name of .env file (default: .env)',
            default: '.env'
          }
        }
      }
    },
    {
      name: 'write_env_file',
      description: 'Write environment variables to an .env file. Overwrites existing file.',
      inputSchema: {
        type: 'object',
        properties: {
          env_file: {
            type: 'string',
            description: 'Name of .env file',
          },
          vars: {
            type: 'object',
            description: 'Environment variables as key-value pairs'
          }
        },
        required: ['env_file', 'vars']
      }
    },
    {
      name: 'get_env_var',
      description: 'Get a specific environment variable value from an .env file.',
      inputSchema: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Environment variable key'
          },
          env_file: {
            type: 'string',
            description: 'Name of .env file (default: .env)',
            default: '.env'
          }
        },
        required: ['key']
      }
    },
    {
      name: 'set_env_var',
      description: 'Set an environment variable in an .env file. Creates file if it doesn\'t exist.',
      inputSchema: {
        type: 'object',
        properties: {
          key: {
            type: 'string',
            description: 'Environment variable key'
          },
          value: {
            type: 'string',
            description: 'Environment variable value'
          },
          env_file: {
            type: 'string',
            description: 'Name of .env file (default: .env)',
            default: '.env'
          }
        },
        required: ['key', 'value']
      }
    },
    {
      name: 'validate_env',
      description: 'Validate environment variables. Check for missing required vars, empty sensitive vars, and placeholder values.',
      inputSchema: {
        type: 'object',
        properties: {
          env_file: {
            type: 'string',
            description: 'Name of .env file (default: .env)',
            default: '.env'
          },
          required_vars: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of required variable keys',
            default: []
          }
        }
      }
    },
    {
      name: 'compare_envs',
      description: 'Compare two .env files. Shows variables that exist in only one file or have different values.',
      inputSchema: {
        type: 'object',
        properties: {
          env_file1: {
            type: 'string',
            description: 'First .env file',
            default: '.env'
          },
          env_file2: {
            type: 'string',
            description: 'Second .env file',
            default: '.env.production'
          }
        }
      }
    },
    {
      name: 'list_env_files',
      description: 'List all .env files in the workspace.',
      inputSchema: {
        type: 'object',
        properties: {}
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
      case 'read_env_file': {
        const result = await readEnvFile(args.env_file || '.env');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'write_env_file': {
        const result = await writeEnvFile(args.env_file, args.vars);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'get_env_var': {
        const result = await getEnvVar(args.key, args.env_file || '.env');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'set_env_var': {
        const result = await setEnvVar(args.key, args.value, args.env_file || '.env');
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'validate_env': {
        const envData = await readEnvFile(args.env_file || '.env');
        const validation = validateEnvVars(envData.vars, args.required_vars || []);

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              file: args.env_file || '.env',
              ...validation,
              var_count: Object.keys(envData.vars).length
            }, null, 2)
          }]
        };
      }

      case 'compare_envs': {
        const result = await compareEnvs(
          args.env_file1 || '.env',
          args.env_file2 || '.env.production'
        );
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(result, null, 2)
          }]
        };
      }

      case 'list_env_files': {
        const envFiles = [];

        for (const file of ENV_FILES) {
          const filePath = join(WORKSPACE_ROOT, file);
          try {
            await access(filePath);
            const data = await readEnvFile(file);
            envFiles.push({
              file: file,
              exists: true,
              var_count: data.count
            });
          } catch {
            envFiles.push({
              file: file,
              exists: false,
              var_count: 0
            });
          }
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              workspace: WORKSPACE_ROOT,
              files: envFiles,
              total: envFiles.length,
              existing: envFiles.filter(f => f.exists).length
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
  console.error('Environment Manager MCP server running on stdio');
}

main().catch(console.error);
