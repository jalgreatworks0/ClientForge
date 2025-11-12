/**
 * Test Request Helper
 * Standard supertest wrapper with tenant header
 */

import request from 'supertest'

/**
 * Create a supertest request with tenant header
 * @param app - Express application
 * @param tenant - Tenant ID (defaults to "test_tenant")
 */
export function req(app: any, tenant = 'test_tenant') {
  return request(app).set('x-tenant-id', tenant)
}
