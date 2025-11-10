/**
 * LM Studio Smart Model Switcher
 * Automatically selects the best model for the task
 *
 * Features:
 * - Auto-detect task type (coding, chat, creative, etc.)
 * - Load appropriate model
 * - Fallback to available models
 * - Model performance tracking
 */

import { LMStudioClient } from '@lmstudio/sdk';
import { PresetManager } from './preset-manager.js';

export class ModelSwitcher {
  constructor(baseUrl = 'ws://localhost:1234') {
    this.client = new LMStudioClient({ baseUrl });
    this.presetManager = new PresetManager();
    this.modelPreferences = {
      coding: [
        'deepseek-coder-33b',
        'deepseek-coder-6.7b',
        'codellama-34b',
        'codellama-13b',
        'phind-codellama',
        'wizardcoder'
      ],
      chat: [
        'llama-3.1-70b',
        'llama-3-70b',
        'llama-3.1-8b',
        'mistral-7b',
        'mixtral-8x7b',
        'openchat'
      ],
      creative: [
        'mythomax-l2-13b',
        'llama-3.1-70b',
        'nous-hermes',
        'synthia'
      ],
      analysis: [
        'llama-3.1-70b',
        'mixtral-8x7b',
        'llama-3-70b'
      ],
      albedo: [
        'llama-3.1-70b',
        'llama-3-70b',
        'nous-hermes-13b',
        'mythomax-l2-13b'
      ],
      scrollforge: [
        'deepseek-coder-33b',
        'codellama-34b',
        'phind-codellama-34b',
        'deepseek-coder-6.7b'
      ]
    };
  }

  /**
   * Get all available models from LM Studio
   */
  async getAvailableModels() {
    try {
      const models = await this.client.llm.listDownloadedModels();
      return models.map(model => ({
        path: model.path,
        identifier: model.identifier,
        name: this.extractModelName(model.path || model.identifier),
        size: model.sizeBytes || 0,
        quantization: this.extractQuantization(model.path || model.identifier)
      }));
    } catch (error) {
      console.error('Error listing models:', error);
      return [];
    }
  }

  /**
   * Extract clean model name from path
   */
  extractModelName(path) {
    const filename = path.split('/').pop().split('\\').pop();
    return filename.replace(/\.gguf$/i, '');
  }

  /**
   * Extract quantization level from model name
   */
  extractQuantization(name) {
    const match = name.match(/(Q[2-8]_K_[MSL]|Q[2-8]_0)/i);
    return match ? match[0] : 'unknown';
  }

  /**
   * Find best model for task
   */
  async findBestModel(taskType, preferredQuantization = 'Q5_K_M') {
    const availableModels = await this.getAvailableModels();

    if (availableModels.length === 0) {
      throw new Error('No models available in LM Studio');
    }

    const preferences = this.modelPreferences[taskType] || this.modelPreferences.chat;

    // Try to match preferred models
    for (const preferred of preferences) {
      for (const model of availableModels) {
        const modelNameLower = model.name.toLowerCase();
        const preferredLower = preferred.toLowerCase();

        if (modelNameLower.includes(preferredLower)) {
          // If quantization preference specified, try to match
          if (model.quantization.toLowerCase() === preferredQuantization.toLowerCase()) {
            return {
              ...model,
              matchReason: 'exact_match_with_quantization',
              taskType
            };
          }
          // Otherwise return first match
          return {
            ...model,
            matchReason: 'name_match',
            taskType
          };
        }
      }
    }

    // No preferred model found, return best available
    // Prefer larger models with good quantization
    const sortedModels = availableModels.sort((a, b) => {
      // Prefer Q5/Q6 over Q4
      const quantScore = (q) => {
        if (q.includes('Q6') || q.includes('Q8')) return 3;
        if (q.includes('Q5')) return 2;
        if (q.includes('Q4')) return 1;
        return 0;
      };

      return quantScore(b.quantization) - quantScore(a.quantization) || b.size - a.size;
    });

    return {
      ...sortedModels[0],
      matchReason: 'best_available',
      taskType
    };
  }

  /**
   * Load model for task
   */
  async loadModelForTask(taskType, options = {}) {
    console.log(`Loading model for task: ${taskType}`);

    const model = await this.findBestModel(taskType, options.preferredQuantization);

    console.log(`Selected model: ${model.name} (${model.matchReason})`);

    try {
      const loadedModel = await this.client.llm.load(model.identifier, {
        config: options.config || {},
        onProgress: options.onProgress
      });

      return {
        success: true,
        model,
        loadedModel
      };
    } catch (error) {
      console.error('Error loading model:', error);
      return {
        success: false,
        error: error.message,
        model
      };
    }
  }

