/**
 * Express Response Mock Builder
 * Fluent API for building mock Express Response objects
 */

import { Response } from 'express'

export class ExpressResponseBuilder {
  private res: Partial<Response>
  private statusCode: number = 200
  private sentData: unknown = null

  constructor() {
    this.res = {
      status: jest.fn((code: number) => {
        this.statusCode = code
        return this.res as Response
      }),
      json: jest.fn((data: unknown) => {
        this.sentData = data
        return this.res as Response
      }),
      send: jest.fn((data: unknown) => {
        this.sentData = data
        return this.res as Response
      }),
      setHeader: jest.fn((name: string, value: string) => {
        return this.res as Response
      }),
      header: jest.fn((name: string, value: string) => {
        return this.res as Response
      }),
      sendStatus: jest.fn((code: number) => {
        this.statusCode = code
        return this.res as Response
      }),
      end: jest.fn(() => {
        return this.res as Response
      }),
      redirect: jest.fn((url: string) => {
        return this.res as Response
      }),
      cookie: jest.fn((name: string, value: string, options?: unknown) => {
        return this.res as Response
      }),
      clearCookie: jest.fn((name: string, options?: unknown) => {
        return this.res as Response
      }),
    }
  }

  /**
   * Build the mock response
   */
  build(): Response {
    return this.res as Response
  }

  /**
   * Get the status code that was set
   */
  getStatusCode(): number {
    return this.statusCode
  }

  /**
   * Get the data that was sent
   */
  getSentData(): unknown {
    return this.sentData
  }
}

/**
 * Create a new Express Response builder
 */
export function mockResponse(): ExpressResponseBuilder {
  return new ExpressResponseBuilder()
}

/**
 * Create a simple mock response (backwards compatible)
 */
export function createMockResponse(): Response {
  return mockResponse().build()
}
