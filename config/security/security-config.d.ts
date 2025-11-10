/**
 * Security Configuration
 * JWT, encryption, and security settings
 */
export interface SecurityConfig {
    jwt: {
        secret: string;
        accessTokenExpiresIn: string;
        refreshTokenExpiresIn: string;
        algorithm: 'HS256' | 'HS384' | 'HS512';
    };
    bcrypt: {
        saltRounds: number;
    };
    session: {
        secret: string;
        maxAge: number;
        rolling: boolean;
    };
    encryption: {
        algorithm: string;
        key: string;
    };
    rateLimit: {
        windowMs: number;
        maxRequests: number;
        skipSuccessfulRequests: boolean;
    };
    passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
    };
    accountLocking: {
        maxFailedAttempts: number;
        lockDurationMs: number;
    };
}
export declare const securityConfig: SecurityConfig;
/**
 * Validate security configuration
 */
export declare function validateSecurityConfig(): void;
/**
 * Validate password against policy
 */
export declare function validatePassword(password: string): {
    valid: boolean;
    errors: string[];
};
export default securityConfig;
//# sourceMappingURL=security-config.d.ts.map