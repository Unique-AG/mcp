import { ConfigurableModuleBuilder } from '@nestjs/common';

export interface EncryptionOptions {
  /**
   * 32-byte (256-bit) secret.
   * Pass it in as a Buffer, or as a base64/hex string.
   */
  key: Buffer | string;

  /** Length of the IV (nonce) in bytes. Default 12. */
  ivLength?: number;
}

export interface ResolvedEncryptionOptions extends Omit<EncryptionOptions, 'key'> {
  key: Buffer;
}

export const {
  ConfigurableModuleClass,
  MODULE_OPTIONS_TOKEN: AES_GCM_ENCRYPTION_MODULE_OPTIONS_TOKEN,
} = new ConfigurableModuleBuilder<EncryptionOptions>()
  .setExtras({ isGlobal: true }, (definition, extras) => ({
    ...definition,
    global: extras.isGlobal,
  }))
  .build();

export const AES_GCM_ENCRYPTION_MODULE_OPTIONS_RESOLVED_TOKEN = Symbol(
  'AES_GCM_ENCRYPTION_MODULE_OPTIONS_RESOLVED',
);
