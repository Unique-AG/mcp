import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

const ListMailFolderMessagesInputSchema = z.object({
  folderId: z.string().describe('Mail folder ID to list messages from'),
  limit: z.number().min(1).max(100).default(20).describe('Number of messages to retrieve'),
  orderBy: z
    .enum(['receivedDateTime', 'subject', 'from', 'importance'])
    .default('receivedDateTime')
    .describe('Field to order messages by'),
  orderDirection: z.enum(['asc', 'desc']).default('desc').describe('Order direction'),
  filter: z
    .string()
    .optional()
    .describe('OData filter expression (e.g., "isRead eq false" for unread messages)'),
});

@Injectable()
export class ListMailFolderMessagesTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'list_mail_folder_messages',
    description: 'List messages from a specific mail folder in Outlook',
    parameters: ListMailFolderMessagesInputSchema,
  })
  public async listMailFolderMessages(
    {
      folderId,
      limit,
      orderBy,
      orderDirection,
      filter,
    }: z.infer<typeof ListMailFolderMessagesInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    try {
      let query = graphClient
        .api(`/me/mailFolders/${folderId}/messages`)
        .select(
          'id,subject,from,receivedDateTime,bodyPreview,importance,isRead,hasAttachments,internetMessageId',
        )
        .top(limit)
        .orderby(`${orderBy} ${orderDirection}`);

      if (filter) {
        query = query.filter(filter);
      }

      const response = await query.get();

      const messages = response.value.map((message: Message) => ({
        id: message.id,
        subject: message.subject,
        from: message.from?.emailAddress?.address,
        fromName: message.from?.emailAddress?.name,
        receivedAt: message.receivedDateTime,
        preview: message.bodyPreview,
        importance: message.importance,
        isRead: message.isRead,
        hasAttachments: message.hasAttachments,
        internetMessageId: message.internetMessageId,
      }));

      return {
        folderId,
        messages,
        count: messages.length,
        orderBy,
        orderDirection,
        filter: filter || null,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to list messages from mail folder',
        folderId,
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
