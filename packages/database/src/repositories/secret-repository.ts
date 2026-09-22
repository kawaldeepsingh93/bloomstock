import { decryptSecret, encryptSecret } from '@bloomstock/shared';
import type { SupabaseClient } from '@supabase/supabase-js';

export class SecretRepository {
  constructor(private readonly db: SupabaseClient) {}

  async set(provider: string, plain: string, updatedBy?: string): Promise<void> {
    const sealed = encryptSecret(plain);
    const { error } = await this.db.from('vendor_secrets').upsert({
      provider,
      payload_ciphertext: sealed.ciphertext,
      iv: sealed.iv,
      tag: sealed.tag,
      updated_by: updatedBy ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  async exists(provider: string): Promise<boolean> {
    const { data, error } = await this.db
      .from('vendor_secrets')
      .select('provider')
      .eq('provider', provider)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async get(provider: string): Promise<string | null> {
    const { data, error } = await this.db
      .from('vendor_secrets')
      .select('*')
      .eq('provider', provider)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return decryptSecret({
      ciphertext: data.payload_ciphertext,
      iv: data.iv,
      tag: data.tag,
    });
  }
}
