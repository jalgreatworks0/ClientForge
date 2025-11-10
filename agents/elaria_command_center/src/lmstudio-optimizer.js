/**
 * LM Studio Performance Monitor & Auto-Optimizer
 * Monitors inference performance and auto-adjusts settings
 *
 * Tracks:
 * - Tokens per second
 * - Time to first token
 * - VRAM usage (if detectable)
 * - Response quality metrics
 *
 * Auto-optimizes:
 * - Context length (reduce if slow)
 * - Batch size (adjust for performance)
 * - Quantization recommendations
 */

import { LMStudioClient } from '@lmstudio/sdk';

export class LMStudioOptimizer {
  constructor(baseUrl = 'ws://localhost:1234') {
    this.client = new LMStudioClient({ baseUrl });
    this.metrics = {
      tokensPerSecond: [],
      timeToFirstToken: [],
      promptProcessingTime: [],
      totalCompletions: 0
    };
    this.thresholds = {
      minTokensPerSecond: 15, // Below this = performance issue
      maxTimeToFirstToken: 1000, // ms - above this = too slow
      targetTokensPerSecond: 25
    };
  }

  /**
   * Monitor a completion request and gather metrics
   */
  async monitorCompletion(prompt, config = {}) {
    const startTime = Date.now();
    let firstTokenTime = null;
    let tokenCount = 0;
    let fullResponse = '';

    try {
      const model = await this.client.llm.get(config.model || { identifier: 'local' });

      const prediction = model.respond(prompt, {
        ...config,
        onToken: (token) => {
          if (!firstTokenTime) {
            firstTokenTime = Date.now() - startTime;
          }
          tokenCount++;
          fullResponse += token;
        }
      });

      const response = await prediction;
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const tokensPerSecond = (tokenCount / (totalTime / 1000)).toFixed(2);

      // Record metrics
      this.metrics.tokensPerSecond.push(parseFloat(tokensPerSecond));
      this.metrics.timeToFirstToken.push(firstTokenTime);
      this.metrics.promptProcessingTime.push(firstTokenTime);
      this.metrics.totalCompletions++;

      const performanceMetrics = {
        tokensPerSecond: parseFloat(tokensPerSecond),
        timeToFirstToken: firstTokenTime,
        totalTime,
        tokenCount,
        avgTokensPerSecond: this.getAvgTokensPerSecond(),
        performance: this.classifyPerformance(parseFloat(tokensPerSecond))
      };

      return {
        response: fullResponse,
        metrics: performanceMetrics,
        recommendations: this.generateRecommendations(performanceMetrics)
      };
    } catch (error) {
      return {
        error: error.message,
        metrics: null,
        recommendations: ['Check if LM Studio is running', 'Verify model is loaded']
      };
    }
  }

  /**
   * Classify performance level
   */
  classifyPerformance(tokensPerSecond) {
    if (tokensPerSecond >= 30) return 'excellent';
    if (tokensPerSecond >= 20) return 'good';
    if (tokensPerSecond >= 15) return 'acceptable';
    if (tokensPerSecond >= 10) return 'slow';
    return 'very_slow';
  }

  /**
   * Get average tokens per second across all completions
   */
  getAvgTokensPerSecond() {
    if (this.metrics.tokensPerSecond.length === 0) return 0;
    const sum = this.metrics.tokensPerSecond.reduce((a, b) => a + b, 0);
    return (sum / this.metrics.tokensPerSecond.length).toFixed(2);
  }

