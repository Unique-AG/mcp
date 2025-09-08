import type { IEncryptionService } from '../../src/interfaces/encryption-service.interface';

export class MockEncryptionService implements IEncryptionService {
  public encryptToString(plain: Buffer | string): string {
    const plainText = Buffer.isBuffer(plain) ? plain.toString() : plain;
    return Buffer.from(plainText).toString('base64');
  }

  public decryptFromString(cipherString: string): Buffer {
    return Buffer.from(cipherString, 'base64');
  }

  public encrypt(plain: Buffer | string): string {
    return this.encryptToString(plain);
  }

  public decrypt(payload: unknown): Buffer {
    if (typeof payload !== 'string') {
      throw new Error('Invalid payload for decryption');
    }
    return this.decryptFromString(payload);
  }
}
