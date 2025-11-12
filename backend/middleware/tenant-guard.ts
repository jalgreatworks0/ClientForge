import type { RequestHandler } from "express";

// Optional emergency fallback (disabled by default). Do NOT set in production.
const EMERGENCY_DEFAULT_TENANT = process.env.FALLBACK_tenantId?.trim();
const DEFAULT_TENANT_SENTINEL = "00000000-0000-0000-0000-000000000001";

export const tenantGuard: RequestHandler = (req, res, next) => {
  const hdr = (req.headers["x-tenant-id"] as string | undefined)?.trim();
  const userTenant = req.user?.tenantId as string | undefined;
  const tenantId = hdr || userTenant || undefined;

  // Enforce: must be provided and not equal to default sentinel
  if (!tenantId || tenantId === "default" || tenantId === DEFAULT_TENANT_SENTINEL) {
    // Emergency fallback path (ops-only; emits CRITICAL log)
    if (EMERGENCY_DEFAULT_TENANT) {
      // eslint-disable-next-line no-console
      console.error("CRITICAL: Default tenant fallback used", {
        alert: "PAGE_OPS_TEAM",
      });
      req.tenantId = EMERGENCY_DEFAULT_TENANT;
      return next();
    }
    return res.status(400).json({
      error: "TENANT_REQUIRED",
      message: "Multi-tenant isolation enforced. Provide valid tenantId.",
      code: "E_TENANT_001",
    });
  }
  req.tenantId = tenantId;
  return next();
};
