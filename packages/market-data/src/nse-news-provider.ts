import type { IpoIssue, NewsItem } from '@bloomstock/core';
import { nseJson } from './nse-client';

interface Announcement {
  symbol?: string;
  desc?: string;
  sm_name?: string;
  an_dt?: string;
  attchmntFile?: string;
  attchmnt_text?: string;
}

export class NseNewsProvider {
  readonly name = 'nse-news';

  async latest(limit = 40): Promise<NewsItem[]> {
    const rows = await nseJson<Announcement[] | { data?: Announcement[] }>(
      '/api/corporate-announcements?index=equities',
    );
    const list = Array.isArray(rows) ? rows : (rows.data ?? []);
    return list.slice(0, limit).map((row, index) => ({
      id: `${row.symbol ?? 'MKT'}-${row.an_dt ?? index}`,
      symbol: row.symbol ?? null,
      headline: row.desc ?? row.sm_name ?? 'NSE announcement',
      source: 'NSE',
      url: row.attchmntFile ?? row.attchmnt_text ?? null,
      publishedAt: row.an_dt ? new Date(row.an_dt) : new Date(),
      sentiment: null,
      summary: row.sm_name && row.desc && row.sm_name !== row.desc ? row.sm_name : null,
    }));
  }
}

interface NseIpoRow {
  symbol?: string;
  companyName?: string;
  issueStartDate?: string;
  issueEndDate?: string;
  priceBand?: string;
  lotSize?: string;
  status?: string;
}

export class NseIpoProvider {
  async current(): Promise<IpoIssue[]> {
    const rows = await nseJson<NseIpoRow[] | { data?: NseIpoRow[] }>('/api/ipo-current-issue');
    const list = Array.isArray(rows) ? rows : (rows.data ?? []);
    return list.map((row, index) => ({
      id: row.symbol ?? `ipo-${index}`,
      name: row.companyName ?? row.symbol ?? 'Unnamed IPO',
      symbol: row.symbol ?? `IPO${index}`,
      openDate: row.issueStartDate ? new Date(row.issueStartDate) : new Date(),
      closeDate: row.issueEndDate ? new Date(row.issueEndDate) : new Date(),
      priceBandLow: parseBand(row.priceBand, 0),
      priceBandHigh: parseBand(row.priceBand, 1),
      lotSize: row.lotSize ? Number(row.lotSize) : null,
      status: mapIpoStatus(row.status),
    }));
  }
}

function parseBand(band: string | undefined, index: number): number | null {
  if (!band) return null;
  const parts = band.replace(/[^0-9.]/g, ' ').trim().split(/\s+/);
  const value = parts[index] ?? parts[0];
  return value ? Number(value) : null;
}

function mapIpoStatus(status?: string): IpoIssue['status'] {
  const value = (status ?? '').toLowerCase();
  if (value.includes('open')) return 'open';
  if (value.includes('list')) return 'listed';
  if (value.includes('close')) return 'closed';
  return 'upcoming';
}
