/**
 * Test Mocks Index
 * Central export for all mock implementations
 */

// Re-export existing pg mock from tests/mocks/
export { Pool as MockPool, Client as MockClient } from '../../mocks/pg'

// Re-export mock builders
export {
  mockRequest,
  mockResponse,
  createMockResponse,
  ExpressRequestBuilder,
  ExpressResponseBuilder,
} from '../builders'

// Future mocks can be added here:
// export * from './redis.mock'
// export * from './elasticsearch.mock'
// export * from './queue.mock'
