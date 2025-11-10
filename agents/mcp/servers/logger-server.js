#!/usr/bin/env node

/**
 * ClientForge Logger MCP Server
 * Structured logging to MongoDB with query capabilities
 */

const { MongoClient } = require('mongodb');

const MONGODB_URL = process.env.MONGODB_URL || 'mongodb://localhost:27017/clientforge?authSource=admin';

class ClientForgeLogger {
  constructor() {
    this.client = null;
    this.db = null;
    this.connected = false;
  }

  async connect() {
    try {
      this.client = new MongoClient(MONGODB_URL);
      await this.client.connect();
      this.db = this.client.db('clientforge');
      this.connected = true;

      return {
        success: true,
        message: 'Connected to MongoDB'
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async log(level, message, metadata = {}) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const logEntry = {
        timestamp: new Date(),
        level,
        message,
        metadata,
        source: 'mcp-server'
      };

      await this.db.collection('logs').insertOne(logEntry);

      return {
        success: true,
        logId: logEntry._id.toString()
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async queryLogs(filters = {}) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const {
        level = null,
        since = null,
        until = null,
        limit = 100
      } = filters;

      const query = {};

      if (level) {
        query.level = level;
      }

      if (since || until) {
        query.timestamp = {};
        if (since) query.timestamp.$gte = new Date(since);
        if (until) query.timestamp.$lte = new Date(until);
      }

      const logs = await this.db.collection('logs')
        .find(query)
        .sort({ timestamp: -1 })
        .limit(limit)
        .toArray();

      return {
        success: true,
        logs: logs.map(log => ({
          id: log._id.toString(),
          timestamp: log.timestamp,
          level: log.level,
          message: log.message,
          metadata: log.metadata
        })),
        count: logs.length
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async getLogStats() {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const stats = await this.db.collection('logs').aggregate([
        {
          $group: {
            _id: '$level',
            count: { $sum: 1 }
          }
        }
      ]).toArray();

      const statsByLevel = {};
      stats.forEach(stat => {
        statsByLevel[stat._id] = stat.count;
      });

      return {
        success: true,
        stats: statsByLevel,
        totalLogs: stats.reduce((sum, s) => sum + s.count, 0)
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async clearLogs(before = null) {
    if (!this.connected) {
      await this.connect();
    }

    try {
      const query = before ? { timestamp: { $lt: new Date(before) } } : {};

      const result = await this.db.collection('logs').deleteMany(query);

      return {
        success: true,
        deleted: result.deletedCount
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }
}

// MCP Server Interface
const server = new ClientForgeLogger();
console.error('[ClientForge Logger MCP] Starting...');
server.connect().then(result => {
  console.error('[ClientForge Logger MCP] Server started', result);
});

process.stdin.on('data', async (data) => {
  let request;
  try {
    request = JSON.parse(data.toString());
    let response;

    switch (request.method) {
      case 'log':
        response = await server.log(
          request.params.level,
          request.params.message,
          request.params.metadata
        );
        break;
      case 'query_logs':
        response = await server.queryLogs(request.params);
        break;
      case 'get_log_stats':
        response = await server.getLogStats();
        break;
      case 'clear_logs':
        response = await server.clearLogs(request.params.before);
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
      id: request ? request.id : null,
      error: {
        code: -32603,
        message: error.message
      }
    }) + '\n');
  }
});
