import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { type Context, Tool } from '@unique-ag/mcp-server-module';
import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { BaseMsGraphTool } from '../../msgraph/base-msgraph.tool';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';

const SendMailInput = z.object({
  to: z
    .union([z.string().email(), z.array(z.string().email())])
    .describe('Recipient email address'),
  subject: z.string().describe('Email subject'),
  body: z.string().describe('Email body content'),
  isHtml: z.boolean().default(false).describe('Whether the body is HTML'),
  cc: z.array(z.string().email()).optional().describe('Carbon copy recipients'),
  bcc: z.array(z.string().email()).optional().describe('Blind carbon copy recipients'),
});

@Injectable()
export class SendMailTool extends BaseMsGraphTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'send_mail',
    title: 'Send Email',
    description:
      'Send an email immediately via Outlook. Use this for direct email sending with recipients, subject, and body content.',
    parameters: SendMailInput,
    annotations: {
      title: 'Send Email',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: true,
    },
    _meta: {
      'unique.app/icon': 'send',
      'unique.app/user-prompt':
        'This tool will immediately send the email. Consider using create_draft_email instead if you want to review the email before sending.',
    },
  })
  public async sendMail(
    { to, subject, body, isHtml, cc, bcc }: z.infer<typeof SendMailInput>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    const toRecipients = Array.isArray(to) ? to : [to];

    try {
      const message: Message = {
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
      };

      await graphClient.api('/me/sendMail').post({ message });

      return {
        success: true,
        message: `Email sent successfully to ${to}`,
      };
    } catch (error) {
      this.logger.error({
        msg: 'Failed to send email via Outlook',
        error: serializeError(normalizeError(error)),
      });
      throw new InternalServerErrorException(error);
    }
  }
}
