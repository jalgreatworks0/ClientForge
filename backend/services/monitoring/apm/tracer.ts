/**
 * APM & Distributed Tracing Service
 * OpenTelemetry integration for monitoring and tracing
 */

// @ts-nocheck - OpenTelemetry package exports mismatch with current versions
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';

import { logger } from '../../../utils/logging/logger';

export class APMService {
  private sdk: NodeSDK | null = null;
  private initialized = false;

  /**
   * Initialize APM and tracing
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('[APM] Already initialized');
      return;
    }

    try {
      // =============================================================================
      // OPENTELEMETRY SETUP
      // =============================================================================
      const serviceName = process.env.SERVICE_NAME || 'clientforge-crm';
      const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
      const environment = process.env.NODE_ENV || 'development';

      // Configure resource
      const resource = new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      });

      // Configure trace exporter (Jaeger, Tempo, or custom OTLP endpoint)
      const traceExporter = new OTLPTraceExporter({
        url: process.env.OTLP_TRACE_ENDPOINT || 'http://localhost:4318/v1/traces',
        headers: {
          'Authorization': process.env.OTLP_AUTH_HEADER || '',
        },
      });

      // Configure metric exporter
      const metricExporter = new OTLPMetricExporter({
        url: process.env.OTLP_METRIC_ENDPOINT || 'http://localhost:4318/v1/metrics',
        headers: {
          'Authorization': process.env.OTLP_AUTH_HEADER || '',
        },
      });

      // Initialize SDK
      this.sdk = new NodeSDK({
        resource,
        spanProcessor: new BatchSpanProcessor(traceExporter),
        metricReader: new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 60000, // Export every minute
        }),
        instrumentations: [
          getNodeAutoInstrumentations({
            // Instrument everything automatically
            '@opentelemetry/instrumentation-http': {
              enabled: true,
              ignoreIncomingPaths: ['/health', '/metrics'],
            },
            '@opentelemetry/instrumentation-express': {
              enabled: true,
            },
            '@opentelemetry/instrumentation-pg': {
              enabled: true,
            },
            '@opentelemetry/instrumentation-redis-4': {
              enabled: true,
            },
            '@opentelemetry/instrumentation-mongodb': {
              enabled: true,
            },
          }),
        ],
      });

      await this.sdk.start();
      logger.info('[APM] OpenTelemetry SDK initialized', {
        serviceName,
        serviceVersion,
        environment,
      });

      // =============================================================================
      // SENTRY SETUP
      // =============================================================================
      if (process.env.SENTRY_DSN) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment,
          release: `${serviceName}@${serviceVersion}`,

          // Performance monitoring
          tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'),

          // Profiling
          profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'),
          integrations: [
            new ProfilingIntegration(),
          ],

          // Ignore common non-error events
          ignoreErrors: [
            'ECONNRESET',
            'ECONNREFUSED',
            'EPIPE',
            'EHOSTUNREACH',
            'EAI_AGAIN',
          ],

          // Filter sensitive data
          beforeSend(event, hint) {
            // Remove sensitive headers
            if (event.request?.headers) {
              delete event.request.headers.authorization;
              delete event.request.headers.cookie;
            }

            // Remove sensitive data from extra
            if (event.extra) {
              delete event.extra.password;
              delete event.extra.token;
              delete event.extra.apiKey;
            }

            return event;
          },
        });

        logger.info('[APM] Sentry initialized', {
          environment,
          tracesSampleRate: process.env.SENTRY_TRACES_SAMPLE_RATE,
        });
      }

      this.initialized = true;
      logger.info('[APM] APM service fully initialized');
    } catch (error: any) {
      logger.error('[APM] Failed to initialize APM service', {
        error: error.message,
        stack: error.stack,
      });
      throw error;
    }
  }

  /**
   * Shutdown APM gracefully
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    try {
      if (this.sdk) {
        await this.sdk.shutdown();
        logger.info('[APM] OpenTelemetry SDK shut down');
      }

      await Sentry.close(2000);
      logger.info('[APM] Sentry shut down');

      this.initialized = false;
    } catch (error: any) {
      logger.error('[APM] Error during shutdown', {
        error: error.message,
      });
    }
  }

  /**
   * Check if APM is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const apmService = new APMService();
