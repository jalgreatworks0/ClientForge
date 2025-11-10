"use strict";
/**
 * Security Configuration
 * JWT, encryption, and security settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.securityConfig = void 0;
exports.validateSecurityConfig = validateSecurityConfig;
exports.validatePassword = validatePassword;
exports.securityConfig = {
    jwt: {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m', // 15 minutes
        refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // 7 days
        algorithm: 'HS256',
    },
    bcrypt: {
        saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10), // Higher = more secure but slower
    },
    session: {
        secret: process.env.SESSION_SECRET || 'your-session-secret-change-this',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        rolling: true, // Extend session on activity
    },
    encryption: {
        algorithm: 'aes-256-gcm',
        key: process.env.ENCRYPTION_KEY || 'your-32-char-encryption-key-here!',
    },
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
        skipSuccessfulRequests: false,
    },
    passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
    },
    accountLocking: {
        maxFailedAttempts: 5,
        lockDurationMs: 15 * 60 * 1000, // 15 minutes
    },
};
/**
 * Validate security configuration
 */
function validateSecurityConfig() {
    const errors = [];
    // Validate JWT secret
    if (exports.securityConfig.jwt.secret.length < 32) {
        errors.push('JWT_SECRET must be at least 32 characters long');
    }
    if (exports.securityConfig.jwt.secret === 'your-super-secret-jwt-key-change-this-in-production') {
        if (process.env.NODE_ENV === 'production') {
            errors.push('JWT_SECRET must be changed in production');
        }
        else {
            console.warn('⚠️ WARNING: Using default JWT_SECRET in development');
        }
    }
    // Validate encryption key
    if (exports.securityConfig.encryption.key.length < 32) {
        errors.push('ENCRYPTION_KEY must be at least 32 characters long');
    }
    // Validate session secret
    if (exports.securityConfig.session.secret.length < 32) {
        errors.push('SESSION_SECRET must be at least 32 characters long');
    }
    if (errors.length > 0) {
        throw new Error(`Security configuration errors:\n${errors.join('\n')}`);
    }
}
/**
 * Validate password against policy
 */
function validatePassword(password) {
    const errors = [];
    const policy = exports.securityConfig.passwordPolicy;
    if (password.length < policy.minLength) {
        errors.push(`Password must be at least ${policy.minLength} characters long`);
    }
    if (policy.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter');
    }
    if (policy.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter');
    }
    if (policy.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number');
    }
    if (policy.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
        errors.push('Password must contain at least one special character');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
exports.default = exports.securityConfig;
