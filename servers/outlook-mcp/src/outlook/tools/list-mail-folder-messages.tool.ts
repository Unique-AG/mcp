import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { type Context, Tool } from '@unique-ag/mcp-server-module';
import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
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
    title: 'List Folder Messages',
    description:
      'List messages from a specific mail folder in Outlook with filtering and sorting options. More flexible than list_mails for accessing any folder.',
    parameters: ListMailFolderMessagesInputSchema,
    annotations: {
      title: 'List Folder Messages',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'mail',
      'unique.app/system-prompt':
        'Requires a folderId parameter - use list_mail_folders first to get available folder IDs. Supports OData filters for advanced filtering (e.g., "isRead eq false" for unread emails, "hasAttachments eq true" for emails with attachments). Can sort by receivedDateTime, subject, from, or importance.',
    },
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
