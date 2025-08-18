/**
 * Interface for encryption services used by the AuthModule.
 * This abstraction allows different encryption implementations to be used.
 */
export interface IEncryptionService {
  /**
   * Encrypts a string or buffer and returns it as a string
   */
  encryptToString(plain: Buffer | string): string;

  /**
   * Decrypts a string back to a Buffer
   */
  decryptFromString(cipherString: string): Buffer;

  /**
   * Encrypts a string or buffer and returns a structured payload
   */
  encrypt?(plain: Buffer | string): unknown;

  /**
   * Decrypts a structured payload back to a Buffer
   */
  decrypt?(payload: unknown): Buffer;
}
