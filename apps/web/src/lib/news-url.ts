export function resolveNewsUrl(url: string | null | undefined, symbol?: string | null): string | null {
  const trimmed = url?.trim() ?? '';
  if (trimmed.length > 0) {
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (trimmed.startsWith('//')) return `https:${trimmed}`;
    const path = trimmed.replace(/^\/+/, '');
    if (/\.pdf($|\?)/i.test(path) || /nsearchives/i.test(path)) {
      return `https://nsearchives.nseindia.com/${path}`;
    }
    return `https://www.nseindia.com/${path}`;
  }
  if (symbol && symbol.trim().length > 0) {
    return `https://www.nseindia.com/get-quotes/equity?symbol=${encodeURIComponent(symbol.trim())}`;
  }
  return null;
}
