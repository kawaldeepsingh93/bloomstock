import { ConfigurationError, envValue } from '@bloomstock/core';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createServiceClient(
  url = envValue('NEXT_PUBLIC_SUPABASE_URL'),
  serviceRoleKey = envValue('SUPABASE_SERVICE_ROLE_KEY'),
): SupabaseClient {
  if (!url || !serviceRoleKey) {
    throw new ConfigurationError('Supabase URL and service role key are required');
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function createAnonClient(
  url = envValue('NEXT_PUBLIC_SUPABASE_URL'),
  anonKey = envValue('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
): SupabaseClient {
  if (!url || !anonKey) {
    throw new ConfigurationError('Supabase URL and anon key are required');
  }
  return createClient(url, anonKey);
}
