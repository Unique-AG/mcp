import { McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { Client } from '@microsoft/microsoft-graph-client';
import { UnauthorizedException } from '@nestjs/common';
import { Span } from '@opentelemetry/api';
import { OTEL_ATTRIBUTES } from '../utils/otel-attributes';
import { GraphClientFactory } from './graph-client.factory';

export abstract class BaseMsGraphTool {
  protected constructor(protected readonly graphClientFactory: GraphClientFactory) {}

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
}
