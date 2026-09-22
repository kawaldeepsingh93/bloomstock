import type { DailyScanSummary, TodaysTradeResponse } from '@bloomstock/core';
import { deskSessionCopy, isNseCashOpen, nseSessionDate, toIsoDate } from '@bloomstock/shared';

export function emptySessionScan(sessionDate = toIsoDate(nseSessionDate())): DailyScanSummary {
  return {
    scanDate: sessionDate,
    regime: 'neutral',
    stocksScanned: 0,
    candidates: [],
    noTradeReason: null,
  };
}

export function deskIdleMessage(scan: DailyScanSummary | null): string {
  const session = deskSessionCopy();
  if (scan && (scan.candidates.length > 0 || scan.noTradeReason)) {
    if (scan.noTradeReason) return scan.noTradeReason;
    return `${session.label}. Last scan ${scan.scanDate} covered ${scan.stocksScanned} names.`;
  }
  if (isNseCashOpen()) {
    return 'No stored desk note yet. Run Recommend to score the current cash session.';
  }
  return `${session.label}. Run Recommend to score that close — do not wait for the next open.`;
}

export function hydrateDeskTrade(
  scan: DailyScanSummary | null,
  recommendations: TodaysTradeResponse['recommendations'],
  tapeAsOf?: string | null,
): TodaysTradeResponse {
  const session = deskSessionCopy();
  const resolved = scan ?? emptySessionScan(session.sessionDate);
  const linked = recommendations.map((item) => {
    const symbol = item.candidate?.symbol ?? item.agents.technical?.symbol ?? item.agents.news?.symbol;
    const candidate = symbol
      ? (resolved.candidates.find((row) => row.symbol === symbol) ?? item.candidate)
      : item.candidate;
    return { ...item, candidate };
  });
  return {
    scan: resolved,
    recommendations: linked,
    noTrade: Boolean(resolved.noTradeReason) && linked.length === 0,
    message: deskIdleMessage(resolved),
    sessionDate: session.sessionDate,
    marketOpen: session.marketOpen,
    tapeAsOf: tapeAsOf ?? null,
  };
}
