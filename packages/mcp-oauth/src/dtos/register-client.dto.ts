import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const RegisterClientSchema = z.object({
  client_name: z.string().describe('The name of the client'),
  client_description: z.string().describe('The description of the client').optional(),
  logo_uri: z.string().describe('The logo of the client').optional(),
  client_uri: z.string().describe('The URI of the client').optional(),
  developer_name: z.string().describe('The name of the developer').optional(),
  developer_email: z.string().describe('The email of the developer').optional(),
  redirect_uris: z.array(z.string()).describe('The redirect URIs of the client'),
  grant_types: z
    .array(z.string())
    .describe('The grant types of the client')
    .default(['authorization_code', 'refresh_token']),
  response_types: z
    .array(z.string())
    .describe('The response types of the client')
    .default(['code']),
  token_endpoint_auth_method: z
    .string()
    .refine((val) => ['client_secret_basic', 'client_secret_post', 'none'].includes(val), {
      message: 'Invalid token endpoint auth method',
    })
    .describe('The token endpoint auth method of the client')
    .default('none'),
});

export class RegisterClientDto extends createZodDto(RegisterClientSchema) {}
