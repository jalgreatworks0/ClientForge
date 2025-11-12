/**
 * Express Request extensions for authentication
 * Extends the Express Request interface to include auth-related properties
 */

declare namespace Express {
  export interface Request {
    userId?: string;
    tenantId?: string;
    session?: Record<string, unknown>;
    user?: {
      id: string;
      userId: string;
      tenantId: string;
      email: string;
      role: string;
      provider?: 'google' | 'microsoft' | 'local';
      providerId?: string; // sub for Google, oid for Microsoft
    };
  }
}
