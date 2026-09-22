import { authCallbackUrl, messageFromAuthRedirect } from './auth-redirect';

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
