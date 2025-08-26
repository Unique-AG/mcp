import type {
  Counter,
  Gauge,
  Histogram,
  ObservableCounter,
  ObservableGauge,
  ObservableUpDownCounter,
  UpDownCounter,
} from '@opentelemetry/api';
import type { OtelMetricOptions } from 'nestjs-otel';

export interface IMetricService {
  getCounter(name: string, options?: OtelMetricOptions): Counter;
  getUpDownCounter(name: string, options?: OtelMetricOptions): UpDownCounter;
  getHistogram(name: string, options?: OtelMetricOptions): Histogram;
  getGauge(name: string, options?: OtelMetricOptions): Gauge;
  getObservableCounter(name: string, options?: OtelMetricOptions): ObservableCounter;
  getObservableGauge(name: string, options?: OtelMetricOptions): ObservableGauge;
  getObservableUpDownCounter(name: string, options?: OtelMetricOptions): ObservableUpDownCounter;
}
