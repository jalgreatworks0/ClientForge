"use strict";
/**
 * CORS (Cross-Origin Resource Sharing) Configuration
 * Controls which domains can access the API
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.corsConfig = void 0;
const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
];
exports.corsConfig = {
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, curl)
        if (!origin) {
            return callback(null, true);
        }
        // Check if origin is in allowed list
        if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
            callback(null, true);
        }
        else {
            callback(new Error(`Origin ${origin} not allowed by CORS`));
        }
    },
    credentials: true, // Allow cookies and authorization headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'X-Tenant-ID',
        'X-Request-ID',
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID'],
    maxAge: 86400, // 24 hours - how long preflight request results can be cached
    optionsSuccessStatus: 200,
};
exports.default = exports.corsConfig;
