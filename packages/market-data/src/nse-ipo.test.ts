import { mapNseIpoRow, mapNseIpoRows, parseIpoBand } from './nse-ipo';

describe('parseIpoBand', () => {
  it('reads NSE band strings without inventing a print', () => {
    expect(parseIpoBand('Rs 100 to 110', 0)).toBe(100);
    expect(parseIpoBand('Rs 100 to 110', 1)).toBe(110);
    expect(parseIpoBand('₹99 - ₹104', 0)).toBe(99);
    expect(parseIpoBand('₹99 - ₹104', 1)).toBe(104);
    expect(parseIpoBand(undefined, 0)).toBeNull();
  });
});

describe('mapNseIpoRow', () => {
  it('drops rows that have no company and no calendar dates', () => {
    expect(mapNseIpoRow({}, 0)).toBeNull();
  });

  it('keeps a real current issue with aliases and a band', () => {
    const ipo = mapNseIpoRow(
      {
        Symbol: 'HOTELIPO',
        company: 'Example Hotels Ltd',
        biddingStartDate: '2026-09-18',
        biddingEndDate: '2026-09-22',
        priceBand: 'Rs 120 to 128',
        lotSize: '116',
        status: 'Open',
      },
      0,
    );
    expect(ipo).toMatchObject({
      symbol: 'HOTELIPO',
      name: 'Example Hotels Ltd',
      priceBandLow: 120,
      priceBandHigh: 128,
      lotSize: 116,
      status: 'open',
    });
  });

  it('dedupes the same symbol and open date', () => {
    const rows = mapNseIpoRows([
      {
        symbol: 'HOTELIPO',
        companyName: 'Example Hotels Ltd',
        issueStartDate: '2026-09-18',
        issueEndDate: '2026-09-22',
      },
      {
        symbol: 'HOTELIPO',
        companyName: 'Example Hotels Ltd',
        issueStartDate: '2026-09-18',
        issueEndDate: '2026-09-22',
      },
    ]);
    expect(rows).toHaveLength(1);
  });
});
