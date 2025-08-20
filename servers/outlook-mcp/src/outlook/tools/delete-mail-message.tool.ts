import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

const DeleteMailMessageInputSchema = z.object({
  messageId: z.string().describe('The ID of the message to delete'),
  permanent: z
    .boolean()
    .default(false)
    .describe('Whether to permanently delete (true) or move to Deleted Items (false)'),
});

@Injectable()
export class DeleteMailMessageTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'delete_mail_message',
    description: 'Delete a specific email message from Outlook',
    parameters: DeleteMailMessageInputSchema,
  })
  public async deleteMailMessage(
    { messageId, permanent }: z.infer<typeof DeleteMailMessageInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    try {
      if (permanent) {
        await graphClient.api(`/me/messages/${messageId}`).delete();
      } else {
        const deletedItemsResponse = await graphClient
          .api('/me/mailFolders')
          .filter("displayName eq 'Deleted Items'")
          .select('id')
          .get();

        if (deletedItemsResponse.value.length === 0) {
          const deletedItemsFolderId = 'deleteditems';
          await graphClient.api(`/me/messages/${messageId}/move`).post({
            destinationId: deletedItemsFolderId,
          });
        } else {
          const deletedItemsFolderId = deletedItemsResponse.value[0].id;
          await graphClient.api(`/me/messages/${messageId}/move`).post({
            destinationId: deletedItemsFolderId,
          });
        }
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
