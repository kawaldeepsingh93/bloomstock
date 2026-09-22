import type { Profile, SavedScan, Watchlist } from '@bloomstock/core';
import { NotFoundError } from '@bloomstock/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export class UserRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getProfile(userId: string): Promise<Profile> {
    const { data, error } = await this.db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Profile');
    return {
      id: data.id,
      email: data.email,
      fullName: data.full_name,
      role: data.role,
      capital: Number(data.capital),
      riskPercent: Number(data.risk_percent),
      telegramChatId: data.telegram_chat_id,
      whatsappNumber: data.whatsapp_number,
      notifyEmail: data.notify_email,
      notifyTelegram: data.notify_telegram,
      notifyWhatsapp: data.notify_whatsapp,
    };
  }

  async updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
    const { error } = await this.db
      .from('profiles')
      .update({
        full_name: patch.fullName,
        capital: patch.capital,
        risk_percent: patch.riskPercent,
        telegram_chat_id: patch.telegramChatId,
        whatsapp_number: patch.whatsappNumber,
        notify_email: patch.notifyEmail,
        notify_telegram: patch.notifyTelegram,
        notify_whatsapp: patch.notifyWhatsapp,
      })
      .eq('id', userId);
    if (error) throw error;
    return this.getProfile(userId);
  }

  async getDefaultWatchlist(userId: string): Promise<Watchlist> {
    const { data, error } = await this.db
      .from('watchlists')
      .select('*, watchlist_items(*)')
      .eq('user_id', userId)
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Watchlist');
    return {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      isDefault: data.is_default,
      symbols: (data.watchlist_items ?? []).map((item: { symbol: string }) => item.symbol),
    };
  }

  async addWatchlistSymbol(
    watchlistId: string,
    symbol: string,
    exchange: 'NSE' | 'BSE',
  ): Promise<void> {
    const { error } = await this.db.from('watchlist_items').upsert({
      watchlist_id: watchlistId,
      symbol,
      exchange,
    });
    if (error) throw error;
  }

  async removeWatchlistSymbol(watchlistId: string, symbol: string): Promise<void> {
    const { error } = await this.db
      .from('watchlist_items')
      .delete()
      .eq('watchlist_id', watchlistId)
      .eq('symbol', symbol);
    if (error) throw error;
  }

  async saveScan(userId: string, scan: Omit<SavedScan, 'id' | 'userId'>): Promise<void> {
    const { error } = await this.db.from('saved_scans').upsert(
      {
        user_id: userId,
        name: scan.name,
        filters: scan.filters,
      },
      { onConflict: 'user_id,name' },
    );
    if (error) throw error;
  }

  async listSavedScans(userId: string): Promise<SavedScan[]> {
    const { data, error } = await this.db.from('saved_scans').select('*').eq('user_id', userId);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      filters: row.filters,
    }));
  }

  async writeAudit(
    userId: string | null,
    action: string,
    resource: string,
    metadata: Record<string, unknown>,
    ip?: string,
  ) {
    await this.db.from('audit_logs').insert({
      user_id: userId,
      action,
      resource,
      metadata,
      ip: ip ?? null,
    });
  }
}
