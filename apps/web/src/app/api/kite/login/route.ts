import { NextResponse } from 'next/server';
import { kiteLoginUrl } from '@bloomstock/market-data';
import { jsonError } from '@/server/http';
import { requireTrader } from '@/server/auth';

export async function GET() {
  try {
    await requireTrader();
    return NextResponse.redirect(kiteLoginUrl());
  } catch (error) {
    return jsonError(error);
  }
}
