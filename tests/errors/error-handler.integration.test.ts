/**
 * Error Handler Integration Tests
 *
 * Tests the Express error handler middleware with actual AppError instances
 * All tests updated to match RFC 7807 Problem Details format
 */

import { Request, Response, NextFunction } from "express";
import { AppError } from "../../backend/utils/errors/AppError";
import { getErrorById } from "../../backend/utils/errors/registry";
import { errorHandler } from "../../backend/api/rest/v1/middleware/error-handler";
import { ExpressResponseBuilder } from "../support/builders";

// Phase 3: ACTIVE - Updated all test expectations to match RFC 7807 Problem Details format
describe("Error Handler Middleware - Integration Tests", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Response;
  let mockNext: NextFunction;
  let statusCode: number;
  let responseData: any;
  let headers: Record<string, string>;

  beforeEach(() => {
    mockRequest = {
      originalUrl: "/api/v1/test",
      path: "/api/v1/test",
    };
    statusCode = 0;
    responseData = null;
    headers = {};

    // Use ExpressResponseBuilder which provides all required Response methods
    const responseBuilder = new ExpressResponseBuilder();
    mockResponse = responseBuilder.build();

    // Override status and json to capture values for assertions
    mockResponse.status = jest.fn().mockImplementation((code: number) => {
      statusCode = code;
      return mockResponse;
    }) as any;

    mockResponse.json = jest.fn().mockImplementation((data: any) => {
      responseData = data;
      return mockResponse;
    }) as any;

    mockResponse.setHeader = jest.fn().mockImplementation((name: string, value: string) => {
      headers[name] = value;
      return mockResponse;
    }) as any;

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
      expect(headers["Content-Type"]).toBe("application/problem+json");
      expect(responseData).toMatchObject({
        type: "https://clientforge.com/errors/AUTH-001",
        title: "InvalidCredentials",
        status: 401,
        detail: "Invalid email or password",
        instance: "/api/v1/test",
        errorId: "AUTH-001",
        userMessageKey: "errors.auth.invalid_credentials",
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
      expect(headers["Content-Type"]).toBe("application/problem+json");
      expect(responseData).toMatchObject({
        type: "https://clientforge.com/errors/DB-001",
        title: "PostgresUnavailable",
        status: 503,
        detail: "PostgreSQL connection failed",
        instance: "/api/v1/test",
        errorId: "DB-001",
        runbook: "docs/errors/runbooks/DB-001.md",
      });
      expect(responseData.userMessageKey).toBeUndefined();
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

      expect(responseData).toMatchObject({
        errorId: "DB-002",
        retryable: true,
        retryStrategy: "safe",
      });
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

      const responseString = JSON.stringify(responseData);
      expect(responseString).not.toContain("secret123");
      expect(responseString).not.toContain("sk-1234567890");
      expect(responseString).not.toContain("password");
      expect(responseString).not.toContain("apiKey");
      // causeData should never be in the response
      expect(responseData.causeData).toBeUndefined();
      expect(responseData.cause).toBeUndefined();
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
      expect(headers["Content-Type"]).toBe("application/problem+json");
      expect(responseData).toMatchObject({
        type: "about:blank",
        title: "UnexpectedError",
        status: 500,
        detail: "An unexpected error occurred",
        instance: "/api/v1/test",
        errorId: "GEN-001",
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
      expect(responseData).toMatchObject({
        errorId: "GEN-001",
        title: "UnexpectedError",
        status: 500,
      });
    });

    it("should handle null error safely", () => {
      errorHandler(
        null as any,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(statusCode).toBe(500);
      expect(responseData).toMatchObject({
        errorId: "GEN-001",
        title: "UnexpectedError",
        status: 500,
      });
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
      expect(responseData).toMatchObject({
        errorId: "VAL-001",
        status: 400,
      });
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
      expect(responseData).toMatchObject({
        errorId: "DB-002",
        status: 500,
      });
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
      expect(responseData).toMatchObject({
        errorId: "DB-001",
        status: 503,
      });
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
      expect(responseData.status).toBe(401);
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
      expect(responseData.status).toBe(403);
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
      expect(responseData.status).toBe(404);
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
      expect(responseData.status).toBe(429);
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
      expect(responseData.status).toBe(503);
    });
  });

  describe("RFC 7807 Problem Details Structure", () => {
    it("should always include required RFC 7807 fields", () => {
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

      // RFC 7807 required fields
      expect(responseData.type).toBeDefined();
      expect(responseData.title).toBeDefined();
      expect(responseData.status).toBeDefined();
      expect(responseData.detail).toBeDefined();
      expect(responseData.instance).toBeDefined();

      // Our extension fields
      expect(responseData.errorId).toBeDefined();
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
      expect(responseData.userMessageKey).toBeUndefined();

      // Now test user-facing error
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

      expect(responseData.userMessageKey).toBe("errors.auth.invalid_credentials");
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

      expect(responseData.runbook).toBe("docs/errors/runbooks/DB-001.md");

      // Now test user-facing error (should not have runbook)
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

      expect(responseData.runbook).toBeUndefined();
    });

    it("should use instance from request originalUrl", () => {
      mockRequest.originalUrl = "/api/v1/users/123";
      (mockRequest as any).path = "/api/v1/users/:id";

      const error = new AppError(
        getErrorById("AUTH-001"),
        "Unauthorized"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(responseData.instance).toBe("/api/v1/users/123");
    });

    it("should set Content-Type header to application/problem+json", () => {
      const error = new AppError(
        getErrorById("AUTH-001"),
        "Unauthorized"
      );

      errorHandler(
        error,
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(headers["Content-Type"]).toBe("application/problem+json");
    });
  });
});
