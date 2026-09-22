export function isDeskAsk(query: string): boolean {
  const q = query.trim().toLowerCase();
  return (
    q.length === 0 ||
    /today'?s?\s+best\s+trade/.test(q) ||
    q === 'recommend' ||
    q === 'scan'
  );
}

export function tickerQuery(query: string): string | null {
  const q = query.trim().toUpperCase();
  if (q.length === 0 || isDeskAsk(query)) return null;
  if (!/^[A-Z0-9.&-]{1,20}$/.test(q)) return null;
  return q;
}
