import { createServerClient } from '@supabase/ssr';
import { envValue } from '@bloomstock/core';
import { NextResponse, type NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/kite/callback'];

export async function middleware(request: NextRequest) {
  const url = envValue('NEXT_PUBLIC_SUPABASE_URL');
  const key = envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) {
    return NextResponse.next();
  }
  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }
        response = NextResponse.next({ request });
        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    const cleaned = request.nextUrl.clone();
    cleaned.searchParams.delete('code');
    cleaned.pathname = '/dashboard';
    const redirect = NextResponse.redirect(cleaned);
    for (const cookie of response.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
    return redirect;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((item) => path === item || path.startsWith(`${item}/`));
  const isApi = path.startsWith('/api');
  if (user && path === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  if (!user && !isPublic && !isApi) {
    const login = new URL('/login', request.url);
    login.search = request.nextUrl.search;
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
