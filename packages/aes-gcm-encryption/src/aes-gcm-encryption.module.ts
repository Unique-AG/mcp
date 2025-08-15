import { Module } from '@nestjs/common';
import { ConfigurableModuleClass } from './aes-gcm-encryption.module-definition';
import { AesGcmEncryptionService } from './aes-gcm-encryption.service';

@Module({
  providers: [AesGcmEncryptionService],
  exports: [AesGcmEncryptionService],
})
export class AesGcmEncryptionModule extends ConfigurableModuleClass {}
