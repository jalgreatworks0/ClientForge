/**
 * Error Registry Contract Tests
 *
 * Ensures error registry meets all requirements:
 * - Valid YAML format
 * - No duplicate IDs or names
 * - All user-facing errors have message keys
 * - Critical errors have notify: true
 * - All message keys exist in frontend
 */

import {
  loadErrorRegistry,
  getErrorById,
  getAllErrorIds,
  getErrorsByGroup,
  getErrorsBySeverity,
  isRegisteredError,
} from "../../backend/utils/errors/registry";
import { ERROR_MESSAGES } from "../../frontend/src/errors/messages";

// TODO(phase5): Re-enable after error registry groups are fully implemented.
describe.skip("Error Registry - Contract Tests", () => {
  let registry: ReturnType<typeof loadErrorRegistry>;

  beforeAll(() => {
    registry = loadErrorRegistry();
  });

  describe("Registry Loading", () => {
    it("should load error registry successfully", () => {
      expect(registry).toBeDefined();
      expect(Object.keys(registry).length).toBeGreaterThan(0);
    });

    it("should have at least 40 registered errors", () => {
      expect(Object.keys(registry).length).toBeGreaterThanOrEqual(40);
    });

    it("should cache registry on subsequent loads", () => {
      const registry1 = loadErrorRegistry();
      const registry2 = loadErrorRegistry();
      expect(registry1).toBe(registry2); // Same object reference
    });
  });

  describe("Error ID Format", () => {
    it("all error IDs should match XXX-### pattern", () => {
      const ids = getAllErrorIds();
      const idPattern = /^[A-Z]{2,10}-\d{3}$/;

      for (const id of ids) {
        expect(id).toMatch(idPattern);
      }
    });

    it("should have no duplicate error IDs", () => {
      const ids = getAllErrorIds();
      const uniqueIds = new Set(ids);
      expect(ids.length).toBe(uniqueIds.size);
    });

    it("should have no duplicate error names", () => {
      const names = Object.values(registry).map((err) => err.name);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });
  });

  describe("Error Severity", () => {
    it("all errors should have valid severity levels", () => {
      const validSeverities = ["minor", "major", "critical"];

      for (const error of Object.values(registry)) {
        expect(validSeverities).toContain(error.severity);
      }
    });

    it("should have at least 5 critical errors", () => {
      const criticalErrors = getErrorsBySeverity("critical");
      expect(criticalErrors.length).toBeGreaterThanOrEqual(5);
    });

    it("all critical errors should have notify: true", () => {
      const criticalErrors = getErrorsBySeverity("critical");

      for (const error of criticalErrors) {
        expect(error.notify).toBe(true);
      }
    });
  });

  describe("Error Visibility", () => {
    it("all errors should have valid visibility", () => {
      const validVisibilities = ["internal", "user"];

      for (const error of Object.values(registry)) {
        expect(validVisibilities).toContain(error.visibility);
      }
    });

    it("user-facing errors should have user_message_key", () => {
      const userFacingErrors = Object.values(registry).filter(
        (err) => err.visibility === "user"
      );

      for (const error of userFacingErrors) {
        expect(error.user_message_key).toBeDefined();
        expect(error.user_message_key).toBeTruthy();
      }
    });

    it("all user message keys should exist in frontend messages", () => {
      const userFacingErrors = Object.values(registry).filter(
        (err) => err.visibility === "user" && err.user_message_key
      );

      for (const error of userFacingErrors) {
        expect(ERROR_MESSAGES[error.user_message_key!]).toBeDefined();
      }
    });
  });

  describe("Error Retry Strategy", () => {
    it("all errors should have valid retry strategy", () => {
      const validRetryStrategies = ["none", "safe", "idempotent"];

      for (const error of Object.values(registry)) {
        expect(validRetryStrategies).toContain(error.retry);
      }
    });

    it("transient errors should have retry strategy", () => {
      const transientErrors = [
        "DB-001", // PostgresUnavailable
        "ES-003", // ElasticsearchUnavailable
        "RDS-001", // RedisUnavailable
      ];

      for (const id of transientErrors) {
        if (isRegisteredError(id)) {
          const error = getErrorById(id);
          expect(error.retry).not.toBe("none");
        }
      }
    });
  });

  describe("HTTP Status Codes", () => {
    it("all errors should have valid HTTP status codes", () => {
      const validStatusCodes = [400, 401, 402, 403, 404, 429, 500, 503, 504, 507];

      for (const error of Object.values(registry)) {
        expect(validStatusCodes).toContain(error.http_status);
      }
    });

    it("authentication errors should use 401", () => {
      const authErrors = getErrorsByGroup("AUTH");

      for (const error of authErrors) {
        if (error.id !== "AUTH-005") {
          // PermissionDenied uses 403
          expect(error.http_status).toBe(401);
        }
      }
    });

    it("unavailable services should use 503", () => {
      const unavailableErrors = Object.values(registry).filter(
        (err) => err.name.includes("Unavailable") || err.name.includes("Down")
      );

      for (const error of unavailableErrors) {
        expect(error.http_status).toBe(503);
      }
    });
  });

  describe("Error Groups", () => {
    it("should have all expected error groups", () => {
      const expectedGroups = [
        "AUTH",
        "DB",
        "REDIS",
        "SEARCH",
        "QUEUE",
        "EMAIL",
        "AI",
        "FRONTEND",
        "AGENTS",
        "BILLING",
        "STORAGE",
        "VALIDATION",
        "RATE_LIMIT",
        "GENERAL",
      ];

      for (const group of expectedGroups) {
        const errors = getErrorsByGroup(group);
        expect(errors.length).toBeGreaterThan(0);
      }
    });

    it("each group should have at least 2 errors", () => {
      const groups = [
        "AUTH",
        "DB",
        "RDS",
        "ES",
        "QUEUE",
        "MAIL",
        "AI",
        "FE",
        "AGT",
        "BIL",
        "STG",
        "VAL",
        "RL",
        "GEN",
      ];

      for (const group of groups) {
        const errors = getErrorsByGroup(group);
        expect(errors.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("Error Lookup", () => {
    it("should retrieve error by valid ID", () => {
      const error = getErrorById("AUTH-001");
      expect(error.id).toBe("AUTH-001");
      expect(error.name).toBe("InvalidCredentials");
    });

    it("should return fallback for invalid ID", () => {
      const error = getErrorById("INVALID-999");
      expect(error.id).toBe("GEN-001");
      expect(error.name).toBe("UnexpectedError");
    });

    it("should correctly identify registered errors", () => {
      expect(isRegisteredError("AUTH-001")).toBe(true);
      expect(isRegisteredError("INVALID-999")).toBe(false);
    });
  });

  describe("Runbook Links", () => {
    it("most errors should have runbook links", () => {
      const errorsWithRunbooks = Object.values(registry).filter(
        (err) => err.runbook
      );
      const totalErrors = Object.keys(registry).length;

      expect(errorsWithRunbooks.length).toBeGreaterThan(totalErrors * 0.8);
    });

    it("all critical errors should have runbook links", () => {
      const criticalErrors = getErrorsBySeverity("critical");

      for (const error of criticalErrors) {
        expect(error.runbook).toBeDefined();
        expect(error.runbook).toBeTruthy();
      }
    });

    it("runbook links should follow correct format", () => {
      const runbookPattern = /^docs\/errors\/runbooks\/[A-Z]{2,10}-\d{3}\.md$/;

      for (const error of Object.values(registry)) {
        if (error.runbook) {
          expect(error.runbook).toMatch(runbookPattern);
        }
      }
    });
  });

  describe("Error Registry Metadata", () => {
    it("should export ERROR_REGISTRY_META", () => {
      const { ERROR_REGISTRY_META } = require("../../backend/utils/errors/generated-types");

      expect(ERROR_REGISTRY_META.version).toBe(1);
      expect(ERROR_REGISTRY_META.totalErrors).toBeGreaterThan(40);
      expect(ERROR_REGISTRY_META.errorIds).toBeInstanceOf(Array);
    });
  });
});
