import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
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
    description: 'List emails from Outlook',
    parameters: ListMailsInputSchema,
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
