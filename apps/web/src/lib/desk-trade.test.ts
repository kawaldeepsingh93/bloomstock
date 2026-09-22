import { deskIdleMessage, emptySessionScan, hydrateDeskTrade } from './desk-trade';

describe('hydrateDeskTrade', () => {
  it('does not invent a no-trade when the last session simply has not been scored', () => {
    const idle = hydrateDeskTrade(null, []);
    expect(idle.noTrade).toBe(false);
    expect(idle.recommendations).toEqual([]);
    expect(idle.message.toLowerCase()).toContain('score that close');
  });

  it('reuses a stored no-trade reason from the last scan', () => {
    const scan = {
      ...emptySessionScan('2026-09-22'),
      noTradeReason: 'Market regime is bearish. No swing longs today.',
    };
    const result = hydrateDeskTrade(scan, []);
    expect(result.noTrade).toBe(true);
    expect(result.message).toContain('bearish');
  });
});

describe('deskIdleMessage', () => {
  it('tells the desk to score the last close after hours', () => {
    expect(deskIdleMessage(null).toLowerCase()).not.toMatch(/awaiting live/);
  });
});
