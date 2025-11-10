"use strict";
/**
 * Application Configuration
 * Core application settings and environment variables
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.appConfig = void 0;
exports.validateAppConfig = validateAppConfig;
exports.appConfig = {
    env: process.env.NODE_ENV || 'development',
    name: process.env.APP_NAME || 'ClientForge CRM',
    url: process.env.APP_URL || 'http://localhost:3000',
    port: parseInt(process.env.APP_PORT || '3000', 10),
    apiVersion: 'v1',
    corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
        'http://localhost:3000',
        'http://localhost:3001',
    ],
    maxRequestSize: '10mb',
    requestTimeout: 30000, // 30 seconds
};
/**
 * Validate required environment variables
 */
function validateAppConfig() {
    const required = ['NODE_ENV', 'APP_PORT'];
    const missing = required.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
exports.default = exports.appConfig;
