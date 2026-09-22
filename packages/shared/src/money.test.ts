import { clamp, percentChange, roundTo } from './money';
import { isWeekend, previousWeekday, toIsoDate } from './dates';

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
});
