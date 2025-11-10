#!/usr/bin/env node

/**
 * ClientForge Database MCP Server
 * Multi-database operations for PostgreSQL, MongoDB, Elasticsearch, Redis
 */

const { Client: PgClient } = require('pg');
const { MongoClient } = require('mongodb');
const { Client: ElasticsearchClient } = require('@elastic/elasticsearch');
const { createClient: createRedisClient } = require('redis');

const POSTGRES_URL = process.env.POSTGRES_URL || 'postgres://localhost:5432/clientforge';
const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/clientforge?authSource=admin';
const ELASTICSEARCH_URL = process.env.ELASTICSEARCH_URL || 'http://localhost:9200';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

class ClientForgeDatabase {
  constructor() {
    this.pgClient = null;
    this.mongoClient = null;
    this.esClient = null;
    this.redisClient = null;
    this.connected = {
      postgresql: false,
      mongodb: false,
      elasticsearch: false,
      redis: false
    };
  }

  async connect() {
    try {
      // PostgreSQL
      this.pgClient = new PgClient({ connectionString: POSTGRES_URL });
      await this.pgClient.connect();
      this.connected.postgresql = true;

      // MongoDB
      this.mongoClient = new MongoClient(MONGODB_URL);
      await this.mongoClient.connect();
      this.connected.mongodb = true;

      // Elasticsearch
      this.esClient = new ElasticsearchClient({ node: ELASTICSEARCH_URL });
      await this.esClient.ping();
      this.connected.elasticsearch = true;

      // Redis
      this.redisClient = createRedisClient({ url: REDIS_URL });
      await this.redisClient.connect();
      this.connected.redis = true;

      return { success: true, connected: this.connected };
    } catch (error) {
      return { success: false, error: error.message, connected: this.connected };
    }
  }

