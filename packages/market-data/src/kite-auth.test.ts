import { ConfigurationError } from '@bloomstock/core';
import { kiteLoginUrl, resolveKiteAccessToken } from './kite-auth';

describe('resolveKiteAccessToken', () => {
  const original = process.env.KITE_ACCESS_TOKEN;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.KITE_ACCESS_TOKEN;
    } else {
      process.env.KITE_ACCESS_TOKEN = original;
    }
  });

  it('prefers the sealed vault token over the env fallback', () => {
    process.env.KITE_ACCESS_TOKEN = 'env-token';
    expect(resolveKiteAccessToken('vault-token')).toBe('vault-token');
  });

  it('falls back to KITE_ACCESS_TOKEN when the vault is empty', () => {
    process.env.KITE_ACCESS_TOKEN = 'env-token';
    expect(resolveKiteAccessToken(null)).toBe('env-token');
  });

  it('fails closed when neither vault nor env has a token', () => {
    delete process.env.KITE_ACCESS_TOKEN;
    expect(() => resolveKiteAccessToken(null)).toThrow(ConfigurationError);
  });
});

describe('kiteLoginUrl', () => {
  it('refuses to start OAuth without an API key', () => {
    const original = process.env.KITE_API_KEY;
    delete process.env.KITE_API_KEY;
    try {
      expect(() => kiteLoginUrl(undefined)).toThrow(ConfigurationError);
    } finally {
      if (original === undefined) {
        delete process.env.KITE_API_KEY;
      } else {
        process.env.KITE_API_KEY = original;
      }
    }
  });
});
