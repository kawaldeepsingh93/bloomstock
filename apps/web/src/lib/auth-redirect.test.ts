import {
  absolutePath,
  authCallbackUrl,
  hasAuthRedirectPayload,
  messageFromAuthRedirect,
  requestOrigin,
  sessionTokensFromHash,
} from './auth-redirect';

describe('messageFromAuthRedirect', () => {
  it('explains an expired magic link from the URL hash', () => {
    expect(
      messageFromAuthRedirect(
        '',
        '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired&sb=',
      ),
    ).toContain('invalid or has expired');
  });

  it('returns undefined when there is no auth error', () => {
    expect(messageFromAuthRedirect('', '')).toBeUndefined();
  });
});

describe('sessionTokensFromHash', () => {
  it('reads implicit-flow tokens from the URL hash', () => {
    expect(
      sessionTokensFromHash('#access_token=aaa&refresh_token=bbb&token_type=bearer&type=magiclink'),
    ).toEqual({ access_token: 'aaa', refresh_token: 'bbb' });
  });

  it('returns undefined when the hash has no session tokens', () => {
    expect(sessionTokensFromHash('#error_code=otp_expired')).toBeUndefined();
  });
});

describe('hasAuthRedirectPayload', () => {
  it('detects a PKCE code, token hash, or implicit tokens', () => {
    expect(hasAuthRedirectPayload('?code=abc', '')).toBe(true);
    expect(hasAuthRedirectPayload('?token_hash=xyz&type=email', '')).toBe(true);
    expect(hasAuthRedirectPayload('', '#access_token=aaa&refresh_token=bbb')).toBe(true);
    expect(hasAuthRedirectPayload('', '')).toBe(false);
  });
});

describe('requestOrigin', () => {
  it('uses the Host header so 127.0.0.1 is not rewritten to localhost', () => {
    const request = new Request('http://localhost:3000/dashboard', {
      headers: { host: '127.0.0.1:3000' },
    });
    expect(requestOrigin(request)).toBe('http://127.0.0.1:3000');
  });
});

describe('absolutePath', () => {
  it('keeps the request origin when building a local redirect', () => {
    expect(absolutePath('http://127.0.0.1:3000', '/auth/callback?code=abc')).toBe(
      'http://127.0.0.1:3000/auth/callback?code=abc',
    );
  });
});

describe('authCallbackUrl', () => {
  it('prefers the browser origin so localhost and 127.0.0.1 stay consistent', () => {
    const request = new Request('http://127.0.0.1:3000/api/auth/magic-link', {
      headers: { origin: 'http://localhost:3000' },
    });
    expect(authCallbackUrl(request, 'http://127.0.0.1:3000')).toBe(
      'http://localhost:3000/auth/callback',
    );
  });
});
