/**
 * LM Studio Module - OpenAI-compatible AI Provider
 * Location: D:\ClientForge\02_CODE\backend\src\ai\lmstudio.module.ts
 * Purpose: Headless LM Studio integration for ClientForge CRM
 */

import { Module } from '@nestjs/common';
import { LmStudioService } from './lmstudio.service';
import { LmStudioStructuredService } from './lmstudio-structured.service';
import { LmStudioController } from './lmstudio.controller';
import { LmStudioHealthIndicator } from './lmstudio.health';

@Module({
  providers: [LmStudioService, LmStudioStructuredService, LmStudioHealthIndicator],
  controllers: [LmStudioController],
  exports: [LmStudioService, LmStudioStructuredService, LmStudioHealthIndicator],
})
export class LmStudioModule {}
