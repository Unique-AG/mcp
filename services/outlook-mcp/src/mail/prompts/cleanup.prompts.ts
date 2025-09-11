import { Prompt } from '@unique-ag/mcp-server-module';
import { Injectable, Scope } from '@nestjs/common';
import * as z from 'zod';

const DeleteNewslettersSchema = z.object({
  senderDomain: z.string().describe("Sender domain or address, e.g., 'news@provider.com'"),
  olderThanDays: z.number().int().positive().describe('Age threshold in days'),
});

@Injectable({ scope: Scope.REQUEST })
export class CleanupPrompts {
  @Prompt({
    name: 'cleanup-delete-newsletters',
    description: 'Find and optionally delete stale newsletters from a sender',
    parameters: DeleteNewslettersSchema,
  })
  public deleteStaleNewsletters({ senderDomain, olderThanDays }: z.infer<typeof DeleteNewslettersSchema>) {
    return {
      description: 'Identify stale newsletters and ask for confirmation before deletion',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Find newsletters from ${senderDomain} older than ${olderThanDays} days (search-email). ` +
              `List candidates with counts and request confirmation before using delete-mail-message.`,
          },
        },
      ],
    };
  }
}