  async queryPostgresql(query, params = []) {
    if (!this.connected.postgresql) {
      return { success: false, error: 'PostgreSQL not connected' };
    }

    // Safety check: require tenant_id in WHERE clause for SELECT queries
    if (query.trim().toUpperCase().startsWith('SELECT') &&
        !query.toLowerCase().includes('tenant_id')) {
      return {
        success: false,
        error: 'SECURITY: All SELECT queries must include tenant_id filtering'
      };
    }

    // Safety check: prevent string interpolation
    if (query.includes('${') || query.includes('`')) {
      return {
        success: false,
        error: 'SECURITY: String interpolation detected. Use parameterized queries only.'
      };
    }

    try {
      const result = await this.pgClient.query(query, params);
      return {
        success: true,
        rows: result.rows,
        rowCount: result.rowCount,
        fields: result.fields?.map(f => ({ name: f.name, dataType: f.dataTypeID }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async queryMongodb(collection, operation, query = {}, options = {}) {
    if (!this.connected.mongodb) {
      return { success: false, error: 'MongoDB not connected' };
    }

    try {
      const db = this.mongoClient.db('clientforge');
      const coll = db.collection(collection);

      let result;
      switch (operation) {
        case 'find':
          result = await coll.find(query, options).toArray();
          break;
        case 'findOne':
          result = await coll.findOne(query, options);
          break;
        case 'insertOne':
          result = await coll.insertOne(query);
          break;
        case 'updateOne':
          result = await coll.updateOne(query, options);
          break;
        case 'deleteOne':
          result = await coll.deleteOne(query);
          break;
        case 'count':
          result = await coll.countDocuments(query);
          break;
        case 'aggregate':
          result = await coll.aggregate(query).toArray();
          break;
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async searchElasticsearch(index, query, options = {}) {
    if (!this.connected.elasticsearch) {
      return { success: false, error: 'Elasticsearch not connected' };
    }

    try {
      const { from = 0, size = 10, sort, highlight } = options;

      const result = await this.esClient.search({
        index,
        body: {
          from,
          size,
          query,
          sort,
          highlight
        }
      });

      return {
        success: true,
        total: result.hits.total.value,
        hits: result.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          source: hit._source,
          highlight: hit.highlight
        }))
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cacheRedis(operation, key, value = null, ttl = null) {
    if (!this.connected.redis) {
      return { success: false, error: 'Redis not connected' };
    }

    try {
      let result;
      switch (operation) {
        case 'get':
          result = await this.redisClient.get(key);
          break;
        case 'set':
          if (ttl) {
            result = await this.redisClient.setEx(key, ttl, value);
          } else {
            result = await this.redisClient.set(key, value);
          }
          break;
        case 'del':
          result = await this.redisClient.del(key);
          break;
        case 'exists':
          result = await this.redisClient.exists(key);
          break;
        case 'ttl':
          result = await this.redisClient.ttl(key);
          break;
        case 'keys':
          result = await this.redisClient.keys(key);
          break;
        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }

      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async verifySchema(table) {
    if (!this.connected.postgresql) {
      return { success: false, error: 'PostgreSQL not connected' };
    }

    try {
      const result = await this.pgClient.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = $1
        ORDER BY ordinal_position
      `, [table]);

      const hasTenantId = result.rows.some(row => row.column_name === 'tenant_id');

      return {
        success: true,
        table: table,
        columns: result.rows,
        hasTenantId: hasTenantId,
        multiTenantCompliant: hasTenantId
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async checkTenantIsolation() {
    if (!this.connected.postgresql) {
      return { success: false, error: 'PostgreSQL not connected' };
    }

    try {
      // Get all tables
      const tablesResult = await this.pgClient.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
      `);

      const violations = [];
      for (const { table_name } of tablesResult.rows) {
        const schemaResult = await this.verifySchema(table_name);
        if (!schemaResult.hasTenantId) {
          violations.push(table_name);
        }
      }

      return {
        success: true,
        compliant: violations.length === 0,
        tablesChecked: tablesResult.rows.length,
        violations: violations
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async databaseHealth() {
    const health = {
      postgresql: { status: 'disconnected', latency: null },
      mongodb: { status: 'disconnected', latency: null },
      elasticsearch: { status: 'disconnected', latency: null },
      redis: { status: 'disconnected', latency: null }
    };

    // PostgreSQL
    if (this.connected.postgresql) {
      try {
        const start = Date.now();
        await this.pgClient.query('SELECT 1');
        health.postgresql = {
          status: 'healthy',
          latency: Date.now() - start
        };
      } catch (error) {
        health.postgresql = { status: 'error', error: error.message };
      }
    }

    // MongoDB
    if (this.connected.mongodb) {
      try {
        const start = Date.now();
        await this.mongoClient.db('clientforge').admin().ping();
        health.mongodb = {
          status: 'healthy',
          latency: Date.now() - start
        };
      } catch (error) {
        health.mongodb = { status: 'error', error: error.message };
      }
    }

    // Elasticsearch
    if (this.connected.elasticsearch) {
      try {
        const start = Date.now();
        await this.esClient.ping();
        health.elasticsearch = {
          status: 'healthy',
          latency: Date.now() - start
        };
      } catch (error) {
        health.elasticsearch = { status: 'error', error: error.message };
      }
    }

    // Redis
    if (this.connected.redis) {
      try {
        const start = Date.now();
        await this.redisClient.ping();
        health.redis = {
          status: 'healthy',
          latency: Date.now() - start
        };
      } catch (error) {
        health.redis = { status: 'error', error: error.message };
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      databases: health
    };
  }

  async runMigration(migrationFile) {
    if (!this.connected.postgresql) {
      return { success: false, error: 'PostgreSQL not connected' };
    }

    const fs = require('fs').promises;
    const path = require('path');

    try {
      const migrationPath = path.join(
        'D:\\clientforge-crm\\database\\migrations',
        migrationFile
      );

      const sql = await fs.readFile(migrationPath, 'utf8');

      await this.pgClient.query('BEGIN');
      await this.pgClient.query(sql);
      await this.pgClient.query('COMMIT');

      return {
        success: true,
        migration: migrationFile,
        message: 'Migration executed successfully'
      };
    } catch (error) {
      await this.pgClient.query('ROLLBACK');
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// MCP Server Interface
const server = new ClientForgeDatabase();
server.connect().then(result => {
  console.error('[ClientForge Database MCP] Server started', result);
});

process.stdin.on('data', async (data) => {
  try {
    const request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'query_postgresql':
        response = await server.queryPostgresql(
          request.params.query,
          request.params.params
        );
        break;
      case 'query_mongodb':
        response = await server.queryMongodb(
          request.params.collection,
          request.params.operation,
          request.params.query,
          request.params.options
        );
        break;
      case 'search_elasticsearch':
        response = await server.searchElasticsearch(
          request.params.index,
          request.params.query,
          request.params.options
        );
        break;
      case 'cache_redis':
        response = await server.cacheRedis(
          request.params.operation,
          request.params.key,
          request.params.value,
          request.params.ttl
        );
        break;
      case 'verify_schema':
        response = await server.verifySchema(request.params.table);
        break;
      case 'check_tenant_isolation':
        response = await server.checkTenantIsolation();
        break;
      case 'database_health':
        response = await server.databaseHealth();
        break;
      case 'run_migration':
        response = await server.runMigration(request.params.file);
        break;
      default:
        response = {
          success: false,
          error: `Unknown method: ${request.method}`
        };
    }

    process.stdout.write(JSON.stringify({
      id: request.id,
      result: response
    }) + '\n');
  } catch (error) {
    process.stdout.write(JSON.stringify({
      id: request.id || null,
      error: {
        code: -32603,
        message: error.message
      }
    }) + '\n');
  }
});
