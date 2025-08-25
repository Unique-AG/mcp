import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { type Context, Tool } from '@unique-ag/mcp-server-module';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span, TraceService } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { BaseMsGraphTool } from '../../msgraph/base-msgraph.tool';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { OTEL_ATTRIBUTES } from '../../utils/otel-attributes';

const DeleteMailMessageInputSchema = z.object({
  messageId: z.string().describe('The ID of the message to delete'),
  permanent: z
    .boolean()
    .default(false)
    .describe('Whether to permanently delete (true) or move to Deleted Items (false)'),
});

@Injectable()
export class DeleteMailMessageTool extends BaseMsGraphTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    graphClientFactory: GraphClientFactory,
    metricService: MetricService,
    private readonly traceService: TraceService,
  ) {
    super(graphClientFactory, metricService);
  }

  @Tool({
    name: 'delete_mail_message',
    title: 'Delete Email',
    description:
      'Delete an email message from Outlook either by moving to trash or permanently removing. Use with caution for permanent deletion.',
    parameters: DeleteMailMessageInputSchema,
    annotations: {
      title: 'Delete Email',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'trash-2',
      'unique.app/user-prompt':
        'By default, emails are moved to the Deleted Items folder (recoverable). Set permanent to true only if you want to permanently delete the email (non-recoverable).',
      'unique.app/system-prompt':
        'Message IDs can be obtained from search_email, list_mails, or other email listing tools. Default behavior moves to Deleted Items folder. Use permanent:true with extreme caution as it cannot be undone.',
    },
  })
  @Span((options, _context, _request) => ({
    attributes: {
      [OTEL_ATTRIBUTES.MESSAGE_ID]: options.messageId,
      [OTEL_ATTRIBUTES.PERMANENT_DELETE]: options.permanent,
    },
  }))
  public async deleteMailMessage(
    { messageId, permanent }: z.infer<typeof DeleteMailMessageInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request, this.traceService.getSpan());
    this.incrementActionCounter('delete_mail_message');

    try {
      const startTime = Date.now();

      if (permanent) {
        const endpoint = `/me/messages/${messageId}`;
        await graphClient.api(endpoint).delete();

        const duration = Date.now() - startTime;
        this.trackMsgraphRequest(endpoint, 'DELETE', 200, duration);
      } else {
        const folderEndpoint = '/me/mailFolders';
        const deletedItemsResponse = await graphClient
          .api(folderEndpoint)
          .filter("displayName eq 'Deleted Items'")
          .select('id')
          .get();

        const folderDuration = Date.now() - startTime;
        this.trackMsgraphRequest(folderEndpoint, 'GET', 200, folderDuration);

        const moveStartTime = Date.now();
        const moveEndpoint = `/me/messages/${messageId}/move`;

        if (deletedItemsResponse.value.length === 0) {
          const deletedItemsFolderId = 'deleteditems';
          await graphClient.api(moveEndpoint).post({
            destinationId: deletedItemsFolderId,
          });
        } else {
          const deletedItemsFolderId = deletedItemsResponse.value[0].id;
          await graphClient.api(moveEndpoint).post({
            destinationId: deletedItemsFolderId,
          });
        }

        const moveDuration = Date.now() - moveStartTime;
        this.trackMsgraphRequest(moveEndpoint, 'POST', 200, moveDuration);
      }

      this.logger.debug({
        msg: permanent ? 'Message permanently deleted' : 'Message moved to Deleted Items',
        messageId,
        permanent,
      });

      return {
        success: true,
        messageId,
        action: permanent ? 'permanently_deleted' : 'moved_to_deleted_items',
        message: permanent
          ? 'Message has been permanently deleted'
          : 'Message has been moved to Deleted Items folder',
      };
    } catch (error) {
      this.incrementActionFailureCounter('delete_mail_message', 'graph_api_error');
      this.logger.error({
        msg: 'Failed to delete mail message from Outlook',
        messageId,
        permanent,
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
