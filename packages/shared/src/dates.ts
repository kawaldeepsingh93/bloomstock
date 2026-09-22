export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

export function previousWeekday(date: Date): Date {
  const cursor = startOfUtcDay(date);
  do {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  } while (isWeekend(cursor));
  return cursor;
}

/** Published NSE holidays for 2025–2026. Weekends are handled separately. */
const NSE_HOLIDAYS = new Set([
  '2025-02-26',
  '2025-03-14',
  '2025-03-31',
  '2025-04-10',
  '2025-04-14',
  '2025-04-18',
  '2025-05-01',
  '2025-08-15',
  '2025-08-27',
  '2025-10-02',
  '2025-10-21',
  '2025-10-22',
  '2025-11-05',
  '2025-12-25',
  '2026-01-26',
  '2026-03-03',
  '2026-03-31',
  '2026-04-03',
  '2026-04-14',
  '2026-05-01',
  '2026-05-27',
  '2026-06-26',
  '2026-08-15',
  '2026-09-14',
  '2026-10-02',
  '2026-10-20',
  '2026-11-08',
  '2026-11-09',
  '2026-12-25',
]);

export function isNseHoliday(date: Date): boolean {
  return NSE_HOLIDAYS.has(toIsoDate(startOfUtcDay(date)));
}

export function lastTradingDayOnOrBefore(date: Date): Date {
  const cursor = startOfUtcDay(date);
  while (isWeekend(cursor) || isNseHoliday(cursor)) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return cursor;
}

function istParts(now: Date) {
  const ist = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth(),
    day: ist.getUTCDate(),
    hour: ist.getUTCHours(),
    minute: ist.getUTCMinutes(),
  };
}

export function nseSessionDate(now = new Date()): Date {
  const ist = istParts(now);
  let session = new Date(Date.UTC(ist.year, ist.month, ist.day));
  const minutes = ist.hour * 60 + ist.minute;
  if (minutes < 9 * 60 + 15) {
    session.setUTCDate(session.getUTCDate() - 1);
  }
  return lastTradingDayOnOrBefore(session);
}

export function isNseCashOpen(now = new Date()): boolean {
  const session = new Date(
    Date.UTC(istParts(now).year, istParts(now).month, istParts(now).day),
  );
  if (isWeekend(session) || isNseHoliday(session)) return false;
  const minutes = istParts(now).hour * 60 + istParts(now).minute;
  return minutes >= 9 * 60 + 15 && minutes < 15 * 60 + 30;
}

export function formatIstDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'UTC',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(startOfUtcDay(date));
}

export function deskSessionCopy(now = new Date()): {
  sessionDate: string;
  marketOpen: boolean;
  label: string;
} {
  const session = nseSessionDate(now);
  const sessionDate = toIsoDate(session);
  const marketOpen = isNseCashOpen(now);
  return {
    sessionDate,
    marketOpen,
    label: marketOpen
      ? `Cash session ${formatIstDate(session)}`
      : `Last close ${formatIstDate(session)} · market closed`,
  };
}
