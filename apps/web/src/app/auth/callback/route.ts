import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/server/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') ?? '/dashboard';
  const errorCode = url.searchParams.get('error_code') ?? url.searchParams.get('error');
  if (errorCode) {
    const login = new URL('/login', url.origin);
    login.hash = url.searchParams.toString();
    return NextResponse.redirect(login);
  }
  const supabase = await createSupabaseServer();
  const code = url.searchParams.get('code');
  const tokenHash = url.searchParams.get('token_hash');
  const type = url.searchParams.get('type');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (tokenHash) {
    await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type === 'recovery' ? 'recovery' : 'email',
    });
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
