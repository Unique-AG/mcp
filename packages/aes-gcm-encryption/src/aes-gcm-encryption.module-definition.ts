import { ZodConfigurableModuleBuilder } from '@proventuslabs/nestjs-zod';
import { z } from 'zod';

export const encryptionOptionsSchema = z.object({
  /**
   * 32-byte (256-bit) secret.
   * Pass it in as a Buffer, or as a base64/hex string.
   */
  key: z
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
    .describe('The secret key for the MCP Server to sign JWT tokens.'),
  ivLength: z.number().optional().describe('Length of the IV (nonce) in bytes. Default 12.'),
});

export type EncryptionOptions = z.infer<typeof encryptionOptionsSchema>;

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: AES_GCM_ENCRYPTION_MODULE_OPTIONS_TOKEN,
} = new ZodConfigurableModuleBuilder(encryptionOptionsSchema, {
  moduleName: 'AesGcmEncryptionModule',
}).build();
