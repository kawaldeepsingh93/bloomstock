import { buildTapeItems, marqueeDurationSeconds } from './stock-tape';

describe('buildTapeItems', () => {
  it('keeps only indexes and movers that have a live price and change', () => {
    const items = buildTapeItems({
      nifty: { lastPrice: 25000, changePercent: 0.4 },
      bankNifty: null,
      vix: { lastPrice: 12, changePercent: -1.1 },
      gainers: [{ symbol: 'RELIANCE', lastPrice: 1400, changePercent: 1.2 }],
      losers: [{ symbol: 'TCS', lastPrice: 3900, changePercent: -0.8 }, { symbol: 'BAD' }],
    });
    expect(items.map((item) => item.symbol)).toEqual(['NIFTY', 'INDIAVIX', 'RELIANCE', 'TCS']);
    expect(items[0]).toMatchObject({ lastPrice: 25000, changePercent: 0.4, href: '/market' });
    expect(items[2]).toMatchObject({ href: `/stocks/${encodeURIComponent('RELIANCE')}`, lastPrice: 1400 });
  });

  it('does not invent names or prices when the feed is empty', () => {
    expect(buildTapeItems()).toEqual([]);
    expect(buildTapeItems({})).toEqual([]);
  });

  it('scrolls slowly enough to read each print', () => {
    expect(marqueeDurationSeconds(5)).toBe(70);
    expect(marqueeDurationSeconds(16)).toBe(80);
    expect(marqueeDurationSeconds(40)).toBe(120);
  });
});
