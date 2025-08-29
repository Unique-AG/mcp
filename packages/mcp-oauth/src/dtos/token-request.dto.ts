import { createZodDto } from 'nestjs-zod';
import * as z from 'zod';

export const TokenRequestSchema = z
  .object({
    grant_type: z
      .string()
      .refine((val) => ['authorization_code', 'refresh_token'].includes(val), {
          error: 'Invalid grant type. Only authorization_code and refresh_token are supported.'
    })
      .describe('The grant type for the token request'),

    // Authorization Code Grant fields
    code: z
      .string()
      .min(1)
      .describe('The authorization code received from the authorization server')
      .optional(),
    redirect_uri: z.url()
      .describe('The redirect URI used in the authorization request')
      .optional(),
    code_verifier: z
      .string()
      .min(43)
      .max(128)
      .regex(/^[A-Za-z0-9\-._~]+$/, 'Code verifier must contain only unreserved characters')
      .describe('PKCE code verifier')
      .optional(),

    // Refresh Token Grant fields
    refresh_token: z.string().min(1).describe('The refresh token issued to the client').optional(),

    // Scope field (used in refresh token grant)
    scope: z
      .string()
      .describe(
        'The scope of the access request expressed as a list of space-delimited, case-sensitive strings',
      )
      .optional(),

    // Client authentication fields
    client_id: z.string().min(1).describe('The client identifier issued to the client'),
    client_secret: z.string().min(1).describe('The client secret').optional(),

    // Additional fields
    resource: z.url()
      .optional()
      .transform((val) => {
        // Handle cases where JavaScript sends "undefined" as a string
        if (val === 'undefined' || val === 'null' || val === '') {
          return undefined;
        }
        return val;
      })
      .refine((val) => val === undefined || z.url().safeParse(val).success, {
          error: 'Resource must be a valid URL'
    })
      .describe(
        'The logical name of the target service where the client intends to use the requested security token',
      ),
    audience: z
      .string()
      .optional()
      .transform((val) => {
        // Handle cases where JavaScript sends "undefined" as a string
        if (val === 'undefined' || val === 'null' || val === '') {
          return undefined;
        }
        return val;
      })
      .describe(
        'The logical name of the target service where the client intends to use the requested security token',
      ),
  })
  .refine(
    (data) => {
      // Validation based on grant_type (OAuth 2.1 compliant)
      switch (data.grant_type) {
        case 'authorization_code':
          return !!data.code && !!data.redirect_uri && !!data.code_verifier; // PKCE required
        case 'refresh_token':
          return !!data.refresh_token;
        default:
          return false;
      }
    },
    {
      path: ['grant_type'],
        error: 'Required fields missing for the specified grant type'
    },
  );

export class TokenRequestDto extends createZodDto(TokenRequestSchema) {}
