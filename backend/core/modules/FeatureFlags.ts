/**
 * Feature Flags - Safe rollout of new features
 * Supports: Environment flags, percentage rollout, tenant-specific flags
 */

import { logger } from '../../utils/logging/logger';
import { createHash } from 'crypto';

interface FeatureFlagConfig {
  enabled: boolean;
  rolloutPercentage?: number; // 0-100
  enabledTenants?: string[];
  enabledUsers?: string[];
}

export class FeatureFlags {
  private flags: Map<string, FeatureFlagConfig> = new Map();

  constructor() {
    this.loadFromEnvironment();
  }

  /**
   * Load flags from environment variables
   * Format: FEATURE_FLAG_NAME=true
   */
  private loadFromEnvironment(): void {
    const prefix = 'FEATURE_';

    for (const key in process.env) {
      if (key.startsWith(prefix)) {
        const flagName = key.substring(prefix.length).toLowerCase().replace(/_/g, '-');
        const enabled = process.env[key] === 'true';

        this.flags.set(flagName, { enabled });
        logger.info(`[FeatureFlags] Loaded from env: ${flagName} = ${enabled}`);
      }
    }
  }

  /**
   * Register a feature flag programmatically
   */
  register(name: string, config: FeatureFlagConfig): void {
    this.flags.set(name, config);
    logger.info(`[FeatureFlags] Registered: ${name}`, config);
  }

  /**
   * Check if feature is enabled
   * Supports: environment, percentage rollout, tenant/user targeting
   */
  async isEnabled(
    flag: string,
    userId?: string,
    tenantId?: string
  ): Promise<boolean> {
    const config = this.flags.get(flag);

    // Flag doesn't exist = disabled
    if (!config) {
      return false;
    }

    // Globally disabled
    if (!config.enabled) {
      return false;
    }

    // Check tenant-specific override
    if (tenantId && config.enabledTenants) {
      return config.enabledTenants.includes(tenantId);
    }

    // Check user-specific override
    if (userId && config.enabledUsers) {
      return config.enabledUsers.includes(userId);
    }

    // Percentage rollout (deterministic hash-based)
    if (config.rolloutPercentage !== undefined && userId) {
      const userHash = this.hashUserId(userId);
      return userHash < config.rolloutPercentage;
    }

    // Default: fully enabled
    return true;
  }

  /**
   * Get feature flag configuration
   */
  async getConfig(flag: string): Promise<FeatureFlagConfig | null> {
    return this.flags.get(flag) || null;
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): Map<string, FeatureFlagConfig> {
    return new Map(this.flags);
  }

  /**
   * Hash user ID for deterministic percentage rollout
   * Same user always gets same result (0-99)
   */
  private hashUserId(userId: string): number {
    const hash = createHash('md5').update(userId).digest('hex');
    const num = parseInt(hash.substring(0, 8), 16);
    return num % 100;
  }
}

// Export singleton
export const featureFlags = new FeatureFlags();
