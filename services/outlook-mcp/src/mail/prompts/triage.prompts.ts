import { Prompt } from '@unique-ag/mcp-server-module';
import { Injectable, Scope } from '@nestjs/common';
import * as z from 'zod';

const ThreadSummarySchema = z.object({
  threadQuery: z.string().describe('Search terms, client name, or thread hint'),
  maxMessages: z.number().int().positive().prefault(25).describe('Max messages to include'),
});

const ExtractActionsSchema = z.object({
  messageId: z.string().describe('Email message ID to analyze'),
});

const ClassifyFolderSchema = z.object({
  messageId: z.string().describe('Email message ID to classify'),
  businessTaxonomy: z
    .array(z.string())
    .or(z.string())
    .describe("Business taxonomy, e.g., ['KYC','Onboarding','Trade Confirmations','RFP','Investor Relations']"),
});

const UrgencySlaSchema = z.object({
  messageId: z.string().describe('Email message ID to analyze'),
  slaPolicy: z.record(z.string(), z.number()).describe('Map of category -> response target (hours)'),
});

const UnreadAgingSchema = z.object({
  days: z.number().int().positive().describe('Threshold in days'),
  folder: z.string().optional().describe('Optional folder scope'),
});

@Injectable({ scope: Scope.REQUEST })
export class TriagePrompts {
  @Prompt({
    name: 'triage-summarize-thread',
    description: 'Summarize a client thread with actions, key dates, and risks',
    parameters: ThreadSummarySchema,
  })
  public summarizeThread({ threadQuery, maxMessages }: z.infer<typeof ThreadSummarySchema>) {
    return {
      description: 'Summarize the most relevant messages for a client/deal thread',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Summarize the thread for "${threadQuery}".\n` +
              `Plan: 1) search-email(query="${threadQuery}") to locate the best thread. 2) Pull up to ${maxMessages} messages in chronological order using list-mail-folder-messages or get-mail-message. 3) Output: ` +
              `Overview (3-5 bullets), Key dates, Decisions made, Open actions (assignee, due date), Risks/red flags, Next steps.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'triage-extract-action-items',
    description: 'Extract structured tasks and deadlines from a single email',
    parameters: ExtractActionsSchema,
  })
  public extractActionItems({ messageId }: z.infer<typeof ExtractActionsSchema>) {
    return {
      description: 'Extract tasks, owners, deadlines, dependencies from the email content',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Read message ${messageId} (use get-mail-message). Extract action items with fields: ` +
              `title, owner, deadline, dependencies, confidence (0-1), and source quotes. Return as a concise list.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'triage-classify-and-propose-folder',
    description: 'Classify an email and propose a target folder based on business taxonomy',
    parameters: ClassifyFolderSchema,
  })
  public classifyAndProposeFolder({ messageId, businessTaxonomy }: z.infer<typeof ClassifyFolderSchema>) {
    const taxonomy = Array.isArray(businessTaxonomy) ? businessTaxonomy.join(', ') : businessTaxonomy;
    return {
      description: 'Classify and propose a filing folder for the message',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Fetch ${messageId} (get-mail-message) and list available folders (list-mail-folders). ` +
              `Classify the message into the taxonomy: ${taxonomy}. Propose a single best target folder with rationale and confidence.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'triage-urgency-sla',
    description: 'Determine urgency and SLA target for a message with justification',
    parameters: UrgencySlaSchema,
  })
  public determineUrgencySla({ messageId, slaPolicy }: z.infer<typeof UrgencySlaSchema>) {
    return {
      description: 'Assess urgency category and SLA using provided policy',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Analyze message ${messageId} (get-mail-message). Assign urgency (Critical/High/Normal/Low), ` +
              `SLA target per policy ${JSON.stringify(slaPolicy)}, and a brief justification referencing the text.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'triage-unread-aging',
    description: 'List unread emails older than N days with brief reason-to-open',
    parameters: UnreadAgingSchema,
  })
  public listUnreadAging({ days, folder }: z.infer<typeof UnreadAgingSchema>) {
    const scope = folder ? ` in folder "${folder}"` : '';
    return {
      description: 'Identify stale unread emails for triage',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `List unread emails older than ${days} days${scope}. ` +
              `Use list-mails and/or search-email as needed. Sort by age desc. Include subject, sender, date, and a one-line reason-to-open.`,
          },
        },
      ],
    };
  }
}


