import { McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { Client } from '@microsoft/microsoft-graph-client';
import { UnauthorizedException } from '@nestjs/common';
import type { Counter, Histogram } from '@opentelemetry/api';
import { Span } from '@opentelemetry/api';
import { MetricService } from 'nestjs-otel';
import { OTEL_ATTRIBUTES } from '../utils/otel-attributes';
import { GraphClientFactory } from './graph-client.factory';

export abstract class BaseMsGraphTool {
  protected readonly actionCounter: Counter;
  protected readonly actionFailureCounter: Counter;
  protected readonly msgraphRequestCounter: Counter;
  protected readonly msgraphRequestDuration: Histogram;
  protected readonly msgraphThrottleCounter: Counter;

  protected constructor(
    protected readonly graphClientFactory: GraphClientFactory,
    protected readonly metricService: MetricService,
  ) {
    this.actionCounter = metricService.getCounter('outlook_actions_total', {
      description: 'Total number of Outlook actions',
    });
    this.actionFailureCounter = metricService.getCounter('outlook_action_failures_total', {
      description: 'Total number of Outlook action failures',
    });
    this.msgraphRequestCounter = metricService.getCounter('msgraph_requests_total', {
      description: 'Total number of Microsoft Graph requests',
    });
    this.msgraphRequestDuration = metricService.getHistogram('msgraph_request_duration_seconds', {
      description: 'Microsoft Graph request duration in seconds',
    });
    this.msgraphThrottleCounter = metricService.getCounter('msgraph_throttle_events_total', {
      description: 'Total number of Microsoft Graph throttling events',
    });
  }

  /**
   * Extracts the user profile ID from the request and creates a Graph client
   * @throws UnauthorizedException if the user is not authenticated
   */
  protected getGraphClient(request: McpAuthenticatedRequest, span?: Span): Client {
    const userProfileId = request.user?.userProfileId;
    if (!userProfileId) throw new UnauthorizedException('User not authenticated');

    if (span) span.setAttribute(OTEL_ATTRIBUTES.USER_ID, userProfileId);

    return this.graphClientFactory.createClientForUser(userProfileId);
  }

  protected incrementActionCounter(action: string) {
    if (this.actionCounter) this.actionCounter.add(1, { action });
  }

  protected incrementActionFailureCounter(action: string, reason: string) {
    if (this.actionFailureCounter) this.actionFailureCounter.add(1, { action, reason });
  }

  protected trackMsgraphRequest(
    endpoint: string,
    method: string,
    statusCode: number,
    duration: number,
  ) {
    if (this.msgraphRequestCounter && this.msgraphRequestDuration) {
      const statusClass = this.getStatusClass(statusCode);
      this.msgraphRequestCounter.add(1, { endpoint, method, status_class: statusClass });
      this.msgraphRequestDuration.record(duration / 1000, { endpoint, method }); // Convert to seconds
    }
  }

  protected trackMsgraphThrottle(policy: string) {
    if (this.msgraphThrottleCounter) {
      this.msgraphThrottleCounter.add(1, { policy });
    }
  }

  private getStatusClass(statusCode: number): string {
    if (statusCode >= 200 && statusCode < 300) return '2xx';
    if (statusCode >= 300 && statusCode < 400) return '3xx';
    if (statusCode >= 400 && statusCode < 500) return '4xx';
    if (statusCode >= 500) return '5xx';
    return 'unknown';
  }
}
