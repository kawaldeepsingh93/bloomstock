import { clamp, percentChange, roundTo } from './money';
import {
  deskSessionCopy,
  isNseCashOpen,
  isWeekend,
  nseSessionDate,
  previousWeekday,
  toIsoDate,
} from './dates';

describe('money', () => {
  it('rounds and computes percent change', () => {
    expect(roundTo(10.555, 2)).toBe(10.56);
    expect(percentChange(100, 110)).toBe(10);
    expect(clamp(12, 0, 10)).toBe(10);
  });
});

describe('dates', () => {
  it('walks back from weekends to Friday', () => {
    const sunday = new Date('2026-09-20T10:00:00Z');
    expect(isWeekend(sunday)).toBe(true);
    expect(toIsoDate(previousWeekday(sunday))).toBe('2026-09-18');
  });

  it('uses the last completed cash session, not the next open', () => {
    expect(toIsoDate(nseSessionDate(new Date('2026-09-22T03:00:00Z')))).toBe('2026-09-21');
    expect(toIsoDate(nseSessionDate(new Date('2026-09-22T17:47:00Z')))).toBe('2026-09-22');
    expect(toIsoDate(nseSessionDate(new Date('2026-09-20T10:00:00Z')))).toBe('2026-09-18');
    expect(toIsoDate(nseSessionDate(new Date('2026-10-02T06:00:00Z')))).toBe('2026-10-01');
  });

  it('treats after-hours as closed and still names today’s close', () => {
    const afterClose = new Date('2026-09-22T12:00:00Z');
    expect(isNseCashOpen(afterClose)).toBe(false);
    expect(deskSessionCopy(afterClose).label).toContain('Last close');
    expect(isNseCashOpen(new Date('2026-09-22T05:00:00Z'))).toBe(true);
  });
});
