import { RateLimitError, envValue } from '@bloomstock/core';
import { parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { createSupabaseServer } from '@/server/auth';
import { enforceRateLimit } from '@/server/rate-limit';
import { magicLinkSchema } from '@/server/validation';
import { authCallbackUrl } from '@/lib/auth-redirect';
import {
  allowLocalEmailBypass,
  isEmailRateLimit,
  signInWithoutEmail,
  wrapAuthError,
} from '@/server/local-auth';

export async function POST(request: Request) {
  try {
    const body = parseBody(magicLinkSchema, await request.json());
    const localBypass = allowLocalEmailBypass(request);
    try {
      await enforceRateLimit(`magic:${body.email.toLowerCase()}`, 2, 60 * 60_000);
      const supabase = await createSupabaseServer();
      const redirectTo = authCallbackUrl(request, envValue('APP_URL') ?? 'http://localhost:3000');
      const { error } = await supabase.auth.signInWithOtp({
        email: body.email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: true },
      });
      if (!error) {
        return jsonOk({ message: 'Check your email for the magic link.' });
      }
      if (!localBypass || !isEmailRateLimit(error)) {
        throw wrapAuthError(error);
      }
    } catch (error) {
      if (!localBypass || !(error instanceof RateLimitError || isEmailRateLimit(error))) {
        throw wrapAuthError(error);
      }
    }
    await signInWithoutEmail(body.email);
    return jsonOk({
      message: 'Signed in locally because Supabase is not sending more login emails this hour.',
      signedIn: true,
    });
  } catch (error) {
    return jsonError(wrapAuthError(error));
  }
}
