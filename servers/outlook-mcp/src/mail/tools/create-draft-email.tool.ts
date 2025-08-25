import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { type Context, Tool } from '@unique-ag/mcp-server-module';
import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { MetricService, Span, TraceService } from 'nestjs-otel';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { BaseMsGraphTool } from '../../msgraph/base-msgraph.tool';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { OTEL_ATTRIBUTES } from '../../utils/otel-attributes';

const CreateDraftEmailInputSchema = z.object({
  to: z
    .union([z.string().email(), z.array(z.string().email())])
    .describe('Recipient email address(es)'),
  subject: z.string().describe('Email subject'),
  body: z.string().describe('Email body content'),
  isHtml: z.boolean().default(false).describe('Whether the body is HTML'),
  cc: z.array(z.string().email()).optional().describe('Carbon copy recipients'),
  bcc: z.array(z.string().email()).optional().describe('Blind carbon copy recipients'),
  importance: z.enum(['low', 'normal', 'high']).default('normal').describe('Email importance'),
});

@Injectable()
export class CreateDraftEmailTool extends BaseMsGraphTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(
    graphClientFactory: GraphClientFactory,
    metricService: MetricService,
    private readonly traceService: TraceService,
  ) {
    super(graphClientFactory, metricService);
  }

  @Tool({
    name: 'create_draft_email',
    title: 'Create Draft Email',
    description:
      'Create a new draft email in Outlook that can be edited and sent later. Use this to prepare emails without sending them immediately.',
    parameters: CreateDraftEmailInputSchema,
    annotations: {
      title: 'Create Draft Email',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'pencil-line',
      'unique.app/system-prompt':
        'Creates a draft email that will be saved in the Drafts folder. The email can be reviewed, edited, and sent manually later. Returns the draft message ID and a web link to view/edit the draft in Outlook.',
    },
  })
  @Span((options, _context, _request) => ({
    attributes: {
      [OTEL_ATTRIBUTES.RECIPIENT_COUNT]: Array.isArray(options.to) ? options.to.length : 1,
      [OTEL_ATTRIBUTES.IS_HTML]: options.isHtml,
    },
  }))
  public async createDraftEmail(
    { to, subject, body, isHtml, cc, bcc, importance }: z.infer<typeof CreateDraftEmailInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request, this.traceService.getSpan());
    this.incrementActionCounter('create_draft_email');

    const toRecipients = Array.isArray(to) ? to : [to];

    try {
      const draftMessage: Message = {
        subject: subject,
        body: {
          contentType: isHtml ? 'html' : 'text',
          content: body,
        },
        toRecipients: toRecipients.map((email) => ({
          emailAddress: {
            address: email,
          },
        })),
        ccRecipients: cc?.map((email) => ({
          emailAddress: {
            address: email,
          },
        })),
        bccRecipients: bcc?.map((email) => ({
          emailAddress: {
            address: email,
          },
        })),
        importance,
        isDraft: true,
      };

      const createdMessage: Message = await graphClient.api('/me/messages').post(draftMessage);

      this.logger.debug({
        msg: 'Draft email created',
        messageId: createdMessage.id,
      });

      return {
        success: true,
        messageId: createdMessage.id,
        subject: createdMessage.subject,
        to: toRecipients,
        cc: cc || [],
        bcc: bcc || [],
        importance,
        isDraft: createdMessage.isDraft,
        message: 'Draft email created',
        webLink: createdMessage.webLink,
      };
    } catch (error) {
      this.incrementActionFailureCounter('create_draft_email', 'graph_api_error');
      this.logger.error({
        msg: 'Failed to create draft email in Outlook',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
