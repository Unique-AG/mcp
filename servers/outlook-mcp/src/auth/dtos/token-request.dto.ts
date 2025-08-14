import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const TokenRequestSchema = z
  .object({
    grant_type: z
      .string()
      .refine(
        (val) =>
          [
            'authorization_code',
            'refresh_token',
            'client_credentials',
            'password',
            'urn:ietf:params:oauth:grant-type:device_code',
          ].includes(val),
        {
          message: 'Invalid grant type',
        },
      )
      .describe('The grant type for the token request'),

    // Authorization Code Grant fields
    code: z
      .string()
      .min(1)
      .describe('The authorization code received from the authorization server')
      .optional(),
    redirect_uri: z
      .string()
      .url()
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

    // Client Credentials Grant fields
    scope: z
      .string()
      .describe(
        'The scope of the access request expressed as a list of space-delimited, case-sensitive strings',
      )
      .optional(),

    // Resource Owner Password Credentials Grant fields
    username: z.string().min(1).describe('The resource owner username').optional(),
    password: z.string().min(1).describe('The resource owner password').optional(),

    // Device Code Grant fields
    device_code: z.string().min(1).describe('The device verification code').optional(),

    // Client authentication fields
    client_id: z.string().min(1).describe('The client identifier issued to the client'),
    client_secret: z.string().min(1).describe('The client secret').optional(),

    // Additional fields
    resource: z
      .string()
      .url()
      .describe(
        'The logical name of the target service where the client intends to use the requested security token',
      )
      .optional(),
    audience: z
      .string()
      .describe(
        'The logical name of the target service where the client intends to use the requested security token',
      )
      .optional(),
  })
  .refine(
    (data) => {
      // Validation based on grant_type
      switch (data.grant_type) {
        case 'authorization_code':
          return !!data.code && !!data.redirect_uri;
        case 'refresh_token':
          return !!data.refresh_token;
        case 'client_credentials':
          return true; // Only client_id (and optionally client_secret) required
        case 'password':
          return !!data.username && !!data.password;
        case 'urn:ietf:params:oauth:grant-type:device_code':
          return !!data.device_code;
        default:
          return false;
      }
    },
    {
      message: 'Required fields missing for the specified grant type',
      path: ['grant_type'],
    },
  );

export class TokenRequestDto extends createZodDto(TokenRequestSchema) {}
