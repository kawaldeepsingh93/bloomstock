import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { ConfigurationError } from '@bloomstock/core';

const SALT = 'bloomstock-vendor-vault';

function keyFromSecret(secret: string): Buffer {
  if (secret.length < 16) {
    throw new ConfigurationError('APP_ENCRYPTION_KEY must be at least 16 characters');
  }
  return scryptSync(secret, SALT, 32);
}

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  tag: string;
}

export function encryptSecret(
  plain: string,
  secret = process.env.APP_ENCRYPTION_KEY,
): EncryptedSecret {
  if (!secret) {
    throw new ConfigurationError('APP_ENCRYPTION_KEY is required to store vendor tokens');
  }
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decryptSecret(
  payload: EncryptedSecret,
  secret = process.env.APP_ENCRYPTION_KEY,
): string {
  if (!secret) {
    throw new ConfigurationError('APP_ENCRYPTION_KEY is required to read vendor tokens');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    keyFromSecret(secret),
    Buffer.from(payload.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}
