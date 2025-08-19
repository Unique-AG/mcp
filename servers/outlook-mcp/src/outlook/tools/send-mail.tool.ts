import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { type McpAuthenticatedRequest } from '@unique-ag/mcp-oauth';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

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
export class SendMailTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'send_mail',
    description: 'Send an email via Outlook',
    parameters: SendMailInput,
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
