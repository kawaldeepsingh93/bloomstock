import { ConfigurationError } from '@bloomstock/core';
import { KiteConnect } from 'kiteconnect';
import { KiteMarketDataProvider } from './kite-provider';

export function kiteLoginUrl(apiKey = process.env.KITE_API_KEY): string {
  if (!apiKey) {
    throw new ConfigurationError('KITE_API_KEY is required to start the Kite login');
  }
  return new KiteConnect({ api_key: apiKey }).getLoginURL();
}

export async function exchangeKiteRequestToken(
  requestToken: string,
  apiKey = process.env.KITE_API_KEY,
  apiSecret = process.env.KITE_API_SECRET,
): Promise<string> {
  if (!apiKey || !apiSecret) {
    throw new ConfigurationError('KITE_API_KEY and KITE_API_SECRET are required');
  }
  const session = await new KiteConnect({ api_key: apiKey }).generateSession(
    requestToken,
    apiSecret,
  );
  return session.access_token;
}

export function resolveKiteAccessToken(vaultToken?: string | null): string {
  const token = vaultToken || process.env.KITE_ACCESS_TOKEN;
  if (!token) {
    throw new ConfigurationError(
      'Kite access token missing. Connect Kite from Settings or set KITE_ACCESS_TOKEN.',
    );
  }
  return token;
}

export function createKiteProvider(accessToken?: string | null): KiteMarketDataProvider {
  return new KiteMarketDataProvider(process.env.KITE_API_KEY, resolveKiteAccessToken(accessToken));
}
