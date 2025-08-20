import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

const MoveMailMessageInputSchema = z.object({
  messageId: z.string().describe('The ID of the message to move'),
  destinationFolderId: z
    .string()
    .describe(
      'The ID or well-known name of the destination folder (e.g., "inbox", "deleteditems", "drafts", "sentitems", or a specific folder ID)',
    ),
});

@Injectable()
export class MoveMailMessageTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'move_mail_message',
    description: 'Move an email message to a different folder in Outlook',
    parameters: MoveMailMessageInputSchema,
  })
  public async moveMailMessage(
    { messageId, destinationFolderId }: z.infer<typeof MoveMailMessageInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    try {
      const originalMessage = await graphClient
        .api(`/me/messages/${messageId}`)
        .select('id,subject,parentFolderId')
        .get();

      const movedMessage = await graphClient.api(`/me/messages/${messageId}/move`).post({
        destinationId: destinationFolderId,
      });

      let destinationFolderName = destinationFolderId;
      try {
        const destinationFolder = await graphClient
          .api(`/me/mailFolders/${destinationFolderId}`)
          .select('displayName')
          .get();
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
