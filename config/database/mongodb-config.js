"use strict";
/**
 * MongoDB Configuration
 * Logs, events, and flexible schema data
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.mongodbConfig = void 0;
exports.getMongoClient = getMongoClient;
exports.getMongoDatabase = getMongoDatabase;
exports.closeMongoClient = closeMongoClient;
exports.testMongoConnection = testMongoConnection;
exports.initializeMongoCollections = initializeMongoCollections;
const mongodb_1 = require("mongodb");
exports.mongodbConfig = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/clientforge_logs',
    dbName: process.env.MONGODB_DB_NAME || 'clientforge_logs',
    options: {
        maxPoolSize: 10,
        minPoolSize: 2,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
        retryWrites: true,
        retryReads: true,
    },
};
/**
 * Create and export MongoDB client
 */
let client = null;
let db = null;
async function getMongoClient() {
    if (!client) {
        client = new mongodb_1.MongoClient(exports.mongodbConfig.uri, exports.mongodbConfig.options);
        try {
            await client.connect();
            console.log('✅ MongoDB connected');
            // Handle connection events
            client.on('error', (error) => {
                console.error('❌ MongoDB connection error:', error);
            });
            client.on('close', () => {
                console.log('⚠️ MongoDB connection closed');
            });
            client.on('reconnect', () => {
                console.log('✅ MongoDB reconnected');
            });
        }
        catch (error) {
            console.error('❌ Failed to connect to MongoDB:', error);
            client = null;
            return null;
        }
    }
    return client;
}
/**
 * Get MongoDB database instance
 */
async function getMongoDatabase() {
    if (!db) {
        const mongoClient = await getMongoClient();
        if (!mongoClient) {
            return null;
        }
        db = mongoClient.db(exports.mongodbConfig.dbName);
    }
    return db;
}
/**
 * Close MongoDB connection
 */
async function closeMongoClient() {
    if (client) {
        await client.close();
        client = null;
        db = null;
        console.log('MongoDB connection closed');
    }
}
/**
 * Test MongoDB connection
 */
async function testMongoConnection() {
    try {
        const mongoClient = await getMongoClient();
        await mongoClient.db('admin').command({ ping: 1 });
        console.log('✅ MongoDB connection test successful');
        return true;
    }
    catch (error) {
        console.error('❌ MongoDB connection test failed:', error);
        return false;
    }
}
/**
 * Initialize MongoDB collections and indexes
 */
async function initializeMongoCollections() {
    try {
        const database = await getMongoDatabase();
        if (!database) {
            console.log('⚠️ MongoDB not available - skipping collection initialization');
            return;
        }
        // Create collections if they don't exist
        const collections = ['audit_logs', 'event_logs', 'error_logs', 'activity_logs'];
        for (const collectionName of collections) {
            const collectionExists = (await database.listCollections({ name: collectionName }).toArray()).length > 0;
            if (!collectionExists) {
                await database.createCollection(collectionName);
                console.log(`✅ Created MongoDB collection: ${collectionName}`);
            }
        }
        // Create indexes
        await database.collection('audit_logs').createIndexes([
            { key: { tenant_id: 1, created_at: -1 } },
            { key: { user_id: 1, created_at: -1 } },
            { key: { action: 1, created_at: -1 } },
            { key: { created_at: -1 }, expireAfterSeconds: 7776000 }, // 90 days TTL
        ]);
        await database.collection('event_logs').createIndexes([
            { key: { event_type: 1, created_at: -1 } },
            { key: { tenant_id: 1, created_at: -1 } },
            { key: { created_at: -1 }, expireAfterSeconds: 2592000 }, // 30 days TTL
        ]);
        await database.collection('error_logs').createIndexes([
            { key: { level: 1, created_at: -1 } },
            { key: { tenant_id: 1, created_at: -1 } },
            { key: { created_at: -1 }, expireAfterSeconds: 2592000 }, // 30 days TTL
        ]);
        console.log('✅ MongoDB collections and indexes initialized');
    }
    catch (error) {
        console.error('❌ Failed to initialize MongoDB collections:', error);
        throw error;
    }
}
exports.default = exports.mongodbConfig;
