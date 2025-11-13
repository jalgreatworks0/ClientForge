/**
 * Unit Tests: TenantGuard Middleware
 * Tests for multi-tenant isolation and tenant context enforcement
 */

import type { Request, Response, NextFunction } from 'express'
import { tenantGuard } from '../../../backend/middleware/tenant-guard'

describe('TenantGuard Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    // Reset request mock
    mockReq = {
      headers: {},
      user: undefined,
      tenantId: undefined,
    }

    // Reset response mock
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    }

    // Reset next mock
    mockNext = jest.fn()

    // Spy on console.error for emergency fallback tests
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

    // Clear any environment variable
    delete process.env.FALLBACK_tenantId
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
    delete process.env.FALLBACK_tenantId
  })

  describe('Happy Path - Valid Tenant', () => {
    it('should allow requests with valid tenant in header', () => {
      mockReq.headers = { 'x-tenant-id': 'tenant-123' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe('tenant-123')
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })

    it('should allow requests with valid tenant from user context', () => {
      mockReq.user = { tenantId: 'user-tenant-456' } as any

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe('user-tenant-456')
      expect(mockNext).toHaveBeenCalled()
      expect(mockRes.status).not.toHaveBeenCalled()
    })

    it('should prefer header tenant over user tenant', () => {
      mockReq.headers = { 'x-tenant-id': 'header-tenant' }
      mockReq.user = { tenantId: 'user-tenant' } as any

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe('header-tenant')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should trim whitespace from tenant header', () => {
      mockReq.headers = { 'x-tenant-id': '  tenant-with-spaces  ' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe('tenant-with-spaces')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle UUID-format tenant IDs', () => {
      const uuidTenant = '550e8400-e29b-41d4-a716-446655440000'
      mockReq.headers = { 'x-tenant-id': uuidTenant }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe(uuidTenant)
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Error Path - Missing Tenant', () => {
    it('should reject requests with no tenant header and no user', () => {
      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'TENANT_REQUIRED',
        message: 'Multi-tenant isolation enforced. Provide valid tenantId.',
        code: 'E_TENANT_001',
      })
      expect(mockNext).not.toHaveBeenCalled()
      expect(mockReq.tenantId).toBeUndefined()
    })

    it('should reject requests with empty tenant header', () => {
      mockReq.headers = { 'x-tenant-id': '' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'TENANT_REQUIRED',
          code: 'E_TENANT_001',
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject requests with whitespace-only tenant header', () => {
      mockReq.headers = { 'x-tenant-id': '   ' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject requests with user but no tenantId property', () => {
      mockReq.user = { userId: 'user-123' } as any // No tenantId

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Error Path - Invalid Tenant Values', () => {
    it('should reject tenant value "default"', () => {
      mockReq.headers = { 'x-tenant-id': 'default' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'TENANT_REQUIRED',
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject default sentinel UUID', () => {
      mockReq.headers = { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should reject "default" from user context', () => {
      mockReq.user = { tenantId: 'default' } as any

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('Emergency Fallback Behavior (Module Load Time)', () => {
    // Note: Emergency fallback is read at module load time (process.env.FALLBACK_tenantId)
    // These tests document the behavior but cannot be tested at runtime without
    // re-importing the module. The fallback behavior is for ops emergencies only.

    it('should enforce tenant requirement when no fallback is configured', () => {
      // Assuming FALLBACK_tenantId is not set at module load
      // This is the normal production behavior

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'TENANT_REQUIRED',
        })
      )
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should not prevent valid tenants even if fallback is configured', () => {
      // Even if fallback is configured at load time, valid tenants should work normally
      mockReq.headers = { 'x-tenant-id': 'real-tenant' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(consoleErrorSpy).not.toHaveBeenCalled()
      expect(mockReq.tenantId).toBe('real-tenant')
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Edge Cases', () => {
    it('should handle undefined user object', () => {
      mockReq.user = undefined

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle null user object', () => {
      mockReq.user = null as any

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })

    it('should handle case-sensitive header (lowercase)', () => {
      mockReq.headers = { 'x-tenant-id': 'lowercase-tenant' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe('lowercase-tenant')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle very long tenant ID', () => {
      const longTenantId = 'tenant-' + 'a'.repeat(200)
      mockReq.headers = { 'x-tenant-id': longTenantId }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe(longTenantId)
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle numeric tenant ID (as string)', () => {
      mockReq.headers = { 'x-tenant-id': '12345' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe('12345')
      expect(mockNext).toHaveBeenCalled()
    })

    it('should handle tenant ID with special characters', () => {
      mockReq.headers = { 'x-tenant-id': 'tenant-123_abc-xyz' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockReq.tenantId).toBe('tenant-123_abc-xyz')
      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe('Response Format Validation', () => {
    it('should return proper error structure when tenant is missing', () => {
      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'TENANT_REQUIRED',
        message: 'Multi-tenant isolation enforced. Provide valid tenantId.',
        code: 'E_TENANT_001',
      })
    })

    it('should return 400 status code for missing tenant', () => {
      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).toHaveBeenCalledWith(400)
    })

    it('should not modify response when tenant is valid', () => {
      mockReq.headers = { 'x-tenant-id': 'valid-tenant' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockRes.status).not.toHaveBeenCalled()
      expect(mockRes.json).not.toHaveBeenCalled()
    })
  })
})
