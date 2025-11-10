/**
 * LM Studio Preset Manager for Elaria
 * Automatically configures inference parameters based on task type
 *
 * Usage:
 *   import { PresetManager } from './preset-manager.js';
 *   const presets = new PresetManager();
 *   const config = await presets.getPreset('coding');
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class PresetManager {
  constructor(configPath = null) {
    this.configPath = configPath || path.join(__dirname, '..', 'lmstudio_presets.json');
    this.presets = {
      coding: {
        temperature: 0.4,
        top_p: 0.9,
        top_k: 40,
        min_p: 0.05,
        repeat_penalty: 1.05,
        max_tokens: 32768,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        description: "Coding (DeepSeek Coder - precise, deterministic)",
        recommended_model: "deepseek-coder-33b",
        system_prompt: "You are an expert software engineer. Provide clean, production-ready code with comments."
      },
      chat: {
        temperature: 0.7,
        top_p: 0.9,
        top_k: 40,
        min_p: 0.05,
        repeat_penalty: 1.1,
        max_tokens: 8192,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        description: "General Chat (balanced, conversational)",
        recommended_model: "llama-3.1-70b",
        system_prompt: "You are a helpful, harmless, and honest AI assistant."
      },
      creative: {
        temperature: 0.9,
        top_p: 0.95,
        top_k: 60,
        min_p: 0.02,
        repeat_penalty: 1.15,
        max_tokens: 16384,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        description: "Creative Writing (diverse, imaginative)",
        recommended_model: "mythomax-l2-13b",
        system_prompt: "You are a creative storyteller with vivid imagination."
      },
      analysis: {
        temperature: 0.5,
        top_p: 0.9,
        top_k: 40,
        min_p: 0.05,
        repeat_penalty: 1.1,
        max_tokens: 65536,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        description: "Document Analysis (structured, detailed)",
        recommended_model: "llama-3.1-70b",
        system_prompt: "You are an analytical expert who provides detailed, structured analysis."
      },
      albedo: {
        temperature: 0.7,
        top_p: 0.92,
        top_k: 40,
        min_p: 0.05,
        repeat_penalty: 1.1,
        max_tokens: 32768,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        description: "Albedo AI Companion (warm, knowledgeable)",
        recommended_model: "llama-3.1-70b",
        system_prompt: "You are Albedo, a sophisticated AI companion with deep technical knowledge and warm personality."
      },
      scrollforge: {
        temperature: 0.4,
        top_p: 0.9,
        top_k: 40,
        min_p: 0.05,
        repeat_penalty: 1.05,
        max_tokens: 32768,
        frequency_penalty: 0.0,
        presence_penalty: 0.0,
        description: "ScrollForge Development (CRM fullstack)",
        recommended_model: "deepseek-coder-33b",
        system_prompt: "You are an expert fullstack developer for React/Node/PostgreSQL CRM systems. You specialize in ClientForge CRM development."
      }
    };
  }

  /**
   * Get preset configuration by name
   * @param {string} presetName - Name of preset (coding, chat, creative, analysis, albedo, scrollforge)
   * @returns {Promise<object>} Preset configuration
   */
  async getPreset(presetName) {
    if (!this.presets[presetName]) {
      throw new Error(`Unknown preset: ${presetName}. Available: ${Object.keys(this.presets).join(', ')}`);
    }

    // Try to load from config file if exists
    try {
      const config = await this.loadConfig();
      if (config && config.presets && config.presets[presetName]) {
        return {
          ...this.presets[presetName],
          ...config.presets[presetName],
          source: 'config_file'
        };
      }
    } catch (error) {
      // Config file doesn't exist, use defaults
    }

    return {
      ...this.presets[presetName],
      source: 'default'
    };
  }

  /**
   * Get current active preset
   * @returns {Promise<object>} Current preset configuration
   */
  async getCurrentPreset() {
    try {
      const config = await this.loadConfig();
      if (config && config.current_preset) {
        return this.getPreset(config.current_preset);
      }
    } catch (error) {
      // No config file, return default
    }

    // Default to 'chat' preset
    return this.getPreset('chat');
  }

  /**
   * Set active preset
   * @param {string} presetName - Name of preset to activate
   */
  async setPreset(presetName) {
    if (!this.presets[presetName]) {
      throw new Error(`Unknown preset: ${presetName}`);
    }

    const config = {
      current_preset: presetName,
      last_updated: new Date().toISOString(),
      presets: this.presets
    };

    await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf8');

    return {
      success: true,
      preset: presetName,
      config: this.presets[presetName]
    };
  }

  /**
   * Load config from file
   * @private
   */
  async loadConfig() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return null;
    }
  }

  /**
   * Get all available presets
   * @returns {object} All presets
   */
  getAllPresets() {
    return { ...this.presets };
  }

  /**
   * Create OpenAI-compatible config for LM Studio
   * @param {string} presetName - Preset to use
   * @param {object} overrides - Override specific parameters
   * @returns {Promise<object>} OpenAI-compatible configuration
   */
  async createLMStudioConfig(presetName, overrides = {}) {
    const preset = await this.getPreset(presetName);

    return {
      model: overrides.model || preset.recommended_model || 'local-model',
      temperature: overrides.temperature ?? preset.temperature,
      top_p: overrides.top_p ?? preset.top_p,
      max_tokens: overrides.max_tokens ?? preset.max_tokens,
      frequency_penalty: overrides.frequency_penalty ?? preset.frequency_penalty,
      presence_penalty: overrides.presence_penalty ?? preset.presence_penalty,
      repeat_penalty: overrides.repeat_penalty ?? preset.repeat_penalty,
      stop: overrides.stop || [],
      stream: overrides.stream ?? true,
      // Extra params for LM Studio
      top_k: overrides.top_k ?? preset.top_k,
      min_p: overrides.min_p ?? preset.min_p
    };
  }

  /**
   * Auto-detect preset based on prompt content
   * @param {string} prompt - User prompt
   * @returns {string} Suggested preset name
   */
  autoDetectPreset(prompt) {
    const lowerPrompt = prompt.toLowerCase();

    // Coding keywords
    if (lowerPrompt.match(/\b(code|function|class|bug|debug|implement|refactor|api|database|sql|react|node)\b/)) {
      return 'coding';
    }

    // Creative keywords
    if (lowerPrompt.match(/\b(write|story|poem|creative|imagine|character|plot|narrative)\b/)) {
      return 'creative';
    }

    // Analysis keywords
    if (lowerPrompt.match(/\b(analyze|analysis|document|report|summary|evaluate|assess)\b/)) {
      return 'analysis';
    }

    // Albedo/companion keywords
    if (lowerPrompt.match(/\b(albedo|companion|feel|think|opinion|personal)\b/)) {
      return 'albedo';
    }

    // ScrollForge/CRM keywords
    if (lowerPrompt.match(/\b(scrollforge|clientforge|crm|customer|deal|pipeline|contact)\b/)) {
      return 'scrollforge';
    }

    // Default to chat
    return 'chat';
  }
}

// Example usage
async function demo() {
  const presets = new PresetManager();

  console.log('\n=== LM Studio Preset Manager ===\n');

  // Get coding preset
  const codingConfig = await presets.createLMStudioConfig('coding');
  console.log('Coding Config:', JSON.stringify(codingConfig, null, 2));

  // Auto-detect preset
  const detectedPreset = presets.autoDetectPreset('Write a function to parse JSON');
  console.log('\nAuto-detected preset:', detectedPreset);

  // Set current preset
  await presets.setPreset('albedo');
  const current = await presets.getCurrentPreset();
  console.log('\nCurrent preset:', current.description);
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch(console.error);
}
