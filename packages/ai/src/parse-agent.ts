import type { IpoIssue, MarketRegime } from '@bloomstock/core';
import { clamp } from '@bloomstock/shared';
import { defaultIpoHeadline, matchIpoReviews, tallyIpoVerdicts } from './ipo-book';
import {
  deskNoteSchema,
  ipoAnalysisSchema,
  marketAgentSchema,
  newsAgentSchema,
  technicalAgentSchema,
} from './schemas';

export function parseJsonObject(text: string): Record<string, unknown> {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  const parsed = JSON.parse(slice) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('LLM did not return a JSON object');
  }
  return unwrapRecord(parsed as Record<string, unknown>);
}

export function parseMarketAgent(text: string, backendRegime: MarketRegime) {
  const record = parseJsonObject(text);
  return marketAgentSchema.parse({
    regime: backendRegime,
    rationale:
      pickString(record, ['rationale', 'reason', 'commentary', 'analysis', 'summary', 'narrative']) ??
      `Backend classified the tape as ${backendRegime}.`,
    confidence: clamp(
      pickNumber(record, ['confidence', 'score', 'confidenceScore']) ?? 50,
      0,
      100,
    ),
  });
}

export function parseTechnicalAgent(text: string, symbol: string, technicalScore: number) {
  const record = parseJsonObject(text);
  return technicalAgentSchema.parse({
    symbol: pickString(record, ['symbol']) ?? symbol,
    technicalScore: clamp(
      pickNumber(record, ['technicalScore', 'score', 'confidence']) ?? technicalScore,
      0,
      100,
    ),
    setupQuality:
      pickString(record, ['setupQuality', 'setup', 'quality', 'setupType']) ?? 'backend setup',
    rationale:
      pickString(record, ['rationale', 'reason', 'commentary', 'analysis']) ??
      'Narrating the backend technical score only.',
  });
}

export function parseNewsAgent(text: string, symbol: string) {
  const record = parseJsonObject(text);
  const headline = record.headline;
  return newsAgentSchema.parse({
    symbol: pickString(record, ['symbol']) ?? symbol,
    catalystScore: clamp(pickNumber(record, ['catalystScore', 'score', 'confidence']) ?? 50, 0, 100),
    headline: typeof headline === 'string' && headline.length > 0 ? headline : null,
    rationale:
      pickString(record, ['rationale', 'reason', 'commentary', 'analysis', 'summary']) ??
      'No material catalyst in the supplied headlines.',
  });
}

export function parseDeskNote(text: string, fallback: { noTrade: boolean; message: string }) {
  try {
    const record = parseJsonObject(text);
    const picks = Array.isArray(record.picks) ? record.picks : [];
    return deskNoteSchema.parse({
      noTrade:
        typeof record.noTrade === 'boolean'
          ? record.noTrade
          : typeof record.no_trade === 'boolean'
            ? record.no_trade
            : fallback.noTrade,
      message: pickString(record, ['message', 'rationale', 'note', 'summary']) ?? fallback.message,
      picks,
    });
  } catch {
    return deskNoteSchema.parse({
      noTrade: fallback.noTrade,
      message: fallback.message,
      picks: [],
    });
  }
}

export function parseIpoAnalysis(text: string, fallbackName: string) {
  return ipoAnalysisFromRecord(parseJsonObject(text), fallbackName);
}

export function parseIpoBook(text: string, ipos: IpoIssue[]) {
  const record = parseJsonObject(text);
  const raw = Array.isArray(record.reviews)
    ? record.reviews
    : Array.isArray(record.analyses)
      ? record.analyses
      : [];
  const analyses = raw
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object' && !Array.isArray(row))
    .map((row) => ipoAnalysisFromRecord(row, 'IPO'));
  const reviews = matchIpoReviews(ipos, analyses);
  const tallies = tallyIpoVerdicts(reviews.map((item) => item.analysis));
  return {
    headline:
      pickString(record, ['headline', 'message', 'summary']) ?? defaultIpoHeadline(tallies, ipos.length),
    ...tallies,
    reviews,
  };
}

function ipoAnalysisFromRecord(record: Record<string, unknown>, fallbackName: string) {
  const verdictRaw = pickString(record, ['verdict', 'action', 'recommendation'])?.toLowerCase();
  const verdict =
    verdictRaw === 'subscribe' || verdictRaw === 'avoid' || verdictRaw === 'wait' ? verdictRaw : 'wait';
  const risks = Array.isArray(record.risks) ? record.risks.map(String) : [];
  return ipoAnalysisSchema.parse({
    name: pickString(record, ['name', 'symbol']) ?? fallbackName,
    verdict,
    rationale:
      pickString(record, ['rationale', 'reason', 'commentary', 'analysis']) ??
      'Backend facts are incomplete, so the desk waits.',
    risks: risks.length > 0 ? risks : ['Grey market is not a listing guarantee.'],
  });
}

function unwrapRecord(record: Record<string, unknown>): Record<string, unknown> {
  if (hasAgentFields(record)) return record;
  for (const value of Object.values(record)) {
    if (value && typeof value === 'object' && !Array.isArray(value) && hasAgentFields(value as Record<string, unknown>)) {
      return value as Record<string, unknown>;
    }
  }
  return record;
}

function hasAgentFields(record: Record<string, unknown>): boolean {
  return [
    'regime',
    'rationale',
    'confidence',
    'technicalScore',
    'catalystScore',
    'noTrade',
    'message',
    'score',
    'commentary',
    'analysis',
    'reason',
    'summary',
    'verdict',
    'headline',
    'reviews',
  ].some((key) => record[key] !== undefined);
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) return value.trim();
  }
  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return undefined;
}
