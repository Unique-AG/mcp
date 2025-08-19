export interface IEncryptionService {
  encryptToString(plain: Buffer | string): string;
  decryptFromString(cipherString: string): Buffer;
  encrypt?(plain: Buffer | string): unknown;
  decrypt?(payload: unknown): Buffer;
}
