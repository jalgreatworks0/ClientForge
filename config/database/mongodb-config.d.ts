/**
 * MongoDB Configuration
 * Logs, events, and flexible schema data
 */
import { MongoClient, MongoClientOptions, Db } from 'mongodb';
export interface MongoDBConfig {
    uri: string;
    dbName: string;
    options: MongoClientOptions;
}
export declare const mongodbConfig: MongoDBConfig;
export declare function getMongoClient(): Promise<MongoClient>;
/**
 * Get MongoDB database instance
 */
export declare function getMongoDatabase(): Promise<Db>;
/**
 * Close MongoDB connection
 */
export declare function closeMongoClient(): Promise<void>;
/**
 * Test MongoDB connection
 */
export declare function testMongoConnection(): Promise<boolean>;
/**
 * Initialize MongoDB collections and indexes
 */
export declare function initializeMongoCollections(): Promise<void>;
export default mongodbConfig;
//# sourceMappingURL=mongodb-config.d.ts.map