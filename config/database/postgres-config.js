"use strict";
/**
 * PostgreSQL Database Configuration
 * Primary relational database for transactional data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.postgresConfig = void 0;
exports.getPostgresPool = getPostgresPool;
exports.closePostgresPool = closePostgresPool;
exports.testPostgresConnection = testPostgresConnection;
const pg_1 = require("pg");
exports.postgresConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_NAME || 'clientforge_crm',
    user: process.env.DB_USER || 'crm_admin',
    password: process.env.DB_PASSWORD || 'dev_password_change_in_prod',
    min: parseInt(process.env.DATABASE_POOL_MIN || '2', 10),
    max: parseInt(process.env.DATABASE_POOL_MAX || '10', 10),
    idleTimeoutMillis: 30000, // 30 seconds
    connectionTimeoutMillis: 5000, // 5 seconds
    ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : false,
};
/**
 * Create and export PostgreSQL connection pool
 */
let pool = null;
function getPostgresPool() {
    if (!pool) {
        pool = new pg_1.Pool(exports.postgresConfig);
        pool.on('error', (err) => {
            console.error('Unexpected error on idle PostgreSQL client', err);
            process.exit(-1);
        });
        pool.on('connect', () => {
            console.log('✅ PostgreSQL connected');
        });
    }
    return pool;
}
/**
 * Close PostgreSQL connection pool
 */
async function closePostgresPool() {
    if (pool) {
        await pool.end();
        pool = null;
        console.log('PostgreSQL connection pool closed');
    }
}
/**
 * Test PostgreSQL connection
 */
async function testPostgresConnection() {
    try {
        const testPool = getPostgresPool();
        const result = await testPool.query('SELECT NOW()');
        console.log('✅ PostgreSQL connection test successful:', result.rows[0].now);
        return true;
    }
    catch (error) {
        console.error('❌ PostgreSQL connection test failed:', error);
        return false;
    }
}
exports.default = exports.postgresConfig;
