import { createServerClient } from '@supabase/ssr';
import { envValue } from '@bloomstock/core';
import { NextResponse, type NextRequest } from 'next/server';
import { absolutePath, requestOrigin } from '@/lib/auth-redirect';

function redirectSameOrigin(request: NextRequest, pathWithSearch: string, cookiesFrom?: NextResponse) {
  const location = absolutePath(requestOrigin(request, request.nextUrl.origin), pathWithSearch);
  const redirect = new NextResponse(null, { status: 307, headers: { Location: location } });
  if (cookiesFrom) {
    for (const cookie of cookiesFrom.cookies.getAll()) {
      redirect.cookies.set(cookie);
    }
  }
  return redirect;
}

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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;
  const isPublic = PUBLIC_PATHS.some((item) => path === item || path.startsWith(`${item}/`));
  const isApi = path.startsWith('/api');
  if (user && path === '/login') {
    return redirectSameOrigin(request, '/dashboard', response);
  }
  if (!user && !isPublic && !isApi) {
    return redirectSameOrigin(request, `/login${request.nextUrl.search}`, response);
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
