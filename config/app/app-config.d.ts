/**
 * Application Configuration
 * Core application settings and environment variables
 */
export interface AppConfig {
    env: 'development' | 'staging' | 'production' | 'test';
    name: string;
    url: string;
    port: number;
    apiVersion: string;
    corsOrigins: string[];
    maxRequestSize: string;
    requestTimeout: number;
}
export declare const appConfig: AppConfig;
/**
 * Validate required environment variables
 */
export declare function validateAppConfig(): void;
export default appConfig;
//# sourceMappingURL=app-config.d.ts.map