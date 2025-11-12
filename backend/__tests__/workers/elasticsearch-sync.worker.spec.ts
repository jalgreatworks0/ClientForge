/**
 * Unit tests for Elasticsearch Sync Worker
 */

import { runSyncJob, SyncJob } from "../../workers/elasticsearch-sync.worker";
import { Client } from "@elastic/elasticsearch";

// Mock Elasticsearch client
jest.mock("@elastic/elasticsearch");
jest.mock("../../utils/logging/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}));

describe("Elasticsearch Sync Worker", () => {
  let mockEsClient: jest.Mocked<Client>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Get mock instance
    mockEsClient = new Client({ node: "http://localhost:9200" }) as jest.Mocked<Client>;
  });

  describe("runSyncJob - index action", () => {
    it("should successfully index a document", async () => {
      const job: SyncJob = {
        index: "contacts",
        action: "index",
        id: "test-id-123",
        body: {
          name: "John Doe",
          email: "john@example.com",
        },
      };

      // Mock successful index
      (mockEsClient.index as jest.Mock) = jest.fn().mockResolvedValue({
        _index: "contacts",
        _id: "test-id-123",
        result: "created",
      });

      await runSyncJob(job);

      // Verify index was called with correct parameters
      expect(mockEsClient.index).toHaveBeenCalledWith({
        index: "contacts",
        id: "test-id-123",
        body: job.body,
      });
    });

    it("should handle index errors gracefully", async () => {
      const job: SyncJob = {
        index: "contacts",
        action: "index",
        id: "test-id-123",
        body: { name: "John Doe" },
      };

      // Mock error
      const mockError = new Error("Connection refused");
      (mockEsClient.index as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      // Should not throw, but log error
      await expect(runSyncJob(job)).resolves.not.toThrow();
    });
  });

  describe("runSyncJob - update action", () => {
    it("should successfully update a document", async () => {
      const job: SyncJob = {
        index: "contacts",
        action: "update",
        id: "test-id-123",
        body: {
          name: "Jane Doe",
        },
      };

      // Mock successful update
      (mockEsClient.update as jest.Mock) = jest.fn().mockResolvedValue({
        _index: "contacts",
        _id: "test-id-123",
        result: "updated",
      });

      await runSyncJob(job);

      // Verify update was called with correct parameters
      expect(mockEsClient.update).toHaveBeenCalledWith({
        index: "contacts",
        id: "test-id-123",
        body: { doc: job.body },
      });
    });

    it("should handle update errors gracefully", async () => {
      const job: SyncJob = {
        index: "contacts",
        action: "update",
        id: "test-id-123",
        body: { name: "Jane Doe" },
      };

      // Mock error
      const mockError = new Error("Document not found");
      (mockEsClient.update as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      // Should not throw, but log error
      await expect(runSyncJob(job)).resolves.not.toThrow();
    });
  });

  describe("runSyncJob - delete action", () => {
    it("should successfully delete a document", async () => {
      const job: SyncJob = {
        index: "contacts",
        action: "delete",
        id: "test-id-123",
      };

      // Mock successful delete
      (mockEsClient.delete as jest.Mock) = jest.fn().mockResolvedValue({
        _index: "contacts",
        _id: "test-id-123",
        result: "deleted",
      });

      await runSyncJob(job);

      // Verify delete was called with correct parameters
      expect(mockEsClient.delete).toHaveBeenCalledWith({
        index: "contacts",
        id: "test-id-123",
      });
    });

    it("should handle delete errors gracefully", async () => {
      const job: SyncJob = {
        index: "contacts",
        action: "delete",
        id: "test-id-123",
      };

      // Mock error
      const mockError = new Error("Index not found");
      (mockEsClient.delete as jest.Mock) = jest.fn().mockRejectedValue(mockError);

      // Should not throw, but log error
      await expect(runSyncJob(job)).resolves.not.toThrow();
    });
  });

  describe("runSyncJob - action validation", () => {
    it("should handle different index names", async () => {
      const indexes = ["contacts", "deals", "companies", "leads"];

      for (const index of indexes) {
        const job: SyncJob = {
          index,
          action: "index",
          id: "test-id",
          body: { test: "data" },
        };

        (mockEsClient.index as jest.Mock) = jest.fn().mockResolvedValue({ result: "created" });

        await runSyncJob(job);

        expect(mockEsClient.index).toHaveBeenCalledWith(
          expect.objectContaining({ index })
        );
      }
    });

    it("should handle complex document bodies", async () => {
      const complexBody = {
        name: "Complex Company",
        nested: {
          address: {
            street: "123 Main St",
            city: "New York",
          },
        },
        tags: ["tag1", "tag2"],
        metadata: {
          createdAt: "2025-01-01",
          updatedAt: "2025-01-15",
        },
      };

      const job: SyncJob = {
        index: "companies",
        action: "index",
        id: "complex-doc",
        body: complexBody,
      };

      (mockEsClient.index as jest.Mock) = jest.fn().mockResolvedValue({ result: "created" });

      await runSyncJob(job);

      expect(mockEsClient.index).toHaveBeenCalledWith({
        index: "companies",
        id: "complex-doc",
        body: complexBody,
      });
    });
  });
});
