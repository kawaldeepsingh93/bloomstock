export function messageFromAuthRedirect(search: string, hash: string): string | undefined {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const code = fragment.get('error_code') ?? query.get('error_code');
  const description = fragment.get('error_description') ?? query.get('error_description');
  if (!code && !description) return undefined;
  if (code === 'otp_expired') {
    return 'This magic link is invalid or has expired. Request a new one and open it once, in the same browser, at http://localhost:3000';
  }
  return (description ?? code ?? 'Sign-in failed.').replace(/\+/g, ' ');
}

export function authCallbackUrl(request: Request, fallbackOrigin: string): string {
  const originHeader = request.headers.get('origin');
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const origin = (originHeader || (host ? `${proto}://${host}` : fallbackOrigin)).replace(/\/$/, '');
  return `${origin}/auth/callback`;
}