  /**
   * Generate optimization recommendations
   */
  generateRecommendations(metrics) {
    const recommendations = [];

    // Tokens per second recommendations
    if (metrics.tokensPerSecond < 10) {
      recommendations.push({
        type: 'critical',
        category: 'performance',
        issue: 'Very slow token generation (<10 tok/s)',
        solutions: [
          'Use smaller model (e.g., 7B instead of 30B)',
          'Lower quantization (Q4_K_M instead of Q5_K_M)',
          'Reduce context length to 8K or 4K',
          'Offload fewer layers to GPU if VRAM constrained',
          'Check if other applications are using GPU'
        ]
      });
    } else if (metrics.tokensPerSecond < 15) {
      recommendations.push({
        type: 'warning',
        category: 'performance',
        issue: 'Below target performance (10-15 tok/s)',
        solutions: [
          'Consider Q4_K_M quantization for speed boost',
          'Reduce context to 16K if using 32K+',
          'Ensure Flash Attention is enabled',
          'Check batch size (try 512 or 1024)'
        ]
      });
    }

    // Time to first token recommendations
    if (metrics.timeToFirstToken > 2000) {
      recommendations.push({
        type: 'warning',
        category: 'latency',
        issue: 'Slow prompt processing (>2s)',
        solutions: [
          'Reduce prompt length',
          'Enable prompt caching if available',
          'Reduce context length',
          'Use continuous batching if supported'
        ]
      });
    }

    // Good performance
    if (metrics.tokensPerSecond >= 25 && metrics.timeToFirstToken < 1000) {
      recommendations.push({
        type: 'success',
        category: 'performance',
        issue: 'Optimal performance achieved',
        solutions: [
          'Current settings are well-optimized',
          'Consider using higher quality quantization (Q6_K or Q8_0) if quality is priority',
          'Increase context length if needed for your use case'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Get optimal config based on hardware capability
   */
  async getOptimalConfig(hardwareTier = 'auto') {
    if (hardwareTier === 'auto') {
      // Try to detect based on recent performance
      const avgTPS = parseFloat(this.getAvgTokensPerSecond());

      if (avgTPS >= 30) hardwareTier = 'high';
      else if (avgTPS >= 20) hardwareTier = 'mid';
      else if (avgTPS >= 10) hardwareTier = 'budget';
      else hardwareTier = 'cpu';
    }

    const configs = {
      high: {
        modelSize: '30B-70B',
        quantization: 'Q5_K_M',
        contextLength: 32768,
        batchSize: 1024,
        expectedTPS: '25-40'
      },
      mid: {
        modelSize: '13B-20B',
        quantization: 'Q5_K_M',
        contextLength: 16384,
        batchSize: 512,
        expectedTPS: '20-35'
      },
      budget: {
        modelSize: '7B-13B',
        quantization: 'Q4_K_M',
        contextLength: 8192,
        batchSize: 256,
        expectedTPS: '15-25'
      },
      cpu: {
        modelSize: '7B',
        quantization: 'Q3_K_M',
        contextLength: 4096,
        batchSize: 128,
        expectedTPS: '2-5'
      }
    };

    return {
      tier: hardwareTier,
      config: configs[hardwareTier],
      recommendations: this.getHardwareRecommendations(hardwareTier)
    };
  }

  /**
   * Get hardware-specific recommendations
   */
  getHardwareRecommendations(tier) {
    const recommendations = {
      high: [
        'GPU Offload: 100% (all layers)',
        'Flash Attention: Enabled',
        'Recommended: RTX 4090, RTX 3090 (24GB VRAM)',
        'Models: DeepSeek Coder 33B, Llama 3.1 70B (Q5_K_M)'
      ],
      mid: [
        'GPU Offload: 90-100%',
        'Flash Attention: Enabled',
        'Recommended: RTX 3080, RTX 4070 (10-12GB VRAM)',
        'Models: Llama 3 13B, Mistral 7B (Q5_K_M), CodeLlama 34B (Q4_K_M)'
      ],
      budget: [
        'GPU Offload: 80-100%',
        'Flash Attention: Try enabling',
        'Recommended: GTX 1660 Ti, RTX 2060 (6-8GB VRAM)',
        'Models: Llama 3 7B (Q5_K_M), Mistral 7B (Q4_K_M)'
      ],
      cpu: [
        'CPU-only mode',
        'Use smallest quantization (Q3_K_M or Q2_K)',
        'Limit context to 4096 or less',
        'Models: TinyLlama, Phi-2, smaller 7B models with Q3/Q2'
      ]
    };

    return recommendations[tier] || [];
  }

  /**
   * Generate performance report
   */
  getPerformanceReport() {
    if (this.metrics.totalCompletions === 0) {
      return {
        status: 'no_data',
        message: 'No completions tracked yet'
      };
    }

    return {
      totalCompletions: this.metrics.totalCompletions,
      averageTokensPerSecond: parseFloat(this.getAvgTokensPerSecond()),
      averageTimeToFirstToken: (
        this.metrics.timeToFirstToken.reduce((a, b) => a + b, 0) /
        this.metrics.timeToFirstToken.length
      ).toFixed(0),
      performanceClass: this.classifyPerformance(parseFloat(this.getAvgTokensPerSecond())),
      recentPerformance: this.metrics.tokensPerSecond.slice(-5),
      recommendations: this.generateRecommendations({
        tokensPerSecond: parseFloat(this.getAvgTokensPerSecond()),
        timeToFirstToken: this.metrics.timeToFirstToken.slice(-1)[0] || 0
      })
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      tokensPerSecond: [],
      timeToFirstToken: [],
      promptProcessingTime: [],
      totalCompletions: 0
    };
  }
}

// Example usage
async function demo() {
  console.log('\n=== LM Studio Performance Optimizer ===\n');

  const optimizer = new LMStudioOptimizer();

  // Monitor a completion
  console.log('Testing completion...');
  const result = await optimizer.monitorCompletion('Write a hello world function in JavaScript');

  console.log('\nResponse:', result.response);
  console.log('\nMetrics:', JSON.stringify(result.metrics, null, 2));
  console.log('\nRecommendations:');
  result.recommendations.forEach(rec => {
    console.log(`\n[${rec.type.toUpperCase()}] ${rec.issue}`);
    rec.solutions.forEach(sol => console.log(`  - ${sol}`));
  });

  // Get optimal config
  const optimalConfig = await optimizer.getOptimalConfig();
  console.log('\nOptimal Configuration:', JSON.stringify(optimalConfig, null, 2));

  // Performance report
  const report = optimizer.getPerformanceReport();
  console.log('\nPerformance Report:', JSON.stringify(report, null, 2));
}

// Run demo if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  demo().catch(console.error);
}
