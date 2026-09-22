import type { BookedTrade, Exchange, TradeStatus } from '@bloomstock/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export class TradeRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(userId: string): Promise<BookedTrade[]> {
    const { data, error } = await this.db
      .from('trades')
      .select('*')
      .eq('user_id', userId)
      .order('opened_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapTrade);
  }

  async open(
    userId: string,
    trade: Omit<BookedTrade, 'id' | 'status' | 'openedAt'>,
  ): Promise<BookedTrade> {
    const { data, error } = await this.db
      .from('trades')
      .insert({
        user_id: userId,
        symbol: trade.symbol,
        exchange: trade.exchange,
        entry: trade.entry,
        stop_loss: trade.stopLoss,
        target_1: trade.target1,
        target_2: trade.target2,
        quantity: trade.quantity,
        status: 'open',
      })
      .select('*')
      .single();
    if (error) throw error;
    return mapTrade(data as Record<string, unknown>);
  }
}

function mapTrade(row: Record<string, unknown>): BookedTrade {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    exchange: row.exchange as Exchange,
    entry: Number(row.entry),
    stopLoss: Number(row.stop_loss),
    target1: Number(row.target_1),
    target2: Number(row.target_2),
    quantity: Number(row.quantity),
    status: row.status as TradeStatus,
    openedAt: new Date(String(row.opened_at)),
  };
}
