/**
 * Mock Service Builder
 * Generic builder for mocking service dependencies
 */

type MockedFunction<T = any> = jest.Mock<T>

export class MockServiceBuilder<T extends Record<string, any>> {
  private mocks: Partial<Record<keyof T, MockedFunction>> = {}

  /**
   * Mock a service method with a return value
   */
  withMethod<K extends keyof T>(
    methodName: K,
    returnValue: T[K] extends (...args: any[]) => infer R ? R : never
  ): this {
    this.mocks[methodName] = jest.fn().mockResolvedValue(returnValue) as any
    return this
  }

  /**
   * Mock a service method with custom implementation
   */
  withImplementation<K extends keyof T>(
    methodName: K,
    implementation: T[K]
  ): this {
    this.mocks[methodName] = jest.fn(implementation as any) as any
    return this
  }

  /**
   * Mock a service method that throws an error
   */
  withError<K extends keyof T>(methodName: K, error: Error): this {
    this.mocks[methodName] = jest.fn().mockRejectedValue(error) as any
    return this
  }

  /**
   * Mock a service method with a spy (calls through to real implementation)
   */
  withSpy<K extends keyof T>(methodName: K, realImplementation: T[K]): this {
    this.mocks[methodName] = jest.fn(realImplementation as any) as any
    return this
  }

  /**
   * Build the mock service
   */
  build(): T {
    return this.mocks as T
  }
}

/**
 * Create a new mock service builder
 */
export function mockService<T extends Record<string, any>>(): MockServiceBuilder<T> {
  return new MockServiceBuilder<T>()
}

/**
 * Create a simple mock object with all methods as jest.fn()
 */
export function createMock<T extends Record<string, any>>(
  methods: (keyof T)[]
): T {
  const mock: any = {}
  methods.forEach((method) => {
    mock[method] = jest.fn()
  })
  return mock as T
}