  /**
   * Auto-switch model based on prompt
   */
  async autoSwitchForPrompt(prompt, currentModel = null) {
    // Detect task type from prompt
    const taskType = this.presetManager.autoDetectPreset(prompt);

    console.log(`Detected task type: ${taskType}`);

    // Check if current model is suitable
    if (currentModel) {
      const preferences = this.modelPreferences[taskType];
      const currentModelLower = currentModel.toLowerCase();

      const isSuitable = preferences.some(pref =>
        currentModelLower.includes(pref.toLowerCase())
      );

      if (isSuitable) {
        console.log('Current model is suitable for this task');
        return {
          switched: false,
          currentModel,
          taskType
        };
      }
    }

    // Load better model
    const result = await this.loadModelForTask(taskType);

    return {
      switched: true,
      previousModel: currentModel,
      newModel: result.model ? result.model.name : null,
      taskType,
      success: result.success
    };
  }

  /**
   * Get model recommendations for task
   */
  async getRecommendations(taskType) {
    const availableModels = await this.getAvailableModels();
    const preferences = this.modelPreferences[taskType] || [];

    const recommendations = {
      taskType,
      available: [],
      needToDownload: []
    };

    for (const preferred of preferences) {
      const found = availableModels.find(m =>
        m.name.toLowerCase().includes(preferred.toLowerCase())
      );

      if (found) {
        recommendations.available.push({
          name: found.name,
          quantization: found.quantization,
          size: (found.size / (1024 ** 3)).toFixed(2) + ' GB',
          priority: preferences.indexOf(preferred) + 1
        });
      } else {
        recommendations.needToDownload.push({
          name: preferred,
          priority: preferences.indexOf(preferred) + 1,
          reason: `Recommended for ${taskType} tasks`
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate model download suggestions
   */
  async getSuggestedDownloads(hardwareTier = 'mid') {
    const suggestions = {
      high: [
        { name: 'DeepSeek Coder 33B (Q5_K_M)', use: 'coding', vram: '~22GB' },
        { name: 'Llama 3.1 70B (Q5_K_M)', use: 'chat/analysis', vram: '~48GB' },
        { name: 'CodeLlama 34B (Q5_K_M)', use: 'coding', vram: '~23GB' }
      ],
      mid: [
        { name: 'DeepSeek Coder 6.7B (Q5_K_M)', use: 'coding', vram: '~5GB' },
        { name: 'Llama 3.1 8B (Q5_K_M)', use: 'chat', vram: '~6GB' },
        { name: 'Mistral 7B (Q5_K_M)', use: 'general', vram: '~5GB' },
        { name: 'CodeLlama 13B (Q5_K_M)', use: 'coding', vram: '~9GB' }
      ],
      budget: [
        { name: 'DeepSeek Coder 1.3B (Q5_K_M)', use: 'coding', vram: '~1.5GB' },
        { name: 'Llama 3 7B (Q4_K_M)', use: 'chat', vram: '~4GB' },
        { name: 'Mistral 7B (Q4_K_M)', use: 'general', vram: '~4GB' }
      ],
      cpu: [
        { name: 'TinyLlama 1.1B (Q4_K_M)', use: 'general', vram: 'CPU' },
        { name: 'Phi-2 2.7B (Q3_K_M)', use: 'coding', vram: 'CPU' }
      ]
    };

    return suggestions[hardwareTier] || suggestions.mid;
  }
}

// Example usage
async function demo() {
  console.log('\n=== LM Studio Model Switcher ===\n');

  const switcher = new ModelSwitcher();

  // List available models
  console.log('Available Models:');
  const models = await switcher.getAvailableModels();
  models.forEach((model, i) => {
    console.log(`${i + 1}. ${model.name} (${model.quantization})`);
  });

  // Get recommendations for coding
  console.log('\n\nRecommendations for Coding Tasks:');
  const codingRecs = await switcher.getRecommendations('coding');
  console.log(JSON.stringify(codingRecs, null, 2));

  // Get download suggestions
  console.log('\n\nSuggested Downloads (Mid-Range Hardware):');
  const downloads = await switcher.getSuggestedDownloads('mid');
  downloads.forEach((model, i) => {
    console.log(`${i + 1}. ${model.name}`);
    console.log(`   Use: ${model.use} | VRAM: ${model.vram}`);
  });

  // Auto-detect and switch
  const prompt = 'Write a React component for a user profile page';
  console.log(`\n\nPrompt: "${prompt}"`);
  console.log('Auto-switching model...');
  const result = await switcher.autoSwitchForPrompt(prompt);
  console.log(JSON.stringify(result, null, 2));
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch(console.error);
}
