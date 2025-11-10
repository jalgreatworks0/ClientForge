/**
 * Redis Configuration
 * Cache, sessions, and real-time data
 */
import { RedisClientType } from 'redis';
export interface RedisConfig {
    url: string;
    host: string;
    port: number;
    password?: string;
    db: number;
    ttl: number;
    maxRetriesPerRequest: number;
    enableReadyCheck: boolean;
    enableOfflineQueue: boolean;
}
export declare const redisConfig: RedisConfig;
export declare function getRedisClient(): Promise<RedisClientType>;
/**
 * Close Redis connection
 */
export declare function closeRedisClient(): Promise<void>;
/**
 * Test Redis connection
 */
export declare function testRedisConnection(): Promise<boolean>;
export default redisConfig;
//# sourceMappingURL=redis-config.d.ts.map