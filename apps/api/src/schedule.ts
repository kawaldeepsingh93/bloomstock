export const MORNING_CRON_UTC = '40 3 * * 1-5';

export function describeMorningSchedule(): string {
  return 'Weekdays 09:10 IST (03:40 UTC) after the cash-market open auction.';
}
