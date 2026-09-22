import { NextResponse } from 'next/server';
import { ConfigurationError } from '@bloomstock/core';
import { exchangeKiteRequestToken } from '@bloomstock/market-data';
import { jsonError } from '@/server/http';
import { getContainer } from '@/server/container';

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const settings = new URL('/settings', origin);
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const requestToken = url.searchParams.get('request_token');
    if (status !== 'success' || !requestToken) {
      settings.searchParams.set('kite', 'failed');
      return NextResponse.redirect(settings);
    }
    const accessToken = await exchangeKiteRequestToken(requestToken);
    const { secrets } = getContainer();
    await secrets.set('kite_access_token', accessToken);
    settings.searchParams.set('kite', 'connected');
    return NextResponse.redirect(settings);
  } catch (error) {
    if (error instanceof ConfigurationError) {
      return jsonError(error);
    }
    settings.searchParams.set('kite', 'failed');
    return NextResponse.redirect(settings);
  }
}
