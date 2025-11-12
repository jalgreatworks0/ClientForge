/**
 * OpenTelemetry type augmentation
 * Adds missing Span export
 */

declare module '@opentelemetry/api' {
  export interface Span {
    end(): void
    setAttribute(key: string, value: any): this
    setAttributes(attributes: Record<string, any>): this
    setStatus(status: { code: number; message?: string }): this
    recordException(exception: Error | string): void
    isRecording(): boolean
  }

  export const SpanStatusCode: {
    OK: number
    ERROR: number
    UNSET: number
  }
}
