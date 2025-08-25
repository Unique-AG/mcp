import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { type Context, Tool } from '@unique-ag/mcp-server-module';
import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { Counter } from '@opentelemetry/api';
import { MetricService, Span } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { BaseMsGraphTool } from '../../msgraph/base-msgraph.tool';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';

const ListMailsInputSchema = z.object({
  folder: z.string().default('inbox').describe('Mail folder to read mails from'),
  limit: z.number().min(1).max(50).default(10).describe('Number of emails to retrieve'),
});

@Injectable()
export class ListMailsTool extends BaseMsGraphTool {
  private readonly logger = new Logger(this.constructor.name);
  private readonly actionCounter: Counter;

  public constructor(
    graphClientFactory: GraphClientFactory,
    private readonly metric: MetricService,
  ) {
    super(graphClientFactory);
    this.actionCounter = this.metric.getCounter('outlook_actions_total', {
      description: 'Total number of Outlook actions',
    });
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
  @Span()
  public async listMails(
    { folder, limit }: z.infer<typeof ListMailsInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);
    this.actionCounter.add(1, { action: 'list_mails' });

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
