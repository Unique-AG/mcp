import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

/**
 * Token Introspection Request DTO as defined in RFC 7662 Section 2.1
 * https://datatracker.ietf.org/doc/html/rfc7662#section-2.1
 */
export const IntrospectRequestSchema = z.object({
  token: z.string().min(1).describe('The string value of the token to introspect'),
  
  token_type_hint: z
    .enum(['access_token', 'refresh_token'])
    .optional()
    .describe(
      'A hint about the type of the token submitted for introspection. ' +
      'The introspection endpoint MAY ignore this parameter.',
    ),
  
  // Client authentication for confidential clients
  client_id: z
    .string()
    .min(1)
    .describe('The client identifier for authentication'),
  
  client_secret: z
    .string()
    .optional()
    .describe('The client secret for authentication (required for confidential clients)'),
});

export class IntrospectRequestDto extends createZodDto(IntrospectRequestSchema) {}

/**
 * Token Introspection Response as defined in RFC 7662 Section 2.2
 * https://datatracker.ietf.org/doc/html/rfc7662#section-2.2
 */
export interface IntrospectionResponse {
  active: boolean;
  scope?: string;
  client_id?: string;
  username?: string;
  token_type?: string;
  exp?: number;
  iat?: number;
  nbf?: number;
  sub?: string;
  aud?: string | string[];
  iss?: string;
  jti?: string;
  
  // Additional fields for MCP-specific metadata
  resource?: string;
  user_profile_id?: string;
}
