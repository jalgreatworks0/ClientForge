/**
 * Configuration Validation for Elaria Command Center
 * Location: D:\clientforge-crm\agents\elaria_command_center\src\utils/config-validator.js
 * Purpose: Validate configuration objects to prevent runtime errors
 */

import { validateModelIdentifier } from './security.js';

/**
 * Validation error class
 */
export class ConfigValidationError extends Error {
  constructor(message, field = null) {
    super(message);
    this.name = 'ConfigValidationError';
    this.field = field;
  }
}

/**
 * Validate LM Studio configuration
 */
export function validateLMStudioConfig(config) {
  const errors = [];

  // Base URL
  if (config.baseUrl) {
    if (typeof config.baseUrl !== 'string') {
      errors.push({ field: 'baseUrl', message: 'Must be a string' });
    } else if (!config.baseUrl.startsWith('ws://') && !config.baseUrl.startsWith('wss://')) {
      errors.push({ field: 'baseUrl', message: 'Must be a WebSocket URL (ws:// or wss://)' });
    }
  }

  // Model name
  if (config.modelName) {
    try {
      validateModelIdentifier(config.modelName);
    } catch (error) {
      errors.push({ field: 'modelName', message: error.message });
    }
  }

  // Temperature
  if (config.temperature !== undefined) {
    if (typeof config.temperature !== 'number') {
      errors.push({ field: 'temperature', message: 'Must be a number' });
    } else if (config.temperature < 0 || config.temperature > 2) {
      errors.push({ field: 'temperature', message: 'Must be between 0 and 2' });
    }
  }

  // Max tokens
  if (config.maxTokens !== undefined) {
    if (!Number.isInteger(config.maxTokens)) {
      errors.push({ field: 'maxTokens', message: 'Must be an integer' });
    } else if (config.maxTokens < 1 || config.maxTokens > 1000000) {
      errors.push({ field: 'maxTokens', message: 'Must be between 1 and 1,000,000' });
    }
  }

  // Timeout
  if (config.timeout !== undefined) {
    if (!Number.isInteger(config.timeout)) {
      errors.push({ field: 'timeout', message: 'Must be an integer' });
    } else if (config.timeout < 1000 || config.timeout > 600000) {
      errors.push({ field: 'timeout', message: 'Must be between 1,000ms and 600,000ms (10 minutes)' });
    }
  }

  if (errors.length > 0) {
    const message = `LM Studio configuration validation failed:\n${errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`;
    throw new ConfigValidationError(message);
  }

  return true;
}

/**
 * Validate MCP configuration
 */
export function validateMCPConfig(config) {
  const errors = [];

  // WebSocket URL
  if (config.wsUrl) {
    if (typeof config.wsUrl !== 'string') {
      errors.push({ field: 'wsUrl', message: 'Must be a string' });
    } else if (!config.wsUrl.startsWith('ws://') && !config.wsUrl.startsWith('wss://')) {
      errors.push({ field: 'wsUrl', message: 'Must be a WebSocket URL (ws:// or wss://)' });
    }
  }

  // Agent ID
  if (config.agentId) {
    if (typeof config.agentId !== 'string') {
      errors.push({ field: 'agentId', message: 'Must be a string' });
    } else if (!/^[a-z0-9-]+$/.test(config.agentId)) {
      errors.push({ field: 'agentId', message: 'Must contain only lowercase letters, numbers, and hyphens' });
    }
  }

  // Max reconnect attempts
  if (config.maxReconnectAttempts !== undefined) {
    if (!Number.isInteger(config.maxReconnectAttempts)) {
      errors.push({ field: 'maxReconnectAttempts', message: 'Must be an integer' });
    } else if (config.maxReconnectAttempts < 1 || config.maxReconnectAttempts > 100) {
      errors.push({ field: 'maxReconnectAttempts', message: 'Must be between 1 and 100' });
    }
  }

  // Reconnect delay
  if (config.initialReconnectDelay !== undefined) {
    if (!Number.isInteger(config.initialReconnectDelay)) {
      errors.push({ field: 'initialReconnectDelay', message: 'Must be an integer' });
    } else if (config.initialReconnectDelay < 100 || config.initialReconnectDelay > 60000) {
      errors.push({ field: 'initialReconnectDelay', message: 'Must be between 100ms and 60,000ms' });
    }
  }

  // Max reconnect delay
  if (config.maxReconnectDelay !== undefined) {
    if (!Number.isInteger(config.maxReconnectDelay)) {
      errors.push({ field: 'maxReconnectDelay', message: 'Must be an integer' });
    } else if (config.maxReconnectDelay < 1000 || config.maxReconnectDelay > 300000) {
      errors.push({ field: 'maxReconnectDelay', message: 'Must be between 1,000ms and 300,000ms (5 minutes)' });
    }
  }

  if (errors.length > 0) {
    const message = `MCP configuration validation failed:\n${errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`;
    throw new ConfigValidationError(message);
  }

  return true;
}

/**
 * Validate agent configuration
 */
export function validateAgentConfig(config) {
  const errors = [];

  // Max iterations
  if (config.maxIterations !== undefined) {
    if (!Number.isInteger(config.maxIterations)) {
      errors.push({ field: 'maxIterations', message: 'Must be an integer' });
    } else if (config.maxIterations < 1 || config.maxIterations > 100) {
      errors.push({ field: 'maxIterations', message: 'Must be between 1 and 100' });
    }
  }

  // Tools
  if (config.tools !== undefined) {
    if (!Array.isArray(config.tools)) {
      errors.push({ field: 'tools', message: 'Must be an array' });
    }
  }

  if (errors.length > 0) {
    const message = `Agent configuration validation failed:\n${errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`;
    throw new ConfigValidationError(message);
  }

  return true;
}

