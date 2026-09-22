import { asError } from '@bloomstock/shared';
import type { DailyScanSummary, RiskPlan, SwingCandidate } from '@bloomstock/core';
import type { SupabaseClient } from '@supabase/supabase-js';

export class ScanRepository {
  constructor(private readonly db: SupabaseClient) {}

  async saveDailyScan(summary: DailyScanSummary): Promise<string> {
    const { data, error } = await this.db
      .from('daily_scans')
      .upsert(
        {
          scan_date: summary.scanDate,
          market_regime: summary.regime,
          stocks_scanned: summary.stocksScanned,
          no_trade_reason: summary.noTradeReason,
        },
        { onConflict: 'scan_date' },
      )
      .select('id')
      .single();
    if (error) throw asError(error);

    await this.db.from('scan_results').delete().eq('scan_id', data.id);
    if (summary.candidates.length > 0) {
      const { error: insertError } = await this.db
        .from('scan_results')
        .insert(summary.candidates.map((candidate) => mapCandidate(data.id, candidate)));
      if (insertError) throw asError(insertError);
    }
    return data.id as string;
  }

  async getByDate(scanDate: string): Promise<DailyScanSummary | null> {
    const { data, error } = await this.db
      .from('daily_scans')
      .select('*, scan_results(*)')
      .eq('scan_date', scanDate)
      .maybeSingle();
    if (error) throw asError(error);
    if (!data) return null;
    return mapScan(data);
  }

  async getLatest(): Promise<DailyScanSummary | null> {
    const { data, error } = await this.db
      .from('daily_scans')
      .select('*, scan_results(*)')
      .order('scan_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw asError(error);
    if (!data) return null;
    return mapScan(data);
  }
}

function mapScan(data: {
  scan_date: string;
  market_regime: DailyScanSummary['regime'];
  stocks_scanned: number;
  no_trade_reason: string | null;
  scan_results?: Record<string, unknown>[];
}): DailyScanSummary {
  return {
    scanDate: data.scan_date,
    regime: data.market_regime,
    stocksScanned: data.stocks_scanned,
    noTradeReason: data.no_trade_reason,
    candidates: (data.scan_results ?? []).map(mapResult),
  };
}

function mapCandidate(scanId: string, candidate: SwingCandidate) {
  return {
    scan_id: scanId,
    symbol: candidate.symbol,
    exchange: candidate.exchange,
    setup_type: candidate.setupType,
    score: candidate.score.total,
    confidence: candidate.confidence,
    entry: candidate.risk?.entry ?? null,
    stop_loss: candidate.risk?.stopLoss ?? null,
    target_1: candidate.risk?.target1 ?? null,
    target_2: candidate.risk?.target2 ?? null,
    position_size: candidate.risk?.positionSize ?? null,
    rejected_reason: candidate.rejectedReason,
    reasons: candidate.score.reasons,
  };
}

function mapResult(row: Record<string, unknown>): SwingCandidate {
  return {
    symbol: String(row.symbol),
    exchange: row.exchange as SwingCandidate['exchange'],
    name: String(row.symbol),
    setupType: (row.setup_type as SwingCandidate['setupType']) ?? null,
    score: {
      trend: 0,
      momentum: 0,
      volume: 0,
      structure: 0,
      total: Number(row.score),
      reasons: Array.isArray(row.reasons) ? (row.reasons as string[]) : [],
      rejects: row.rejected_reason ? [String(row.rejected_reason)] : [],
    },
    risk: row.entry
      ? mapStoredRisk(row)
      : null,
    confidence: Number(row.confidence),
    verdict: row.rejected_reason
      ? 'no_trade'
      : Array.isArray(row.reasons) && (row.reasons as string[]).some((reason) => reason.startsWith('Do not chase'))
        ? 'watch'
        : 'trade',
    rejectedReason: row.rejected_reason ? String(row.rejected_reason) : null,
  };
}

function mapStoredRisk(row: Record<string, unknown>): RiskPlan {
  const entry = Number(row.entry);
  const stopLoss = Number(row.stop_loss);
  const atr = entry > stopLoss ? (entry - stopLoss) / 1.5 : 0;
  const reasons = Array.isArray(row.reasons) ? (row.reasons as string[]) : [];
  const dip = reasons.find((reason) => reason.startsWith('Buy on dip'));
  return {
    capital: 0,
    riskPercent: 0,
    riskAmount: 0,
    entry,
    stopLoss,
    target1: Number(row.target_1),
    target2: Number(row.target_2),
    positionSize: Number(row.position_size ?? 0),
    positionValue: 0,
    riskReward: 2,
    atr,
    trailingStop: atr > 0 ? entry - atr : stopLoss,
    entryStyle: dip ? 'buy_dip' : 'at_close',
    buyZoneLow: null,
    buyZoneHigh: null,
    breakoutTrigger: null,
  };
}
