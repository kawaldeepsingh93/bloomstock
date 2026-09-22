import type { IpoIssue, NewsItem } from '@bloomstock/core';
import { nseJson } from './nse-client';
import { mapNseIpoRows, type NseIpoRow } from './nse-ipo';

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

export class NseIpoProvider {
  async current(): Promise<IpoIssue[]> {
    const payloads = await Promise.allSettled([
      nseJson<NseIpoRow[] | { data?: NseIpoRow[] }>('/api/ipo-current-issue'),
      nseJson<NseIpoRow[] | { data?: NseIpoRow[] }>('/api/ipo-forthcoming-issue'),
    ]);
    const rows = payloads.flatMap((result) => {
      if (result.status !== 'fulfilled') return [];
      const body = result.value;
      return Array.isArray(body) ? body : (body.data ?? []);
    });
    return mapNseIpoRows(rows);
  }
}
