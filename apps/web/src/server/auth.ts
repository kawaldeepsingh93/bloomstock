import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  ConfigurationError,
  ForbiddenError,
  UnauthorizedError,
  envValue,
  type UserRole,
} from '@bloomstock/core';
import { UserRepository, createServiceClient } from '@bloomstock/database';

export async function createSupabaseServer() {
  const cookieStore = await cookies();
  const url = envValue('NEXT_PUBLIC_SUPABASE_URL');
  const key = envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) {
    throw new ConfigurationError('Supabase keys are not configured');
  }
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
        for (const cookie of cookiesToSet) {
          cookieStore.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });
}

export async function requireUser() {
  const supabase = await createSupabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    throw new UnauthorizedError();
  }
  return data.user;
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser();
  const profile = await new UserRepository(createServiceClient()).getProfile(user.id);
  if (!roles.includes(profile.role)) {
    throw new ForbiddenError(`Requires ${roles.join(' or ')}`);
  }
  return { user, profile };
}

export function requireTrader() {
  return requireRole(['trader', 'admin']);
}

export function requireAdmin() {
  return requireRole(['admin']);
}
