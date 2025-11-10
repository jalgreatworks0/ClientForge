"use strict";
/**
 * Redis Configuration
 * Cache, sessions, and real-time data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConfig = void 0;
exports.getRedisClient = getRedisClient;
exports.closeRedisClient = closeRedisClient;
exports.testRedisConnection = testRedisConnection;
const redis_1 = require("redis");
exports.redisConfig = {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour default
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    enableOfflineQueue: true,
};
/**
 * Create and export Redis client
 */
let client = null;
async function getRedisClient() {
    if (!client) {
        client = (0, redis_1.createClient)({
            url: exports.redisConfig.url,
            socket: {
                host: exports.redisConfig.host,
                port: exports.redisConfig.port,
                reconnectStrategy: (retries) => {
                    if (retries > 10) {
                        console.error('❌ Redis: Too many reconnection attempts');
                        return new Error('Redis reconnection failed');
                    }
                    return Math.min(retries * 100, 3000); // Exponential backoff
                },
            },
            password: exports.redisConfig.password,
            database: exports.redisConfig.db,
        });
        client.on('error', (err) => {
            console.error('❌ Redis Client Error:', err);
        });
        client.on('connect', () => {
            console.log('✅ Redis connecting...');
        });
        client.on('ready', () => {
            console.log('✅ Redis ready');
        });
        client.on('reconnecting', () => {
            console.log('⚠️ Redis reconnecting...');
        });
        await client.connect();
    }
    return client;
}
/**
 * Close Redis connection
 */
async function closeRedisClient() {
    if (client) {
        await client.quit();
        client = null;
        console.log('Redis connection closed');
    }
}
/**
 * Test Redis connection
 */
async function testRedisConnection() {
    try {
        const testClient = await getRedisClient();
        await testClient.ping();
        console.log('✅ Redis connection test successful');
        return true;
    }
    catch (error) {
        console.error('❌ Redis connection test failed:', error);
        return false;
    }
}
exports.default = exports.redisConfig;
