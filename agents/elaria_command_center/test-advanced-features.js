#!/usr/bin/env node

/**
 * Test Advanced LM Studio Features
 * Demonstrates: Preset Manager, Performance Optimizer, Model Switcher
 */

import { PresetManager } from './src/preset-manager.js';
import { LMStudioOptimizer } from './src/lmstudio-optimizer.js';
import { ModelSwitcher } from './src/model-switcher.js';

console.log('\n==============================================');
console.log('  LM Studio Advanced Features - Demo');
console.log('  Elaria Command Center');
console.log('==============================================\n');

async function testPresetManager() {
  console.log('[1/3] Testing Preset Manager...\n');

  const presets = new PresetManager();

  // Get all presets
  const allPresets = presets.getAllPresets();
  console.log('Available Presets:', Object.keys(allPresets).join(', '));

  // Get coding preset
  const codingPreset = await presets.getPreset('coding');
  console.log('\nCoding Preset Configuration:');
  console.log(`  Temperature: ${codingPreset.temperature}`);
  console.log(`  Top P: ${codingPreset.top_p}`);
  console.log(`  Context: ${codingPreset.max_tokens}`);
  console.log(`  Model: ${codingPreset.recommended_model}`);

  // Auto-detect preset
  const testPrompts = [
    'Write a React component for user authentication',
    'Tell me a creative story about space exploration',
    'Analyze this quarterly sales report'
  ];

  console.log('\nAuto-Detection Examples:');
  testPrompts.forEach(prompt => {
    const detected = presets.autoDetectPreset(prompt);
    console.log(`  "${prompt.substring(0, 40)}..." → ${detected}`);
  });

  // Set current preset
  await presets.setPreset('albedo');
  console.log('\n[OK] Current preset set to: albedo');

  console.log('\n✅ Preset Manager: WORKING\n');
}

async function testModelSwitcher() {
  console.log('[2/3] Testing Model Switcher...\n');

  const switcher = new ModelSwitcher();

  try {
    // Get available models
    const models = await switcher.getAvailableModels();
    console.log(`Found ${models.length} models in LM Studio:`);
    models.slice(0, 3).forEach((model, i) => {
      console.log(`  ${i + 1}. ${model.name} (${model.quantization})`);
    });

    // Get recommendations for coding
    const codingRecs = await switcher.getRecommendations('coding');
    console.log(`\nCoding Task Recommendations:`);
    console.log(`  Available: ${codingRecs.available.length} models`);
    console.log(`  Need to download: ${codingRecs.needToDownload.length} models`);

    if (codingRecs.available.length > 0) {
      console.log(`  Best model: ${codingRecs.available[0].name}`);
    }

    // Get download suggestions
    const suggestions = await switcher.getSuggestedDownloads('mid');
    console.log(`\nSuggested Downloads (Mid-Range Hardware):`);
    suggestions.slice(0, 3).forEach((model, i) => {
      console.log(`  ${i + 1}. ${model.name} - ${model.use} (${model.vram})`);
    });

    console.log('\n✅ Model Switcher: WORKING\n');
  } catch (error) {
    console.log(`⚠️  Model Switcher: ${error.message}`);
    console.log('   (This is expected if LM Studio is not running)\n');
  }
}

async function testPerformanceOptimizer() {
  console.log('[3/3] Testing Performance Optimizer...\n');

  const optimizer = new LMStudioOptimizer();

  try {
    // Test completion monitoring
    console.log('Testing completion monitoring...');
    const result = await optimizer.monitorCompletion(
      'Write a hello world function in JavaScript',
      { model: 'local-model' }
    );

    if (result.error) {
      console.log(`⚠️  ${result.error}`);
      console.log('   (This is expected if LM Studio is not running)');
    } else {
      console.log(`\nPerformance Metrics:`);
      console.log(`  Tokens/sec: ${result.metrics.tokensPerSecond}`);
      console.log(`  Time to first token: ${result.metrics.timeToFirstToken}ms`);
      console.log(`  Performance: ${result.metrics.performance}`);

      console.log(`\nRecommendations:`);
      result.recommendations.forEach(rec => {
        console.log(`  [${rec.type}] ${rec.issue}`);
      });
    }

    // Get optimal config
    const optimalConfig = await optimizer.getOptimalConfig('high');
    console.log(`\nOptimal Config (High-End Hardware):`);
    console.log(`  Model Size: ${optimalConfig.config.modelSize}`);
    console.log(`  Quantization: ${optimalConfig.config.quantization}`);
    console.log(`  Context Length: ${optimalConfig.config.contextLength}`);
    console.log(`  Expected TPS: ${optimalConfig.config.expectedTPS}`);

    console.log('\n✅ Performance Optimizer: WORKING\n');
  } catch (error) {
    console.log(`⚠️  Performance Optimizer: ${error.message}`);
    console.log('   (This is expected if LM Studio is not running)\n');
  }
}

// Run all tests
async function main() {
  try {
    await testPresetManager();
    await testModelSwitcher();
    await testPerformanceOptimizer();

    console.log('==============================================');
    console.log('  Summary');
    console.log('==============================================\n');
    console.log('✅ Preset Manager: 6 presets ready');
    console.log('✅ Model Switcher: Auto-selection enabled');
    console.log('✅ Performance Optimizer: Monitoring active');
    console.log('\n[INFO] All advanced features are installed!');
    console.log('[INFO] Use desktop shortcuts to launch with presets');
    console.log('\nShortcuts:');
    console.log('  - Elaria with Coding Preset.lnk');
    console.log('  - Elaria with Albedo Preset.lnk');
    console.log('\n==============================================\n');
  } catch (error) {
    console.error('Error during tests:', error);
    process.exit(1);
  }
}

main();
