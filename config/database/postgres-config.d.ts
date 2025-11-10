/**
 * PostgreSQL Database Configuration
 * Primary relational database for transactional data
 */
import { Pool, PoolConfig } from 'pg';
export interface PostgresConfig extends PoolConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
    ssl: boolean | {
        rejectUnauthorized: boolean;
    };
}
export declare const postgresConfig: PostgresConfig;
export declare function getPostgresPool(): Pool;
/**
 * Close PostgreSQL connection pool
 */
export declare function closePostgresPool(): Promise<void>;
/**
 * Test PostgreSQL connection
 */
export declare function testPostgresConnection(): Promise<boolean>;
export default postgresConfig;
//# sourceMappingURL=postgres-config.d.ts.map