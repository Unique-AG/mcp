import { Link, Span, SpanStatusCode, trace } from '@opentelemetry/api';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import {
  CompositePropagator,
  W3CBaggagePropagator,
  W3CTraceContextPropagator,
} from '@opentelemetry/core';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { B3Propagator } from '@opentelemetry/propagator-b3';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { PrismaInstrumentation } from '@prisma/instrumentation';
import { addCleanupListener, exitAfterCleanup } from 'async-cleanup';
import { z } from 'zod';
import * as packageJson from '../package.json';

const oltpOptionsSchema = z.object({
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url(),
});

export function initOpenTelemetry() {
  const oltpOptions = oltpOptionsSchema.parse(process.env);

  const otelSDK = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'outlook-mcp',
      [ATTR_SERVICE_VERSION]: packageJson.version,
    }),
    metricReader: new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter({
        url: `${oltpOptions.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`,
      }),
      exportIntervalMillis: 1000,
    }),
    spanProcessor: new BatchSpanProcessor(
      new OTLPTraceExporter({
        url: `${oltpOptions.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`,
      }),
    ),
    contextManager: new AsyncLocalStorageContextManager(),
    textMapPropagator: new CompositePropagator({
      propagators: [
        new W3CTraceContextPropagator(),
        new W3CBaggagePropagator(),
        new B3Propagator(),
      ],
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-pino': {
          disableLogSending: false, // Enable log sending to OTLP
        },
        '@opentelemetry/instrumentation-dns': { enabled: false },
        '@opentelemetry/instrumentation-net': { enabled: false },
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
      new PrismaInstrumentation(),
    ],
  });

  addCleanupListener(() => {
    otelSDK.shutdown().then(
      () => console.log('SDK shut down successfully'),
      (err) => console.log('Error shutting down SDK', err),
    );
  });

  otelSDK.start();
}

const handlerFactory = (name: string, parentSpan: Span, error: unknown) => {
  const parentLink: Link = {
    context: parentSpan.spanContext(),
  };

  trace.getTracer('default').startActiveSpan(name, { links: [parentLink] }, (span) => {
    console.error(`[${name}] unhandled or uncaught error\n%o`, error);
    if (error instanceof Error) span.recordException(error);
    const message = error instanceof Error ? error.message : new String(error).toString();
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message,
    });
    span.end();
  });
};

export async function runWithInstrumentation(fn: () => Promise<void>, name = 'unknown') {
  await trace.getTracer('default').startActiveSpan(name, async (span) => {
    const handler = (error: unknown) => handlerFactory(name, span, error);
    process.addListener('unhandledRejection', handler);
    process.addListener('uncaughtException', handler);
    addCleanupListener(() => {
      process.removeListener('unhandledRejection', handler);
      process.removeListener('uncaughtException', handler);
    });

    let exitCode = 0;
    try {
      await fn();
    } catch (error) {
      console.error(`[${name}] execution error\n%o`, error);
      // biome-ignore lint/suspicious/noExplicitAny: We have a safe fallback for exitCode
      exitCode = (error as any)?.exitCode ?? 1;

      const message = error instanceof Error ? error.message : new String(error).toString();
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message,
      });
      span.end();
      await exitAfterCleanup(exitCode);
    } finally {
      span.end();
    }
  });
}
