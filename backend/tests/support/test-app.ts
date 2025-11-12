import express from "express";
import request from "supertest";
import { tenantGuard } from "@middleware/tenant-guard";

export function makeTestApp() {
  const app = express();
  app.use(express.json());
  // apply only for API routes (mirrors production mount)
  app.use("/api/v1", tenantGuard);
  // minimal health route for assertions
  app.get("/api/v1/health", (_req, res) => res.status(200).json({ ok: true }));
  return app;
}

// handy helper for specs that want supertest directly
export function requestApp() {
  return request(makeTestApp());
}
