import { z } from 'zod';

const appSettingsSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
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
  MICROSOFT_CLIENT_ID: z
    .string()
    .min(1)
    .describe('The client ID of the Microsoft App Registration that the MCP Server will use.'),
  MICROSOFT_CLIENT_SECRET: z
    .string()
    .min(1)
    .describe('The client secret of the Microsoft App Registration that the MCP Server will use.'),
  JWT_SECRET: z.string().min(1).describe('The secret key for the MCP Server to sign JWT tokens.'),
  SELF_URL: z.string().url().describe('The URL of the MCP Server. Used for oAuth callbacks.'),
});

export const AppSettings = appSettingsSchema.keyof().enum;

export type AppConfig = z.infer<typeof appSettingsSchema>;

export function validateConfig(config: Record<string, unknown>): AppConfig {
  const parsed = appSettingsSchema.parse(config);
  return parsed;
}