/**
 * Validate conversation history configuration
 */
export function validateHistoryConfig(config) {
  const errors = [];

  // Max messages
  if (config.maxMessages !== undefined) {
    if (!Number.isInteger(config.maxMessages)) {
      errors.push({ field: 'maxMessages', message: 'Must be an integer' });
    } else if (config.maxMessages < 1 || config.maxMessages > 1000) {
      errors.push({ field: 'maxMessages', message: 'Must be between 1 and 1,000' });
    }
  }

  // Max tokens
  if (config.maxTokens !== undefined) {
    if (!Number.isInteger(config.maxTokens)) {
      errors.push({ field: 'maxTokens', message: 'Must be an integer' });
    } else if (config.maxTokens < 1000 || config.maxTokens > 10000000) {
      errors.push({ field: 'maxTokens', message: 'Must be between 1,000 and 10,000,000' });
    }
  }

  if (errors.length > 0) {
    const message = `History configuration validation failed:\n${errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`;
    throw new ConfigValidationError(message);
  }

  return true;
}

/**
 * Validate logger configuration
 */
export function validateLoggerConfig(config) {
  const errors = [];

  // Log level
  if (config.level !== undefined) {
    const validLevels = ['error', 'warn', 'info', 'http', 'debug'];
    if (!validLevels.includes(config.level)) {
      errors.push({ field: 'level', message: `Must be one of: ${validLevels.join(', ')}` });
    }
  }

  // Log directory
  if (config.logDir !== undefined) {
    if (typeof config.logDir !== 'string') {
      errors.push({ field: 'logDir', message: 'Must be a string' });
    }
  }

  // Service name
  if (config.service !== undefined) {
    if (typeof config.service !== 'string') {
      errors.push({ field: 'service', message: 'Must be a string' });
    } else if (!/^[a-z0-9-]+$/.test(config.service)) {
      errors.push({ field: 'service', message: 'Must contain only lowercase letters, numbers, and hyphens' });
    }
  }

  if (errors.length > 0) {
    const message = `Logger configuration validation failed:\n${errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`;
    throw new ConfigValidationError(message);
  }

  return true;
}

/**
 * Validate memory monitor configuration
 */
export function validateMemoryMonitorConfig(config) {
  const errors = [];

  // Warning threshold
  if (config.warningThreshold !== undefined) {
    if (typeof config.warningThreshold !== 'number') {
      errors.push({ field: 'warningThreshold', message: 'Must be a number' });
    } else if (config.warningThreshold < 0 || config.warningThreshold > 1) {
      errors.push({ field: 'warningThreshold', message: 'Must be between 0 and 1' });
    }
  }

  // Critical threshold
  if (config.criticalThreshold !== undefined) {
    if (typeof config.criticalThreshold !== 'number') {
      errors.push({ field: 'criticalThreshold', message: 'Must be a number' });
    } else if (config.criticalThreshold < 0 || config.criticalThreshold > 1) {
      errors.push({ field: 'criticalThreshold', message: 'Must be between 0 and 1' });
    }
  }

  // Check interval
  if (config.checkInterval !== undefined) {
    if (!Number.isInteger(config.checkInterval)) {
      errors.push({ field: 'checkInterval', message: 'Must be an integer' });
    } else if (config.checkInterval < 1000 || config.checkInterval > 300000) {
      errors.push({ field: 'checkInterval', message: 'Must be between 1,000ms and 300,000ms' });
    }
  }

  if (errors.length > 0) {
    const message = `Memory monitor configuration validation failed:\n${errors.map(e => `  - ${e.field}: ${e.message}`).join('\n')}`;
    throw new ConfigValidationError(message);
  }

  return true;
}

/**
 * Validate all configurations
 */
export function validateAllConfigs(configs) {
  const results = {};

  if (configs.lmStudio) {
    try {
      validateLMStudioConfig(configs.lmStudio);
      results.lmStudio = { valid: true };
    } catch (error) {
      results.lmStudio = { valid: false, error: error.message };
    }
  }

  if (configs.mcp) {
    try {
      validateMCPConfig(configs.mcp);
      results.mcp = { valid: true };
    } catch (error) {
      results.mcp = { valid: false, error: error.message };
    }
  }

  if (configs.agent) {
    try {
      validateAgentConfig(configs.agent);
      results.agent = { valid: true };
    } catch (error) {
      results.agent = { valid: false, error: error.message };
    }
  }

  if (configs.history) {
    try {
      validateHistoryConfig(configs.history);
      results.history = { valid: true };
    } catch (error) {
      results.history = { valid: false, error: error.message };
    }
  }

  if (configs.logger) {
    try {
      validateLoggerConfig(configs.logger);
      results.logger = { valid: true };
    } catch (error) {
      results.logger = { valid: false, error: error.message };
    }
  }

  if (configs.memoryMonitor) {
    try {
      validateMemoryMonitorConfig(configs.memoryMonitor);
      results.memoryMonitor = { valid: true };
    } catch (error) {
      results.memoryMonitor = { valid: false, error: error.message };
    }
  }

  const allValid = Object.values(results).every(r => r.valid);

  return {
    valid: allValid,
    results,
  };
}

export default {
  ConfigValidationError,
  validateLMStudioConfig,
  validateMCPConfig,
  validateAgentConfig,
  validateHistoryConfig,
  validateLoggerConfig,
  validateMemoryMonitorConfig,
  validateAllConfigs,
};
