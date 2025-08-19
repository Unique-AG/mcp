import { z } from 'zod';

const appSettingsSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(0).max(65535))
    .default('3000')
    .describe('The port that the MCP Server will listen on.'),
  DATABASE_URL: z
    .string()
    .url()
    .startsWith('postgresql://')
    .describe('The prisma database url for Postgres. Must start with "postgresql://".'),
  ACCESS_TOKEN_EXPIRES_IN_SECONDS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).default(60))
    .describe('The expiration time of the access token in seconds. Default is 60 seconds.'),
  REFRESH_TOKEN_EXPIRES_IN_SECONDS: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).default(30 * 24 * 60 * 60))
    .describe('The expiration time of the refresh token in seconds. Default is 30 days.'),
  MICROSOFT_CLIENT_ID: z
    .string()
    .min(1)
    .describe('The client ID of the Microsoft App Registration that the MCP Server will use.'),
  MICROSOFT_CLIENT_SECRET: z
    .string()
    .min(1)
    .describe('The client secret of the Microsoft App Registration that the MCP Server will use.'),
  HMAC_SECRET: z
    .string()
    .min(1)
    .describe('The secret key for the MCP Server to sign HMAC tokens or cookies.'),
  SELF_URL: z.string().url().describe('The URL of the MCP Server. Used for oAuth callbacks.'),
  ENCRYPTION_KEY: z
    .union([z.string(), z.instanceof(Buffer)])
    .transform((key) => {
      if (Buffer.isBuffer(key)) {
        return key;
      }

      try {
        const hexBuffer = Buffer.from(key, 'hex');
        if (hexBuffer.length === key.length / 2) return hexBuffer;
      } catch {
        // fallback to base64
      }

      return Buffer.from(key, 'base64');
    })
    .refine((buffer) => buffer.length === 32, {
      message: 'Key must be 32 bytes (AES-256)',
    })
    .describe(
      'The secret key for the MCP Server to encrypt and decrypt data. Needs to be a 32-byte (256-bit) secret.',
    ),
});

export const AppSettings = appSettingsSchema.keyof().enum;

export type AppConfig = z.infer<typeof appSettingsSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfig {
  const parsed = appSettingsSchema.parse(config);
  return parsed;
}
