import { Prompt } from '@unique-ag/mcp-server-module';
import { Injectable, Scope } from '@nestjs/common';
import * as z from 'zod';

const MoveThreadSchema = z.object({
  threadQuery: z.string().describe('Search hint for the thread'),
  folderName: z.string().describe('Target folder name'),
});

const AckAndFileSchema = z.object({
  messageId: z.string().describe('Originating message ID'),
  recipient: z.email().describe('Recipient to acknowledge'),
  targetFolder: z.string().describe('Folder to move original into after send'),
});

@Injectable({ scope: Scope.REQUEST })
export class WorkflowPrompts {
  @Prompt({
    name: 'workflow-move-thread',
    description: 'Locate a thread and move it to a target folder',
    parameters: MoveThreadSchema,
  })
  public moveThread({ threadQuery, folderName }: z.infer<typeof MoveThreadSchema>) {
    return {
      description: 'Move entire thread to specified folder and confirm IDs',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Locate the most relevant message for "${threadQuery}" (search-email) and move the thread to "${folderName}" (move-mail-message). ` +
              `Confirm action and list moved message IDs.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'workflow-ack-and-file',
    description: 'Draft acknowledgment and file the original message after sending',
    parameters: AckAndFileSchema,
  })
  public ackAndFile({ messageId, recipient, targetFolder }: z.infer<typeof AckAndFileSchema>) {
    return {
      description: 'Acknowledge receipt and file the original message',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Generate an acknowledgment draft to ${recipient} referencing ${messageId} (create-draft-email or send-mail after user approval). ` +
              `Once sent by user, move the originating message to "${targetFolder}" (move-mail-message). Summarize outcome.`,
          },
        },
      ],
    };
  }
}


