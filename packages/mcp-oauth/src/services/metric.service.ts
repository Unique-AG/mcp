import { Inject, Injectable } from '@nestjs/common';
import { Counter } from '@opentelemetry/api';
import { type IMetricService } from '../interfaces/imetric-service.interface';
import { METRIC_SERVICE_TOKEN } from '../mcp-oauth.module-definition';

@Injectable()
export class MetricService {
  private readonly oauthClientsRegisteredCounter: Counter | null = null;
  private readonly oauthFlowsStartedCounter: Counter | null = null;

  public constructor(
    @Inject(METRIC_SERVICE_TOKEN) private readonly metricService?: IMetricService,
  ) {
    if (this.metricService) {
      this.oauthClientsRegisteredCounter = this.metricService.getCounter(
        'oauth_clients_registered_total',
      );
      this.oauthFlowsStartedCounter = this.metricService.getCounter('oauth_flows_started_total');
    }
  }

  public incrementClientsRegistered(): void {
    if (this.oauthClientsRegisteredCounter) this.oauthClientsRegisteredCounter.add(1);
  }

  public incrementFlowsStarted(): void {
    if (this.oauthFlowsStartedCounter) this.oauthFlowsStartedCounter.add(1);
  }
}
