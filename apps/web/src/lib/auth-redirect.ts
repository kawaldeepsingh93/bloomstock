function paramsFrom(search: string, hash: string) {
  const query = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  return { query, fragment };
}

export function messageFromAuthRedirect(search: string, hash: string): string | undefined {
  const { query, fragment } = paramsFrom(search, hash);
  const code = fragment.get('error_code') ?? query.get('error_code') ?? query.get('error');
  const description = fragment.get('error_description') ?? query.get('error_description');
  if (!code && !description) return undefined;
  if (code === 'otp_expired') {
    return 'This magic link is invalid or has expired. Request a new one and open it once, in the same browser you used to request it.';
  }
  return (description ?? code ?? 'Sign-in failed.').replace(/\+/g, ' ');
}

export function sessionTokensFromHash(hash: string): { access_token: string; refresh_token: string } | undefined {
  const fragment = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
  const access_token = fragment.get('access_token');
  const refresh_token = fragment.get('refresh_token');
  if (!access_token || !refresh_token) return undefined;
  return { access_token, refresh_token };
}

export function hasAuthRedirectPayload(search: string, hash: string): boolean {
  const { query, fragment } = paramsFrom(search, hash);
  return Boolean(
    query.get('code') ||
      query.get('token_hash') ||
      query.get('error') ||
      query.get('error_code') ||
      query.get('error_description') ||
      fragment.get('access_token') ||
      fragment.get('refresh_token') ||
      fragment.get('error_code') ||
      fragment.get('error_description'),
  );
}

export function requestOrigin(request: Request, fallbackOrigin = 'http://localhost:3000'): string {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const proto = request.headers.get('x-forwarded-proto') ?? 'http';
  const originHeader = request.headers.get('origin');
  return (host ? `${proto}://${host}` : originHeader || fallbackOrigin).replace(/\/$/, '');
}

export function absolutePath(origin: string, pathWithSearch: string): string {
  return new URL(pathWithSearch, `${origin.replace(/\/$/, '')}/`).toString();
}

export function authCallbackUrl(request: Request, fallbackOrigin: string): string {
  const originHeader = request.headers.get('origin');
  const origin = (originHeader || requestOrigin(request, fallbackOrigin)).replace(/\/$/, '');
  return `${origin}/auth/callback`;
}
