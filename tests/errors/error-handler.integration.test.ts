/**
 * Error Handler Integration Tests
 *
 * Tests the Express error handler middleware with actual AppError instances
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "../../backend/utils/errors/AppError";
import { getErrorById } from "../../backend/utils/errors/registry";
import { errorHandler } from "../../backend/api/rest/v1/middleware/error-handler";

// TODO(phase5): Re-enable after fixing Express Response mock (missing setHeader function).
describe.skip("Error Handler Middleware - Integration Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let statusCode: number;
  let responseData: any;

  beforeEach(() => {
    mockRequest = {};
    statusCode = 0;
    responseData = null;

    mockResponse = {
      status: jest.fn().mockImplementation((code: number) => {
        statusCode = code;
        return mockResponse;
      }),
      json: jest.fn().mockImplementation((data: any) => {
        responseData = data;
        return mockResponse;
      }),
    };

    mockNext = jest.fn();
  });

  describe("AppError Handling", () => {
    it("should handle user-facing error correctly", () => {
      const error = new AppError(
        getErrorById("AUTH-001"),
        "Invalid email or password",
        { email: "user@example.com" }
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(401);
      expect(responseData).toEqual({
        error: {
          id: "AUTH-001",
          name: "InvalidCredentials",
          userMessageKey: "errors.auth.invalid_credentials",
        },
      });
    });

    it("should handle internal error correctly", () => {
      const error = new AppError(
        getErrorById("DB-001"),
        "PostgreSQL connection failed",
        { host: "localhost", port: 5432 }
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(503);
      expect(responseData.error.id).toBe("DB-001");
      expect(responseData.error.name).toBe("PostgresUnavailable");
      expect(responseData.error.userMessageKey).toBeUndefined();
      expect(responseData.error.runbook).toBe("docs/errors/runbooks/DB-001.md");
    });

    it("should include retry hint for retryable errors", () => {
      const error = new AppError(
        getErrorById("DB-002"),
        "MongoDB write failed"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseData.error.retryable).toBe(true);
      expect(responseData.error.retryStrategy).toBe("safe");
    });

    it("should not leak sensitive data in response", () => {
      const error = new AppError(
        getErrorById("AUTH-001"),
        "Login failed",
        {
          email: "user@example.com",
          password: "secret123",
          apiKey: "sk-1234567890",
        }
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(JSON.stringify(responseData)).not.toContain("secret123");
      expect(JSON.stringify(responseData)).not.toContain("sk-1234567890");
      expect(responseData.error.cause).toBeUndefined();
    });
  });

  describe("Non-AppError Handling", () => {
    it("should handle standard Error as GEN-001", () => {
      const error = new Error("Unexpected database error");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(500);
      expect(responseData).toEqual({
        error: {
          id: "GEN-001",
          name: "UnexpectedError",
        },
      });
    });

    it("should handle TypeError as GEN-001", () => {
      const error = new TypeError("Cannot read property 'foo' of undefined");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(500);
      expect(responseData.error.id).toBe("GEN-001");
    });

    it("should handle null error safely", () => {
      errorHandler(
        null as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(500);
      expect(responseData.error.id).toBe("GEN-001");
    });
  });

  describe("Error Severity Handling", () => {
    it("should handle minor errors correctly", () => {
      const error = new AppError(
        getErrorById("VAL-001"),
        "Invalid email format"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(400);
      expect(responseData.error.id).toBe("VAL-001");
    });

    it("should handle major errors correctly", () => {
      const error = new AppError(
        getErrorById("DB-002"),
        "MongoDB write failed"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(500);
      expect(responseData.error.id).toBe("DB-002");
    });

    it("should handle critical errors correctly", () => {
      const error = new AppError(
        getErrorById("DB-001"),
        "PostgreSQL unavailable"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(503);
      expect(responseData.error.id).toBe("DB-001");
    });
  });

  describe("HTTP Status Code Mapping", () => {
    it("should use 401 for authentication errors", () => {
      const error = new AppError(getErrorById("AUTH-003"), "Token expired");

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(401);
    });

    it("should use 403 for permission errors", () => {
      const error = new AppError(
        getErrorById("AUTH-005"),
        "Permission denied"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(403);
    });

    it("should use 404 for not found errors", () => {
      const error = new AppError(
        getErrorById("STG-002"),
        "File not found"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(404);
    });

    it("should use 429 for rate limit errors", () => {
      const error = new AppError(
        getErrorById("RL-001"),
        "Rate limit exceeded"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(429);
    });

    it("should use 503 for service unavailable errors", () => {
      const error = new AppError(
        getErrorById("ES-003"),
        "Elasticsearch unavailable"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(503);
    });
  });

  describe("Error Response Structure", () => {
    it("should always include error.id and error.name", () => {
      const error = new AppError(
        getErrorById("DB-001"),
        "Database unavailable"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseData.error.id).toBeDefined();
      expect(responseData.error.name).toBeDefined();
    });

    it("should include userMessageKey only for user-facing errors", () => {
      const internalError = new AppError(
        getErrorById("DB-002"),
        "MongoDB write failed"
      );

      errorHandler(
        internalError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      // DB-002 is internal, so no userMessageKey in response
      expect(responseData.error.userMessageKey).toBeUndefined();
    });

    it("should include runbook only for internal errors", () => {
      const internalError = new AppError(
        getErrorById("DB-001"),
        "PostgreSQL unavailable"
      );

      errorHandler(
        internalError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseData.error.runbook).toBe("docs/errors/runbooks/DB-001.md");
    });

    it("should not include runbook for user-facing errors", () => {
      const userError = new AppError(
        getErrorById("AUTH-001"),
        "Invalid credentials"
      );

      errorHandler(
        userError,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseData.error.runbook).toBeUndefined();
    });
  });
});
