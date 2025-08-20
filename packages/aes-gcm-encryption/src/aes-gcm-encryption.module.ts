import { Module } from '@nestjs/common';
import {
  AES_GCM_ENCRYPTION_MODULE_OPTIONS_RESOLVED_TOKEN,
  AES_GCM_ENCRYPTION_MODULE_OPTIONS_TOKEN,
  ConfigurableModuleClass,
  type ResolvedEncryptionOptions,
} from './aes-gcm-encryption.module-definition';
import { AesGcmEncryptionService } from './aes-gcm-encryption.service';

@Module({
  providers: [
    {
      provide: AES_GCM_ENCRYPTION_MODULE_OPTIONS_RESOLVED_TOKEN,
      useFactory: (options: {
        key: Buffer | string;
        ivLength?: number;
      }): ResolvedEncryptionOptions => {
        let keyBuffer: Buffer;
        if (Buffer.isBuffer(options.key)) {
          keyBuffer = options.key;
        } else {
          const rawKey = options.key;
          const isHex = typeof rawKey === 'string' && /^[0-9a-fA-F]{64}$/.test(rawKey);
          keyBuffer = Buffer.from(rawKey, isHex ? 'hex' : 'base64');
        }
        if (keyBuffer.length !== 32) {
          throw new Error(
            'ENCRYPTION_KEY must decode to 32 bytes. Provide 64-char hex or base64-encoded 32-byte key.',
          );
        }
        return { key: keyBuffer, ivLength: options.ivLength };
      },
      inject: [AES_GCM_ENCRYPTION_MODULE_OPTIONS_TOKEN],
    },
    AesGcmEncryptionService,
  ],
  exports: [AesGcmEncryptionService],
})
export class AesGcmEncryptionModule extends ConfigurableModuleClass {}
