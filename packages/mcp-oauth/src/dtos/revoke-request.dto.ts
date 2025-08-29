import { createZodDto } from 'nestjs-zod';
import * as z from 'zod';

/**
 * Token Revocation Request DTO as defined in RFC 7009 Section 2.1
 * https://datatracker.ietf.org/doc/html/rfc7009#section-2.1
 */
export const RevokeRequestSchema = z.object({
  token: z.string().min(1).describe('The token that the client wants to revoke'),

  token_type_hint: z
    .enum(['access_token', 'refresh_token'])
    .optional()
    .describe(
      'A hint about the type of the token submitted for revocation. ' +
        'Clients MAY pass this parameter to help the authorization server optimize token lookup.',
    ),

  // Client authentication for confidential clients
  client_id: z.string().min(1).describe('The client identifier for authentication'),

  client_secret: z
    .string()
    .optional()
    .describe('The client secret for authentication (required for confidential clients)'),
});

export class RevokeRequestDto extends createZodDto(RevokeRequestSchema) {}
