import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { type Context, Tool } from '@unique-ag/mcp-server-module';
import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

const ListMailsInputSchema = z.object({
  folder: z.string().default('inbox').describe('Mail folder to read mails from'),
  limit: z.number().min(1).max(50).default(10).describe('Number of emails to retrieve'),
});

@Injectable()
export class ListMailsTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'list_mails',
    title: 'List Emails',
    description:
      'List recent emails from a specific Outlook folder. Provides a quick overview of messages with subject, sender, and preview.',
    parameters: ListMailsInputSchema,
    annotations: {
      title: 'List Emails',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'inbox',
      'unique.app/system-prompt':
        'Returns the most recent emails from the specified folder (default: inbox). Use folder parameter with well-known names like "inbox", "sentitems", "drafts", "deleteditems" or specific folder IDs from list_mail_folders.',
    },
  })
  public async listMails(
    { folder, limit }: z.infer<typeof ListMailsInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    try {
      const messages = await graphClient
        .api(`/me/mailFolders/${folder}/messages`)
        .select('subject,from,receivedDateTime,bodyPreview,importance,isRead')
        .top(limit)
        .orderby('receivedDateTime desc')
        .get();

      return {
        emails: messages.value.map((email: Message) => ({
          id: email.id,
          subject: email.subject,
          from: email.from?.emailAddress?.address,
          fromName: email.from?.emailAddress?.name,
          receivedAt: email.receivedDateTime,
          preview: email.bodyPreview,
          importance: email.importance,
          isRead: email.isRead,
        })),
        count: messages.value.length,
        folder,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to read emails from Outlook',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
