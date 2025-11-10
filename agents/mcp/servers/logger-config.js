/**
 * Centralized Logger Configuration for MCP Servers
 * Implements Winston with daily rotation and retention policies
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Ensure logs directory exists
const LOG_DIR = process.env.LOG_PATH || path.join(__dirname, '../../../logs/mcp');
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

/**
 * Create a logger instance for an MCP server
 * @param {string} serverName - Name of the MCP server (e.g., 'filesystem', 'codebase')
 * @param {string} logLevel - Log level (debug, info, warn, error) - defaults to info
 * @returns {winston.Logger}
 */
function createMCPLogger(serverName, logLevel = 'info') {
    const logFormat = winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    );

    const consoleFormat = winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp, ...meta }) => {
            let metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
            return `[${timestamp}] [${serverName}] ${level}: ${message} ${metaStr}`;
        })
    );

    const logger = winston.createLogger({
        level: process.env.LOG_LEVEL || logLevel,
        format: logFormat,
        defaultMeta: { service: `mcp-${serverName}` },
        transports: [
            // Console output (for debugging)
            new winston.transports.Console({
                format: consoleFormat,
                level: 'info'
            }),

            // File: All logs
            new winston.transports.File({
                filename: path.join(LOG_DIR, `${serverName}.log`),
                level: 'info',
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 5,
                tailable: true
            }),

            // File: Errors only
            new winston.transports.File({
                filename: path.join(LOG_DIR, `${serverName}-error.log`),
                level: 'error',
                maxsize: 10 * 1024 * 1024, // 10MB
                maxFiles: 10,
                tailable: true
            })
        ],

        // Handle uncaught errors
        exceptionHandlers: [
            new winston.transports.File({
                filename: path.join(LOG_DIR, `${serverName}-exceptions.log`),
                maxsize: 10 * 1024 * 1024,
                maxFiles: 5
            })
        ],

        rejectionHandlers: [
            new winston.transports.File({
                filename: path.join(LOG_DIR, `${serverName}-rejections.log`),
                maxsize: 10 * 1024 * 1024,
                maxFiles: 5
            })
        ]
    });

    // Log startup
    logger.info(`MCP server '${serverName}' logger initialized`, {
        logLevel: process.env.LOG_LEVEL || logLevel,
        logDir: LOG_DIR
    });

    return logger;
}

/**
 * Cleanup old log files (older than retentionDays)
 * @param {number} retentionDays - Number of days to keep logs (default: 7)
 */
function cleanupOldLogs(retentionDays = 7) {
    const now = Date.now();
    const maxAge = retentionDays * 24 * 60 * 60 * 1000; // days to ms

    if (!fs.existsSync(LOG_DIR)) return;

    fs.readdirSync(LOG_DIR).forEach(file => {
        const filePath = path.join(LOG_DIR, file);
        const stats = fs.statSync(filePath);

        if (now - stats.mtime.getTime() > maxAge) {
            fs.unlinkSync(filePath);
            console.log(`[LOG CLEANUP] Deleted old log file: ${file}`);
        }
    });
}

// Export utilities
module.exports = {
    createMCPLogger,
    cleanupOldLogs,
    LOG_DIR
};
