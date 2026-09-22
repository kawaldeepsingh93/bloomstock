import type { Holding, Portfolio } from '@bloomstock/core';
import { NotFoundError } from '@bloomstock/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export class PortfolioRepository {
  constructor(private readonly db: SupabaseClient) {}

  async getPrimary(userId: string): Promise<Portfolio> {
    const { data, error } = await this.db
      .from('portfolios')
      .select('*, holdings(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new NotFoundError('Portfolio');
    return {
      id: data.id,
      name: data.name,
      capital: Number(data.capital),
      holdings: ((data.holdings ?? []) as Record<string, unknown>[]).map(mapHolding),
    };
  }

  async replaceHoldings(
    portfolioId: string,
    holdings: Omit<Holding, 'id' | 'lastPrice'>[],
  ): Promise<void> {
    const { error: delError } = await this.db
      .from('holdings')
      .delete()
      .eq('portfolio_id', portfolioId);
    if (delError) throw delError;
    if (holdings.length === 0) return;
    const { error } = await this.db.from('holdings').insert(
      holdings.map((holding) => ({
        portfolio_id: portfolioId,
        symbol: holding.symbol,
        exchange: holding.exchange,
        quantity: holding.quantity,
        avg_price: holding.avgPrice,
        invested_at: holding.investedAt?.toISOString().slice(0, 10) ?? null,
      })),
    );
    if (error) throw error;
  }
}

function mapHolding(row: Record<string, unknown>): Holding {
  return {
    id: String(row.id),
    symbol: String(row.symbol),
    exchange: row.exchange as Holding['exchange'],
    quantity: Number(row.quantity),
    avgPrice: Number(row.avg_price),
    lastPrice: null,
    investedAt: row.invested_at ? new Date(String(row.invested_at)) : null,
  };
}
