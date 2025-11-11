/**
 * Custom Span Helpers
 * Utilities for creating custom traces and spans
 */

import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api';
import { logger } from '../../../utils/logging/logger';

const tracer = trace.getTracer('clientforge-crm');

/**
 * Create a custom span for a function
 */
export async function traceFunction<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  attributes?: Record<string, any>
): Promise<T> {
  return tracer.startActiveSpan(name, async (span: Span) => {
    try {
      // Add attributes
      if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
          span.setAttribute(key, value);
        });
      }

      // Execute function
      const result = await fn(span);

      // Mark as successful
      span.setStatus({ code: SpanStatusCode.OK });

      return result;
    } catch (error: any) {
      // Record error
      span.recordException(error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error.message,
      });

      throw error;
    } finally {
      span.end();
    }
  });
}

/**
 * Trace a database query
 */
export async function traceQuery<T>(
  queryName: string,
  query: string,
  fn: () => Promise<T>
): Promise<T> {
  return traceFunction(
    `db.query.${queryName}`,
    async (span) => {
      span.setAttribute('db.statement', query);
      span.setAttribute('db.system', 'postgresql');
      return await fn();
    }
  );
}

/**
 * Trace an HTTP request
 */
export async function traceHttpRequest<T>(
  method: string,
  url: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return traceFunction(
    `http.${method.toLowerCase()}.${url}`,
    async (span) => {
      span.setAttribute('http.method', method);
      span.setAttribute('http.url', url);
      const result = await fn(span);

      // Add response attributes if available
      if (result && typeof result === 'object' && 'statusCode' in result) {
        span.setAttribute('http.status_code', (result as any).statusCode);
      }

      return result;
    }
  );
}

/**
 * Trace a background job
 */
export async function traceJob<T>(
  jobName: string,
  jobId: string,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  return traceFunction(
    `job.${jobName}`,
    async (span) => {
      span.setAttribute('job.name', jobName);
      span.setAttribute('job.id', jobId);
      return await fn(span);
    }
  );
}

/**
 * Add custom attributes to current span
 */
export function addSpanAttributes(attributes: Record<string, any>): void {
  const span = trace.getActiveSpan();
  if (span) {
    Object.entries(attributes).forEach(([key, value]) => {
      span.setAttribute(key, value);
    });
  }
}

/**
 * Record an exception in the current span
 */
export function recordException(error: Error): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.recordException(error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error.message,
    });
  }
}

/**
 * Create a span event (log)
 */
export function addSpanEvent(name: string, attributes?: Record<string, any>): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

/**
 * Decorator to automatically trace class methods
 */
export function Trace(spanName?: string): MethodDecorator {
  return function (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const name = spanName || `${target.constructor.name}.${String(propertyKey)}`;

    descriptor.value = async function (...args: any[]) {
      return traceFunction(name, async (span) => {
        span.setAttribute('class', target.constructor.name);
        span.setAttribute('method', String(propertyKey));
        return await originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

/**
 * Measure execution time and add to span
 */
export async function measureTime<T>(
  label: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  try {
    const result = await fn();
    const duration = Date.now() - start;

    addSpanAttributes({
      [`${label}.duration_ms`]: duration,
    });

    addSpanEvent(`${label} completed`, {
      duration_ms: duration,
    });

    return result;
  } catch (error) {
    const duration = Date.now() - start;

    addSpanAttributes({
      [`${label}.duration_ms`]: duration,
      [`${label}.error`]: true,
    });

    throw error;
  }
}
