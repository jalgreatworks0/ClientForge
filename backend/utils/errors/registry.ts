/**
 * Central Error Registry - Registry Loader
 *
 * Loads and caches the error registry from config/errors/error-registry.yaml
 * Provides type-safe access to all registered errors
 */

import fs from "node:fs";
import path from "node:path";

import yaml from "js-yaml";

import { RegistryError } from "./AppError";

export interface ErrorRegistry {
  [id: string]: RegistryError;
}

interface YAMLErrorDefinition {
  id: string;
  name: string;
  http_status?: number;
  severity?: "minor" | "major" | "critical";
  visibility?: "internal" | "user";
  user_message_key?: string;
  runbook?: string;
  retry?: "none" | "safe" | "idempotent";
  notify?: boolean;
}

interface YAMLGroup {
  description: string;
  product_area: string;
  errors: YAMLErrorDefinition[];
}

interface YAMLRegistry {
  version: number;
  owner: string;
  defaults?: {
    http_status?: number;
    severity?: "minor" | "major" | "critical";
    visibility?: "internal" | "user";
    retry?: "none" | "safe" | "idempotent";
    notify?: boolean;
  };
  groups: {
    [groupName: string]: YAMLGroup;
  };
}

let cache: ErrorRegistry | null = null;

/**
 * Load the error registry from YAML
 * Results are cached after first load
 */
export function loadErrorRegistry(): ErrorRegistry {
  if (cache) return cache;

  const registryPath = path.resolve(
    process.cwd(),
    "config/errors/error-registry.yaml"
  );

  if (!fs.existsSync(registryPath)) {
    throw new Error(
      `Error registry not found at: ${registryPath}. Run 'npm run errors:init' to create it.`
    );
  }

  const fileContent = fs.readFileSync(registryPath, "utf8");
  const doc = yaml.load(fileContent) as YAMLRegistry;

  const out: ErrorRegistry = {};
  const defaults = doc.defaults || {};

  for (const [groupName, group] of Object.entries(doc.groups || {})) {
    if (!group.errors) {
      console.warn(`[ErrorRegistry] Group ${groupName} has no errors defined`);
      continue;
    }

    for (const errorDef of group.errors) {
      // Validate error ID format
      if (!/^[A-Z]{2,10}-\d{3}$/.test(errorDef.id)) {
        throw new Error(
          `[ErrorRegistry] Invalid error ID format: ${errorDef.id}. Expected format: XXX-### (e.g., AUTH-001 or QUEUE-001)`
        );
      }

      // Check for duplicates
      if (out[errorDef.id]) {
        throw new Error(
          `[ErrorRegistry] Duplicate error ID in registry: ${errorDef.id}`
        );
      }

      // Merge with defaults
      out[errorDef.id] = {
        id: errorDef.id,
        name: errorDef.name,
        http_status: errorDef.http_status ?? defaults.http_status ?? 500,
        severity: errorDef.severity ?? defaults.severity ?? "major",
        visibility: errorDef.visibility ?? defaults.visibility ?? "internal",
        user_message_key: errorDef.user_message_key,
        runbook: errorDef.runbook,
        retry: errorDef.retry ?? defaults.retry ?? "none",
        notify: errorDef.notify ?? defaults.notify ?? false,
      };
    }
  }

  console.log(`[ErrorRegistry] Loaded ${Object.keys(out).length} error definitions`);
  cache = out;
  return out;
}

/**
 * Get a specific error by ID
 * Throws if error ID is not registered
 */
export function getErrorById(id: string): RegistryError {
  const registry = loadErrorRegistry();
  const error = registry[id];

  if (!error) {
    console.error(`[ErrorRegistry] Unknown error ID: ${id}`);
    // Return a fallback error instead of throwing
    return {
      id: "GEN-001",
      name: "UnexpectedError",
      http_status: 500,
      severity: "major",
      visibility: "internal",
      retry: "none",
      notify: false,
    };
  }

  return error;
}

/**
 * Get all error IDs
 */
export function getAllErrorIds(): string[] {
  const registry = loadErrorRegistry();
  return Object.keys(registry).sort();
}

/**
 * Get errors by group (e.g., 'AUTH', 'DB', 'ES')
 */
export function getErrorsByGroup(groupPrefix: string): RegistryError[] {
  const registry = loadErrorRegistry();
  return Object.values(registry)
    .filter((err) => err.id.startsWith(groupPrefix + "-"))
    .sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Get errors by severity
 */
export function getErrorsBySeverity(
  severity: "minor" | "major" | "critical"
): RegistryError[] {
  const registry = loadErrorRegistry();
  return Object.values(registry).filter((err) => err.severity === severity);
}

/**
 * Check if an error ID exists in the registry
 */
export function isRegisteredError(id: string): boolean {
  const registry = loadErrorRegistry();
  return id in registry;
}

/**
 * Clear the cache (useful for testing)
 */
export function clearCache(): void {
  cache = null;
}
