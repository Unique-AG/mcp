import { Message } from '@microsoft/microsoft-graph-types';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { type McpAuthenticatedRequest } from '../../auth/guards/mcp-auth-jwt.guard';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';
import { BaseOutlookTool } from './base-outlook.tool';

const SendMailInput = z.object({
  to: z.string().email().describe('Recipient email address'),
  subject: z.string().describe('Email subject'),
  body: z.string().describe('Email body content'),
  isHtml: z.boolean().default(false).describe('Whether the body is HTML'),
});

@Injectable()
export class SendMailTool extends BaseOutlookTool {
  private readonly logger = new Logger(this.constructor.name);

  // biome-ignore lint/complexity/noUselessConstructor: We need the constructor for DI to work.
  public constructor(graphClientFactory: GraphClientFactory) {
    super(graphClientFactory);
  }

  @Tool({
    name: 'send_mail',
    description: 'Send an email via Outlook',
    parameters: SendMailInput,
  })
  public async sendMail(
    { to, subject, body, isHtml }: z.infer<typeof SendMailInput>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const graphClient = this.getGraphClient(request);

    try {
      const message: Message = {
        subject: subject,
        body: {
          contentType: isHtml ? 'html' : 'text',
          content: body,
        },
        toRecipients: [
          {
            emailAddress: {
              address: to,
            },
          },
        ],
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
