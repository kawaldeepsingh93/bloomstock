import { RateLimitError } from '@bloomstock/core';
import {
  EMAIL_RATE_LIMIT_MESSAGE,
  allowLocalEmailBypass,
  isEmailRateLimit,
  wrapAuthError,
} from './local-auth';

describe('local-auth', () => {
  it('detects the Supabase mailer cap', () => {
    expect(isEmailRateLimit(new Error('email rate limit exceeded'))).toBe(true);
    expect(isEmailRateLimit(new Error('otp expired'))).toBe(false);
  });

  it('wraps the mailer cap as a 429', () => {
    const wrapped = wrapAuthError(new Error('Email rate limit exceeded'));
    expect(wrapped).toBeInstanceOf(RateLimitError);
    expect((wrapped as RateLimitError).message).toBe(EMAIL_RATE_LIMIT_MESSAGE);
  });

  it('allows a localhost bypass outside production', () => {
    const request = new Request('http://localhost:3000/api/auth/magic-link', {
      headers: { origin: 'http://localhost:3000' },
    });
    expect(allowLocalEmailBypass(request)).toBe(process.env.NODE_ENV !== 'production');
  });
});
