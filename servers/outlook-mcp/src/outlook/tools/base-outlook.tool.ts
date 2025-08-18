import { Client } from '@microsoft/microsoft-graph-client';
import { UnauthorizedException } from '@nestjs/common';
import { McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';

export abstract class BaseOutlookTool {
  protected constructor(protected readonly graphClientFactory: GraphClientFactory) {}

  /**
   * Extracts the user profile ID from the request and creates a Graph client
   * @throws UnauthorizedException if the user is not authenticated
   */
  protected getGraphClient(request: McpAuthenticatedRequest): Client {
    const userProfileId = request.user?.userProfileId
    if (!userProfileId) throw new UnauthorizedException('User not authenticated');

    return this.graphClientFactory.createClientForUser(userProfileId);
  }
}
