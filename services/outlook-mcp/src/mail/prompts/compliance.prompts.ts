import { Prompt } from '@unique-ag/mcp-server-module';
import { Injectable, Scope } from '@nestjs/common';
import * as z from 'zod';

const ToneRiskReviewSchema = z.object({
  draftMessageId: z.string().describe('Draft message ID'),
  riskChecklist: z.array(z.string()).describe('Checklist, e.g., promissory language, MNPI, suitability'),
});

const PiiRedactionSchema = z.object({
  draftMessageId: z.string().describe('Draft message ID'),
  piiRules: z.array(z.string()).describe('PII types to redact, e.g., SSN, account #, DOB'),
});

const PhishingSchema = z.object({
  messageId: z.string().describe('Message ID to analyze for phishing'),
});

@Injectable({ scope: Scope.REQUEST })
export class CompliancePrompts {
  @Prompt({
    name: 'compliance-tone-risk-review',
    description: 'Review a draft for tone and compliance risks with suggested edits',
    parameters: ToneRiskReviewSchema,
  })
  public toneRiskReview({ draftMessageId, riskChecklist }: z.infer<typeof ToneRiskReviewSchema>) {
    const checks = riskChecklist.join(', ');
    return {
      description: 'Detect tone/risk issues and suggest edits',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Review draft ${draftMessageId} (get-mail-message) for: ${checks}. ` +
              `Return issues with severity, quotes, and suggested edits.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'compliance-pii-redaction',
    description: 'Identify and redact PII in a draft content',
    parameters: PiiRedactionSchema,
  })
  public piiRedaction({ draftMessageId, piiRules }: z.infer<typeof PiiRedactionSchema>) {
    const rules = piiRules.join(', ');
    return {
      description: 'Propose redactions for PII and produce a redacted version',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Identify and propose redactions for PII per rules (${rules}) in draft ${draftMessageId} (get-mail-message). ` +
              `Output a redacted version and a changelog.`,
          },
        },
      ],
    };
  }

  @Prompt({
    name: 'risk-phishing-suspect',
    description: 'Analyze an email for phishing/fraud red flags and recommend an action',
    parameters: PhishingSchema,
  })
  public phishingAnalysis({ messageId }: z.infer<typeof PhishingSchema>) {
    return {
      description: 'Assess phishing risk with a numeric score and advice',
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text:
              `Analyze ${messageId} (get-mail-message) for phishing red flags (spoofing, urgent requests, mismatched links). ` +
              `Provide a risk score (0-100) and recommended action.`,
          },
        },
      ],
    };
  }
}


