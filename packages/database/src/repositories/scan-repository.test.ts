import type { DailyScanSummary } from '@bloomstock/core';
import { ScanRepository } from './scan-repository';

const summary: DailyScanSummary = {
  scanDate: '2026-09-18',
  regime: 'bullish',
  stocksScanned: 12,
  candidates: [],
  noTradeReason: null,
};

describe('ScanRepository.saveDailyScan', () => {
  it('upserts on scan_date so a second run does not insert a duplicate day', async () => {
    const upsert = jest.fn().mockReturnValue({
      select: () => ({
        single: async () => ({ data: { id: 'scan-1' }, error: null }),
      }),
    });
    const from = jest.fn().mockImplementation((table: string) => {
      if (table === 'daily_scans') return { upsert };
      return {
        delete: () => ({ eq: async () => ({ error: null }) }),
        insert: async () => ({ error: null }),
      };
    });
    const repo = new ScanRepository({ from } as never);

    await expect(repo.saveDailyScan(summary)).resolves.toBe('scan-1');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ scan_date: '2026-09-18' }),
      { onConflict: 'scan_date' },
    );
  });
});
