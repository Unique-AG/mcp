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

const MoveMailMessageInputSchema = z.object({
  messageId: z.string().describe('The ID of the message to move'),
  destinationFolderId: z
    .string()
    .describe(
      'The ID or well-known name of the destination folder (e.g., "inbox", "deleteditems", "drafts", "sentitems", or a specific folder ID)',
    ),
});

@Injectable()
export class MoveMailMessageTool extends BaseMsGraphTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    graphClientFactory: GraphClientFactory,
    metricService: MetricService,
    private readonly traceService: TraceService,
  ) {
    super(graphClientFactory, metricService);
  }

  @Tool({
    name: 'move_mail_message',
    title: 'Move Email to Folder',
    description:
      'Move an email message to a different folder in Outlook. Supports both well-known folder names and specific folder IDs for organization.',
    parameters: MoveMailMessageInputSchema,
    annotations: {
      title: 'Move Email to Folder',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'folder-input',
      'unique.app/system-prompt':
        'To move emails to custom folders, first use list_mail_folders to discover available folder IDs. You can use well-known names like "inbox", "deleteditems", "drafts", "sentitems" for standard folders, or specific folder IDs for custom folders. The messageId can be obtained from search_email, list_mails, or other email listing tools.',
    },
  })
  @Span((options, _context, _request) => ({
    attributes: {
      [OTEL_ATTRIBUTES.MESSAGE_ID]: options.messageId,
      [OTEL_ATTRIBUTES.DESTINATION_FOLDER]: options.destinationFolderId,
    },
  }))
  public async moveMailMessage(
    { messageId, destinationFolderId }: z.infer<typeof MoveMailMessageInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request, this.traceService.getSpan());
    this.incrementActionCounter('move_mail_message');

    try {
      const startTime = Date.now();
      const getEndpoint = `/me/messages/${messageId}`;

      const originalMessage = await graphClient
        .api(getEndpoint)
        .select('id,subject,parentFolderId')
        .get();

      const getDuration = Date.now() - startTime;
      this.trackMsgraphRequest(getEndpoint, 'GET', 200, getDuration);

      const moveStartTime = Date.now();
      const moveEndpoint = `/me/messages/${messageId}/move`;

      const movedMessage = await graphClient.api(moveEndpoint).post({
        destinationId: destinationFolderId,
      });

      const moveDuration = Date.now() - moveStartTime;
      this.trackMsgraphRequest(moveEndpoint, 'POST', 200, moveDuration);

      let destinationFolderName = destinationFolderId;
      try {
        const folderStartTime = Date.now();
        const folderEndpoint = `/me/mailFolders/${destinationFolderId}`;

        const destinationFolder = await graphClient.api(folderEndpoint).select('displayName').get();

        const folderDuration = Date.now() - folderStartTime;
        this.trackMsgraphRequest(folderEndpoint, 'GET', 200, folderDuration);

        destinationFolderName = destinationFolder.displayName || destinationFolderId;
      } catch (folderError) {
        this.logger.debug({
          msg: 'Could not retrieve destination folder name',
          destinationFolderId,
          error: serializeError(normalizeError(folderError)),
        });
      }

      this.logger.debug({
        msg: 'Message moved to new folder',
        messageId,
        originalFolderId: originalMessage.parentFolderId,
        destinationFolderId,
        destinationFolderName,
        subject: originalMessage.subject,
      });

      return {
        success: true,
        messageId: movedMessage.id,
        originalFolderId: originalMessage.parentFolderId,
        destinationFolderId: movedMessage.parentFolderId,
        destinationFolderName,
        subject: originalMessage.subject,
        message: `Message moved to "${destinationFolderName}" folder successfully`,
      };
    } catch (error) {
      this.incrementActionFailureCounter('move_mail_message', 'graph_api_error');
      this.logger.error({
        msg: 'Failed to move mail message in Outlook',
        messageId,
        destinationFolderId,
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
