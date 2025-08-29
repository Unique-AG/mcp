import type { Counter } from "@opentelemetry/api";
import { MetricService } from "nestjs-otel";
import { type FactsetClientCredentials } from "./auth/factset.client-credentials";

export abstract class BaseFactsetTool {
  protected readonly actionCounter: Counter;
  protected readonly actionFailureCounter: Counter;

  protected constructor(
    protected readonly factsetCredentials: FactsetClientCredentials,
    protected readonly metricService: MetricService,
  ) {
    this.actionCounter = metricService.getCounter('factset_actions_total', {
      description: 'Total number of Factset actions',
    });
    this.actionFailureCounter = metricService.getCounter('factset_action_failures_total', {
      description: 'Total number of Factset action failures',
    });
  }

  protected async getFactsetRequestOptions(): Promise<RequestInit> {
    return {
      headers: {
        Authorization: `Bearer ${await this.factsetCredentials.getAccessToken()}`,
      },
    }
  }

  protected incrementActionCounter(action: string) {
    if (this.actionCounter) this.actionCounter.add(1, { action });
  }

  protected incrementActionFailureCounter(action: string, reason: string) {
    if (this.actionFailureCounter) this.actionFailureCounter.add(1, { action, reason });
  }
}