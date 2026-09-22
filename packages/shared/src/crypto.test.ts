import { decryptSecret, encryptSecret } from './crypto';

describe('vendor secret vault', () => {
  const secret = 'local-dev-encryption-key';

  it('round-trips a Kite access token', () => {
    const sealed = encryptSecret('kite-access-token-value', secret);
    expect(sealed.ciphertext).not.toContain('kite-access');
    expect(decryptSecret(sealed, secret)).toBe('kite-access-token-value');
  });

  it('refuses to seal without a key', () => {
    expect(() => encryptSecret('token', '')).toThrow(/APP_ENCRYPTION_KEY/);
  });
});
