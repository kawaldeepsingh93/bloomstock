import { MarketDataError } from '@bloomstock/core';

const HOME = 'https://www.nseindia.com';

export async function nseJson<T>(path: string): Promise<T> {
  const headers = {
    'User-Agent': 'Mozilla/5.0',
    Accept: 'application/json',
    Referer: `${HOME}/`,
  };
  const bootstrap = await fetch(HOME, { headers });
  const cookie = bootstrap.headers.get('set-cookie') ?? '';
  const response = await fetch(`${HOME}${path}`, { headers: { ...headers, Cookie: cookie } });
  if (!response.ok) {
    throw new MarketDataError('nse', `HTTP ${response.status} for ${path}`);
  }
  return (await response.json()) as T;
}
