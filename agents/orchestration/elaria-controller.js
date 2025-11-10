#!/usr/bin/env node

/**
 * Elaria LM Studio Orchestration Controller
 * Manages ScrollForge LM Studio instance for ClientForge CRM integration
 */

const { spawn, exec } = require('child_process');
const http = require('http');
const fs = require('fs').promises;
const path = require('path');

class ElariaOrchestrator {
  constructor(config) {
    this.config = config;
    this.lmStudioProcess = null;
    this.activeModels = new Map();
    this.requestQueue = [];
    this.status = 'initializing';
  }

  /**
   * Initialize Elaria Command Center
   */
  async initialize() {
    console.log('🔮 Elaria Command Center Initializing...');
    
    // Verify LM Studio installation
    const lmStudioPath = this.config.lm_studio.installation_path;
    try {
      await fs.access(lmStudioPath);
      console.log(`✅ LM Studio found at: ${lmStudioPath}`);
    } catch (error) {
      console.error(`❌ LM Studio not found at: ${lmStudioPath}`);
      console.log('📥 Please ensure LM Studio is installed at D:\\scrollforge\\apps\\LMStudio');
      return false;
    }

    // Check for required models
    await this.verifyModels();

    // Start LM Studio server if not running
    const serverRunning = await this.checkServerStatus();
    if (!serverRunning) {
      await this.startLMStudioServer();
    }

    // Preload priority models
    await this.preloadModels();

    this.status = 'operational';
    console.log('🚀 Elaria Command Center Operational');
    return true;
  }

  /**
   * Verify required models are downloaded
   */
  async verifyModels() {
    console.log('🔍 Verifying model availability...');
    
    const models = this.config.lm_studio.models.primary;
    const missingModels = [];

    for (const [role, model] of Object.entries(models)) {
      try {
        await fs.access(model.path);
        console.log(`✅ ${role}: ${model.name} found`);
      } catch {
        missingModels.push({ role, ...model });
        console.log(`⚠️ ${role}: ${model.name} missing`);
      }
    }

    if (missingModels.length > 0) {
      console.log('\\n📥 Missing models need to be downloaded:');
      missingModels.forEach(m => {
        console.log(`  - ${m.name} for ${m.role}`);
      });
      console.log('\\nDownload from: https://huggingface.co/models');
    }
  }

  /**
   * Check if LM Studio server is running
   */
  async checkServerStatus() {
    const { host, port } = this.config.lm_studio.server;
    
    return new Promise((resolve) => {
      const req = http.get(`http://${host}:${port}/health`, (res) => {
        resolve(res.statusCode === 200);
      });
      
      req.on('error', () => resolve(false));
      req.setTimeout(2000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }

  /**
   * Start LM Studio server
   */
  async startLMStudioServer() {
    console.log('🚀 Starting LM Studio server...');
    
    const lmStudioExe = path.join(
      this.config.lm_studio.installation_path,
      'LM Studio.exe'
    );

    // Start with server mode
    this.lmStudioProcess = spawn(lmStudioExe, ['server', 'start'], {
      detached: false,
      stdio: 'pipe'
    });

    this.lmStudioProcess.stdout.on('data', (data) => {
      console.log(`[LM Studio]: ${data}`);
    });

    this.lmStudioProcess.stderr.on('data', (data) => {
      console.error(`[LM Studio Error]: ${data}`);
    });

    // Wait for server to be ready
    let attempts = 0;
    while (attempts < 30) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (await this.checkServerStatus()) {
        console.log('✅ LM Studio server started successfully');
        return true;
      }
      attempts++;
    }

    console.error('❌ Failed to start LM Studio server');
    return false;
  }

  /**
   * Preload high-priority models
   */
  async preloadModels() {
    console.log('📦 Preloading priority models...');
    
    const preloadList = this.config.lm_studio.orchestration.preload_models;
    
    for (const modelName of preloadList) {
      await this.loadModel(modelName);
    }
  }

  /**
   * Load a model into memory
   */
  async loadModel(modelName) {
    if (this.activeModels.has(modelName)) {
      return true;
    }

    console.log(`📥 Loading model: ${modelName}`);
    
    const { host, port } = this.config.lm_studio.server;
    
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        model: modelName,
        gpu_layers: this.getModelConfig(modelName)?.gpu_layers || 35
      });

      const options = {
        hostname: host,
        port: port,
        path: '/v1/models/load',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        if (res.statusCode === 200) {
          this.activeModels.set(modelName, {
            loadedAt: Date.now(),
            lastUsed: Date.now()
          });
          console.log(`✅ Model loaded: ${modelName}`);
          resolve(true);
        } else {
          resolve(false);
        }
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Route request to appropriate model
   */
  async routeRequest(prompt, taskType = 'chat') {
    // Select model based on task type
    const modelMapping = {
      'coding': 'qwen-coder-30b-q4',
      'reasoning': 'llama-3.1-70b-instruct',
      'chat': 'mistral-7b-instruct',
      'sql': 'sqlcoder-7b-q5',
      'documentation': 'phi-3-medium-14b',
      'analysis': 'deepseek-coder-33b'
    };

    const modelName = modelMapping[taskType] || modelMapping['chat'];

    // Ensure model is loaded
    await this.loadModel(modelName);

    // Make request to LM Studio
    return await this.makeCompletionRequest(prompt, modelName);
  }

  /**
   * Make completion request to LM Studio
   */
  async makeCompletionRequest(prompt, modelName) {
    const { host, port } = this.config.lm_studio.server;

    const postData = JSON.stringify({
      model: modelName,
      prompt: prompt,
      max_tokens: 2048,
      temperature: 0.7,
      top_p: 0.9,
      stream: false
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: host,
        port: port,
        path: '/v1/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(options, (res) => {
        let data = '';
        
        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          try {
            const response = JSON.parse(data);
            resolve(response);
          } catch (error) {
            reject(error);
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }

  /**
   * Get model configuration
   */
  getModelConfig(modelName) {
    const models = this.config.lm_studio.models.primary;
    
    for (const model of Object.values(models)) {
      if (model.name === modelName) {
        return model;
      }
    }
    
    return null;
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    console.log('🛑 Shutting down Elaria Command Center...');
    
    if (this.lmStudioProcess) {
      this.lmStudioProcess.kill();
    }
    
    this.status = 'offline';
    console.log('✅ Elaria Command Center offline');
  }
}

// Load configuration
const config = require('./ai/config/lmstudio-bridge.json');

// Create orchestrator instance
const elaria = new ElariaOrchestrator(config);

// Export for use in ClientForge
module.exports = elaria;

// If running directly, start the orchestrator
if (require.main === module) {
  (async () => {
    await elaria.initialize();
    
    // Keep process alive
    process.on('SIGINT', async () => {
      await elaria.shutdown();
      process.exit(0);
    });
  })();
}
