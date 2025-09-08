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
import type { IMetricService } from '../../src/interfaces/imetric-service.interface';

const createMockCounter = (): Counter => ({
  add: () => {},
});

const createMockUpDownCounter = (): UpDownCounter => ({
  add: () => {},
});

const createMockHistogram = (): Histogram => ({
  record: () => {},
});

const createMockGauge = (): Gauge => ({
  record: () => {},
});

const createMockObservableCounter = (): ObservableCounter => ({
  addCallback: () => {},
  removeCallback: () => {},
});

const createMockObservableGauge = (): ObservableGauge => ({
  addCallback: () => {},
  removeCallback: () => {},
});

const createMockObservableUpDownCounter = (): ObservableUpDownCounter => ({
  addCallback: () => {},
  removeCallback: () => {},
});

export class MockMetricService implements IMetricService {
  public getCounter(_name: string, _options?: OtelMetricOptions): Counter {
    return createMockCounter();
  }

  public getUpDownCounter(_name: string, _options?: OtelMetricOptions): UpDownCounter {
    return createMockUpDownCounter();
  }

  public getHistogram(_name: string, _options?: OtelMetricOptions): Histogram {
    return createMockHistogram();
  }

  public getGauge(_name: string, _options?: OtelMetricOptions): Gauge {
    return createMockGauge();
  }

  public getObservableCounter(_name: string, _options?: OtelMetricOptions): ObservableCounter {
    return createMockObservableCounter();
  }

  public getObservableGauge(_name: string, _options?: OtelMetricOptions): ObservableGauge {
    return createMockObservableGauge();
  }

  public getObservableUpDownCounter(
    _name: string,
    _options?: OtelMetricOptions,
  ): ObservableUpDownCounter {
    return createMockObservableUpDownCounter();
  }
}
