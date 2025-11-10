/**
 * LM Studio Health Indicator
 * Location: D:\ClientForge\02_CODE\backend\src\ai\lmstudio.health.ts
 * Purpose: NestJS health check integration for monitoring dashboard
 */

import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult, HealthCheckError } from '@nestjs/terminus';

import { LmStudioService } from './lmstudio.service';

@Injectable()
export class LmStudioHealthIndicator extends HealthIndicator {
  constructor(private readonly lmStudio: LmStudioService) {
    super();
  }

  /**
   * Health check for LM Studio service
   */
  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const status = await this.lmStudio.health();

    const result = this.getStatus(key, status.ok, {
      latency: status.latency,
      modelsAvailable: status.modelsAvailable,
      currentModel: status.currentModel,
    });

    if (!status.ok) {
      throw new HealthCheckError('LM Studio check failed', result);
    }

    return result;
  }
}
