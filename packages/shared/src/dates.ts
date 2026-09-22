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

export function nseSessionDate(now = new Date()): Date {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const ist = new Date(now.getTime() + istOffsetMs);
  const session = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  if (isWeekend(session)) {
    return previousWeekday(session);
  }
  return session;
}
