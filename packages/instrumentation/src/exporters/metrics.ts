import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import {
  ConsoleMetricExporter,
  MetricReader,
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import type { MetricsExporter, OtelConfig } from '../config.js';

export function createMetricReader(config: OtelConfig): MetricReader | undefined {
  const exporterType: MetricsExporter = config.OTEL_METRICS_EXPORTER;

  switch (exporterType) {
    case 'otlp': {
      const metricsEndpoint =
        config.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
        (config.OTEL_EXPORTER_OTLP_ENDPOINT && `${config.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`);

      if (!metricsEndpoint) {
        console.warn(
          'OTLP metrics exporter requested but no endpoint configured. Skipping metrics export.',
        );
        return undefined;
      }

      console.log(`  Metrics Endpoint: ${metricsEndpoint}`);
      return new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({
          url: metricsEndpoint,
        }),
        exportIntervalMillis: config.OTEL_METRIC_EXPORT_INTERVAL,
      });
    }

    case 'prometheus':
      console.log(
        `  Prometheus Endpoint: http://${config.OTEL_EXPORTER_PROMETHEUS_HOST}:${config.OTEL_EXPORTER_PROMETHEUS_PORT}/metrics`,
      );
      return new PrometheusExporter({
        port: config.OTEL_EXPORTER_PROMETHEUS_PORT,
        host: config.OTEL_EXPORTER_PROMETHEUS_HOST,
      });

    case 'console':
      console.log('  Using console metrics exporter');
      return new PeriodicExportingMetricReader({
        exporter: new ConsoleMetricExporter(),
        exportIntervalMillis: config.OTEL_METRIC_EXPORT_INTERVAL,
      });

    case 'none':
      console.log('  Metrics export disabled');
      return undefined;

    default:
      console.warn(`Unknown metrics exporter: ${exporterType}. Falling back to OTLP.`);
      return createMetricReader({ ...config, OTEL_METRICS_EXPORTER: 'otlp' });
  }
}
