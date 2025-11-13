/**
 * API Test Helper
 * Utilities for API testing with supertest
 */

import request from 'supertest'
import type { Express } from 'express'

/**
 * Create a supertest request with tenant header
 * @param app - Express application
 * @param tenantId - Tenant ID (defaults to "test_tenant")
 */
export function req(app: Express, tenantId = 'test_tenant') {
  return request(app).set('x-tenant-id', tenantId)
}

/**
 * Create a supertest request with auth headers
 */
export function authenticatedReq(
  app: Express,
  token: string,
  tenantId = 'test_tenant'
) {
  return request(app)
    .set('x-tenant-id', tenantId)
    .set('authorization', `Bearer ${token}`)
}

/**
 * Make a GET request
 */
export async function apiGet(
  app: Express,
  path: string,
  tenantId = 'test_tenant'
) {
  return req(app, tenantId).get(path)
}

/**
 * Make a POST request
 */
export async function apiPost(
  app: Express,
  path: string,
  body: Record<string, unknown>,
  tenantId = 'test_tenant'
) {
  return req(app, tenantId).post(path).send(body)
}

/**
 * Make a PUT request
 */
export async function apiPut(
  app: Express,
  path: string,
  body: Record<string, unknown>,
  tenantId = 'test_tenant'
) {
  return req(app, tenantId).put(path).send(body)
}

/**
 * Make a PATCH request
 */
export async function apiPatch(
  app: Express,
  path: string,
  body: Record<string, unknown>,
  tenantId = 'test_tenant'
) {
  return req(app, tenantId).patch(path).send(body)
}

/**
 * Make a DELETE request
 */
export async function apiDelete(
  app: Express,
  path: string,
  tenantId = 'test_tenant'
) {
  return req(app, tenantId).delete(path)
}

/**
 * Assert successful response (2xx)
 */
export function assertSuccess(response: request.Response): void {
  if (response.status < 200 || response.status >= 300) {
    throw new Error(
      `Expected success status, got ${response.status}: ${JSON.stringify(response.body)}`
    )
  }
}

/**
 * Assert error response with specific status code
 */
export function assertError(
  response: request.Response,
  expectedStatus: number
): void {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus}, got ${response.status}: ${JSON.stringify(response.body)}`
    )
  }
}
