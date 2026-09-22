import { randomBytes } from 'node:crypto';
import { RateLimitError, envValue } from '@bloomstock/core';
import { createServiceClient } from '@bloomstock/database';
import { createSupabaseServer } from './auth';

export const EMAIL_RATE_LIMIT_MESSAGE =
  'Supabase hit its email sending cap (a few per hour on the built-in mailer). Wait about an hour, then send one new link.';

export function isEmailRateLimit(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /email rate limit exceeded/i.test(message);
}

export function wrapAuthError(error: unknown): unknown {
  if (isEmailRateLimit(error)) {
    return new RateLimitError(EMAIL_RATE_LIMIT_MESSAGE);
  }
  return error;
}

export function allowLocalEmailBypass(request: Request): boolean {
  if (envValue('NODE_ENV') === 'production') return false;
  const origin = request.headers.get('origin') ?? envValue('APP_URL') ?? '';
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1';
  } catch {
    return false;
  }
}

export async function signInWithoutEmail(email: string): Promise<void> {
  const service = createServiceClient();
  const password = randomBytes(24).toString('base64url');
  const created = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (created.error) {
    const listed = await service.auth.admin.listUsers({ perPage: 1000 });
    const user = listed.data.users.find((item) => item.email?.toLowerCase() === email.toLowerCase());
    if (!user) throw created.error;
    const updated = await service.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
    });
    if (updated.error) throw updated.error;
  }
  const supabase = await createSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}
