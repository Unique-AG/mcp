import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { type Context, Tool } from '@unique-ag/mcp-server-module';
import { Attachment, Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span, TraceService } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { BaseMsGraphTool } from '../../msgraph/base-msgraph.tool';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { OTEL_ATTRIBUTES } from '../../utils/otel-attributes';

const GetMailMessageInputSchema = z.object({
  messageId: z.string().describe('The ID of the message to retrieve'),
  includeAttachments: z
    .boolean()
    .default(false)
    .describe('Whether to include attachment information'),
  bodyFormat: z
    .enum(['text', 'html'])
    .default('text')
    .describe('Format of the message body to return'),
});

@Injectable()
export class GetMailMessageTool extends BaseMsGraphTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    graphClientFactory: GraphClientFactory,
    metricService: MetricService,
    private readonly traceService: TraceService,
  ) {
    super(graphClientFactory, metricService);
  }

  @Tool({
    name: 'get_mail_message',
    title: 'Get Email Details',
    description:
      'Retrieve complete details of a specific email message including body, recipients, attachments info, and metadata. Use this to read full email content.',
    parameters: GetMailMessageInputSchema,
    annotations: {
      title: 'Get Email Details',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'mail-open',
      'unique.app/system-prompt':
        'Fetches full email details by message ID. Message IDs can be obtained from search_email, list_mails, or list_mail_folder_messages. Set includeAttachments to true to get attachment metadata. Choose bodyFormat as "html" for formatted content or "text" for plain text.',
    },
  })
  @Span((options, _context, _request) => ({
    attributes: {
      [OTEL_ATTRIBUTES.MESSAGE_ID]: options.messageId,
      [OTEL_ATTRIBUTES.INCLUDE_ATTACHMENTS]: options.includeAttachments,
      [OTEL_ATTRIBUTES.BODY_FORMAT]: options.bodyFormat,
    },
  }))
  public async getMailMessage(
    { messageId, includeAttachments, bodyFormat }: z.infer<typeof GetMailMessageInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request, this.traceService.getSpan());
    this.incrementActionCounter('get_mail_message');

    try {
      const startTime = Date.now();
      const endpoint = `/me/messages/${messageId}`;
      const selectFields = [
        'id',
        'subject',
        'from',
        'toRecipients',
        'ccRecipients',
        'bccRecipients',
        'replyTo',
        'receivedDateTime',
        'sentDateTime',
        'body',
        'bodyPreview',
        'importance',
        'isRead',
        'isDraft',
        'hasAttachments',
        'internetMessageId',
        'conversationId',
        'parentFolderId',
        'webLink',
      ];

      const message: Message = await graphClient.api(endpoint).select(selectFields.join(',')).get();

      const duration = Date.now() - startTime;
      this.trackMsgraphRequest(endpoint, 'GET', 200, duration);

      const result = {
        id: message.id,
        subject: message.subject,
        from: {
          address: message.from?.emailAddress?.address,
          name: message.from?.emailAddress?.name,
        },
        to: message.toRecipients?.map((recipient) => ({
          address: recipient.emailAddress?.address,
          name: recipient.emailAddress?.name,
        })),
        cc: message.ccRecipients?.map((recipient) => ({
          address: recipient.emailAddress?.address,
          name: recipient.emailAddress?.name,
        })),
        bcc: message.bccRecipients?.map((recipient) => ({
          address: recipient.emailAddress?.address,
          name: recipient.emailAddress?.name,
        })),
        replyTo: message.replyTo?.map((recipient) => ({
          address: recipient.emailAddress?.address,
          name: recipient.emailAddress?.name,
        })),
        receivedAt: message.receivedDateTime,
        sentAt: message.sentDateTime,
        body: bodyFormat === 'html' ? message.body?.content : message.bodyPreview,
        bodyType: message.body?.contentType,
        preview: message.bodyPreview,
        importance: message.importance,
        isRead: message.isRead,
        isDraft: message.isDraft,
        hasAttachments: message.hasAttachments,
        internetMessageId: message.internetMessageId,
        conversationId: message.conversationId,
        parentFolderId: message.parentFolderId,
        webLink: message.webLink,
        attachments: [],
      };

      // TODO: find a way to allow Attachment download or inline base64 attachment value
      if (includeAttachments && message.hasAttachments) {
        try {
          const attachmentStartTime = Date.now();
          const attachmentEndpoint = `/me/messages/${messageId}/attachments`;

          const attachmentsResponse = await graphClient
            .api(attachmentEndpoint)
            .select('id,name,contentType,size,isInline')
            .get();

          const attachmentDuration = Date.now() - attachmentStartTime;
          this.trackMsgraphRequest(attachmentEndpoint, 'GET', 200, attachmentDuration);

          result.attachments = attachmentsResponse.value.map((attachment: Attachment) => ({
            id: attachment.id,
            name: attachment.name,
            contentType: attachment.contentType,
            size: attachment.size,
            isInline: attachment.isInline,
          }));
        } catch (attachmentError) {
          this.logger.warn({
            msg: 'Failed to fetch attachments for message',
            messageId,
            error: serializeError(normalizeError(attachmentError)),
          });
          result.attachments = [];
        }
      }

      return result;
    } catch (error) {
      this.incrementActionFailureCounter('get_mail_message', 'graph_api_error');
      this.logger.error({
        msg: 'Failed to get mail message from Outlook',
        messageId,
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
