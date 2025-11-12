/**
 * Tenant Guard Integration Tests
 * Validates multi-tenant enforcement middleware
 *
 * Run with: npm run test:integration
 */

import { Request, Response, NextFunction } from 'express'
import { tenantGuard } from '../../../backend/middleware/tenant-guard'

// TODO(phase5): Re-enable after tenant-guard middleware implementation is complete.
describe.skip('Tenant Guard Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let mockNext: NextFunction
  let jsonSpy: jest.Mock
  let statusSpy: jest.Mock

  beforeEach(() => {
    jsonSpy = jest.fn()
    statusSpy = jest.fn().mockReturnValue({ json: jsonSpy })

    mockReq = {
      headers: {},
      user: undefined,
    }

    mockRes = {
      status: statusSpy,
      json: jsonSpy,
    }

    mockNext = jest.fn()
  })

  describe('when x-tenant-id header is missing', () => {
    it('returns 400 TENANT_REQUIRED', () => {
      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(jsonSpy).toHaveBeenCalledWith({
        error: 'TENANT_REQUIRED',
        message: 'Multi-tenant isolation enforced. Provide valid tenantId.',
        code: 'E_TENANT_001',
      })
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('when x-tenant-id is "default"', () => {
    it('returns 400 TENANT_REQUIRED', () => {
      mockReq.headers = { 'x-tenant-id': 'default' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('when x-tenant-id is the sentinel default', () => {
    it('returns 400 TENANT_REQUIRED', () => {
      mockReq.headers = { 'x-tenant-id': '00000000-0000-0000-0000-000000000001' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(statusSpy).toHaveBeenCalledWith(400)
      expect(mockNext).not.toHaveBeenCalled()
    })
  })

  describe('when x-tenant-id header is present', () => {
    it('allows request and sets req.tenantId', () => {
      mockReq.headers = { 'x-tenant-id': 'tenant_abc123' }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(statusSpy).not.toHaveBeenCalled()
      expect(mockReq.tenantId).toBe('tenant_abc123')
    })
  })

  describe('when req.user.tenantId is present', () => {
    it('allows request and sets req.tenantId from user', () => {
      mockReq.user = {
        id: 'user123',
        email: 'test@example.com',
        tenantId: 'tenant_from_user',
      }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(statusSpy).not.toHaveBeenCalled()
      expect(mockReq.tenantId).toBe('tenant_from_user')
    })
  })

  describe('when both header and user.tenantId are present', () => {
    it('prefers header x-tenant-id', () => {
      mockReq.headers = { 'x-tenant-id': 'tenant_from_header' }
      mockReq.user = {
        id: 'user123',
        email: 'test@example.com',
        tenantId: 'tenant_from_user',
      }

      tenantGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(mockNext).toHaveBeenCalled()
      expect(mockReq.tenantId).toBe('tenant_from_header')
    })
  })

  describe('emergency fallback (FALLBACK_TENANT_ID env var)', () => {
    let originalEnv: string | undefined

    beforeEach(() => {
      originalEnv = process.env.FALLBACK_TENANT_ID
    })

    afterEach(() => {
      if (originalEnv !== undefined) {
        process.env.FALLBACK_TENANT_ID = originalEnv
      } else {
        delete process.env.FALLBACK_TENANT_ID
      }
    })

    it('uses fallback when configured and logs critical error', () => {
      process.env.FALLBACK_TENANT_ID = 'emergency_tenant'
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()

      // Reload middleware to pick up env change
      jest.resetModules()
      const { tenantGuard: reloadedGuard } = require('../../../backend/middleware/tenant-guard')

      reloadedGuard(mockReq as Request, mockRes as Response, mockNext)

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'CRITICAL: Default tenant fallback used',
        { alert: 'PAGE_OPS_TEAM' }
      )
      expect(mockNext).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })
})
