import type { FiiDiiFlow } from '@bloomstock/core';
import { MarketDataError } from '@bloomstock/core';
import { nseJson } from './nse-client';

export class NseFiiProvider {
  readonly name = 'nse-fii';

  async getLatest(): Promise<FiiDiiFlow> {
    const rows = await nseJson<NseFiiRow[]>('/api/fiidiiTradeReact');
    const latest = rows[0];
    if (!latest) {
      throw new MarketDataError(this.name, 'NSE returned an empty FII/DII series');
    }
    const fii = rows.find((row) => row.category.toUpperCase().includes('FII')) ?? latest;
    const dii = rows.find((row) => row.category.toUpperCase().includes('DII'));
    return {
      asOf: parseNseDate(fii.date),
      fiiBuy: Number(fii.buyValue),
      fiiSell: Number(fii.sellValue),
      fiiNet: Number(fii.netValue),
      diiBuy: Number(dii?.buyValue ?? 0),
      diiSell: Number(dii?.sellValue ?? 0),
      diiNet: Number(dii?.netValue ?? 0),
    };
  }
}

interface NseFiiRow {
  date: string;
  category: string;
  buyValue: string;
  sellValue: string;
  netValue: string;
}

function parseNseDate(value: string): Date {
  const [day, month, year] = value.split('-');
  if (!day || !month || !year) {
    return new Date(value);
  }
  const months: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };
  return new Date(Date.UTC(Number(year), months[month] ?? 0, Number(day)));
}
