import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { type Context, Tool } from '@rekog/mcp-nest';
import { serializeError } from 'serialize-error-cjs';
import { z } from 'zod';
import { type McpAuthenticatedRequest } from '../../auth/guards/mcp-auth-jwt.guard';
import { GraphClientFactory } from '../../msgraph/graph-client.factory';
import { normalizeError } from '../../utils/normalize-error';

const ReadMailsInputSchema = z.object({
  folder: z.string().default('inbox').describe('Mail folder to read from'),
  limit: z.number().min(1).max(50).default(10).describe('Number of emails to retrieve'),
});

@Injectable()
export class ReadMailsTool {
  private readonly logger = new Logger(this.constructor.name);

  public constructor(private readonly graphClientFactory: GraphClientFactory) {}

  @Tool({
    name: 'read_mails',
    description: 'Read emails from Outlook',
    parameters: ReadMailsInputSchema,
  })
  public async readMails(
    { folder, limit }: z.infer<typeof ReadMailsInputSchema>,
    _context: Context,
    request: McpAuthenticatedRequest,
  ) {
    const userProfileId = request.user?.user_profile_id;
    if (!userProfileId) throw new UnauthorizedException('User not authenticated');

    const graphClient = this.graphClientFactory.createClientForUser(userProfileId);

    try {
      const messages = await graphClient
        .api(`/me/mailFolders/${folder}/messages`)
        .select('subject,from,receivedDateTime,bodyPreview,importance,isRead')
        .top(limit)
        .orderby('receivedDateTime desc')
        .get();

      return {
        emails: messages.value.map((email: any) => ({
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
