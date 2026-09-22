import type { IpoIssue } from '@bloomstock/core';

export interface NseIpoRow {
  symbol?: string;
  Symbol?: string;
  companyName?: string;
  company?: string;
  CompanyName?: string;
  issueStartDate?: string;
  biddingStartDate?: string;
  issueOpenDate?: string;
  issueEndDate?: string;
  biddingEndDate?: string;
  issueCloseDate?: string;
  priceBand?: string;
  PriceBand?: string;
  floorPrice?: string | number;
  capPrice?: string | number;
  lotSize?: string | number;
  minBidQuantity?: string | number;
  status?: string;
  Status?: string;
  series?: string;
}

export function parseIpoBand(band: string | undefined, index: number): number | null {
  if (!band) return null;
  const parts = band
    .replace(/₹|rs\.?|inr/gi, ' ')
    .replace(/to|-/gi, ' ')
    .replace(/[^0-9.\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const value = parts[index] ?? parts[0];
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function mapIpoStatus(status?: string): IpoIssue['status'] {
  const value = (status ?? '').toLowerCase();
  if (value.includes('open') && !value.includes('soon')) return 'open';
  if (value.includes('list')) return 'listed';
  if (value.includes('close')) return 'closed';
  return 'upcoming';
}

function firstString(...values: Array<string | number | undefined | null>): string | undefined {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return undefined;
}

function parseIpoDate(value?: string): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mapNseIpoRow(row: NseIpoRow, index: number): IpoIssue | null {
  const name = firstString(row.companyName, row.CompanyName, row.company, row.symbol, row.Symbol);
  const symbol = firstString(row.symbol, row.Symbol) ?? null;
  const openDate = parseIpoDate(
    firstString(row.issueStartDate, row.biddingStartDate, row.issueOpenDate),
  );
  const closeDate = parseIpoDate(
    firstString(row.issueEndDate, row.biddingEndDate, row.issueCloseDate),
  );
  if (!name || (!openDate && !closeDate)) return null;
  const resolvedOpen = openDate ?? closeDate;
  const resolvedClose = closeDate ?? openDate;
  if (!resolvedOpen || !resolvedClose) return null;
  const band = firstString(row.priceBand, row.PriceBand);
  return {
    id: symbol ?? `ipo-${name.replace(/\s+/g, '-').toLowerCase()}-${index}`,
    name,
    symbol,
    openDate: resolvedOpen,
    closeDate: resolvedClose,
    priceBandLow:
      parseIpoBand(band, 0) ?? (row.floorPrice !== undefined ? Number(row.floorPrice) || null : null),
    priceBandHigh:
      parseIpoBand(band, 1) ?? (row.capPrice !== undefined ? Number(row.capPrice) || null : null),
    lotSize: row.lotSize || row.minBidQuantity ? Number(row.lotSize ?? row.minBidQuantity) : null,
    status: mapIpoStatus(firstString(row.status, row.Status, row.series)),
  };
}

export function mapNseIpoRows(rows: NseIpoRow[]): IpoIssue[] {
  const seen = new Set<string>();
  const issues: IpoIssue[] = [];
  rows.forEach((row, index) => {
    const mapped = mapNseIpoRow(row, index);
    if (!mapped) return;
    const key = `${mapped.symbol ?? mapped.name}:${mapped.openDate.toISOString().slice(0, 10)}`;
    if (seen.has(key)) return;
    seen.add(key);
    issues.push(mapped);
  });
  return issues;
}
