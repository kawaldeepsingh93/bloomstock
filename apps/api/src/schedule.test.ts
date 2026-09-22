import { MORNING_CRON_UTC, describeMorningSchedule } from './schedule';

describe('morning schedule', () => {
  it('runs at 09:10 IST on weekdays', () => {
    expect(MORNING_CRON_UTC).toBe('40 3 * * 1-5');
    expect(describeMorningSchedule()).toContain('09:10 IST');
  });
});
