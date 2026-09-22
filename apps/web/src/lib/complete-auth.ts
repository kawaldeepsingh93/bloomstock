'use client';

import { messageFromAuthRedirect, sessionTokensFromHash } from '@/lib/auth-redirect';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

export type AuthCompletion =
  | { ok: true; next: string }
  | { ok: false; message: string };

function safeNext(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) return '/dashboard';
  return value;
}

export async function completeAuthFromLocation(search: string, hash: string): Promise<AuthCompletion> {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const next = safeNext(query.get('next'));
  const authError = messageFromAuthRedirect(search, hash);
  if (authError) return { ok: false, message: authError };

  const supabase = createSupabaseBrowser();
  if (!supabase) {
    return { ok: false, message: 'Supabase is not configured, so this sign-in link cannot be completed.' };
  }

  const code = query.get('code');
  const tokenHash = query.get('token_hash');
  const type = query.get('type');
  const tokens = sessionTokensFromHash(hash);

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return { ok: false, message: error.message };
    return { ok: true, next };
  }
  if (tokenHash) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === 'recovery' ? 'recovery' : 'email',
    });
    if (error) return { ok: false, message: error.message };
    return { ok: true, next };
  }
  if (tokens) {
    const { error } = await supabase.auth.setSession(tokens);
    if (error) return { ok: false, message: error.message };
    return { ok: true, next };
  }

  const { data } = await supabase.auth.getUser();
  if (data.user) return { ok: true, next };
  return { ok: false, message: 'This sign-in link is missing tokens. Request a new one and open it once.' };
}
