/**
 * Express Request Mock Builder
 * Fluent API for building mock Express Request objects
 */

import { Request } from 'express'

export class ExpressRequestBuilder {
  private req: Partial<Request>

  constructor() {
    this.req = {
      headers: {},
      body: {},
      query: {},
      params: {},
      method: 'GET',
      url: '/',
      protocol: 'http',
      get: jest.fn((header: string) => {
        const value = this.req.headers?.[header.toLowerCase()]
        return Array.isArray(value) ? value : value ? [value] : undefined
      }) as any,
    } as any
  }

  /**
   * Set tenant ID header
   */
  withTenant(tenantId: string): this {
    this.req.headers = { ...this.req.headers, 'x-tenant-id': tenantId }
    return this
  }

  /**
   * Set authorization header and user context
   */
  withAuth(userId: string, token?: string): this {
    this.req.headers = {
      ...this.req.headers,
      authorization: `Bearer ${token ?? 'mock-jwt-token'}`,
    }
    this.req.user = { id: userId, tenantId: 'test_tenant' } as any
    return this
  }

  /**
   * Set request body
   */
  withBody(body: Record<string, unknown>): this {
    this.req.body = body
    return this
  }

  /**
   * Set query parameters
   */
  withQuery(query: Record<string, string>): this {
    this.req.query = query
    return this
  }

  /**
   * Set route parameters
   */
  withParams(params: Record<string, string>): this {
    this.req.params = params
    return this
  }

  /**
   * Set HTTP method
   */
  withMethod(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'): this {
    this.req.method = method
    return this
  }

  /**
   * Set request path
   */
  withPath(path: string): this {
    ;(this.req as any).path = path
    this.req.url = path
    return this
  }

  /**
   * Set custom header
   */
  withHeader(key: string, value: string): this {
    this.req.headers = { ...this.req.headers, [key.toLowerCase()]: value }
    return this
  }

  /**
   * Set IP address
   */
  withIP(ip: string): this {
    ;(this.req as any).ip = ip
    return this
  }

  /**
   * Build the mock request
   */
  build(): Request {
    return this.req as Request
  }
}

/**
 * Create a new Express Request builder
 */
export function mockRequest(): ExpressRequestBuilder {
  return new ExpressRequestBuilder()
}
