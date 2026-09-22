import { parseBody } from '@bloomstock/shared';
import { runBacktest } from '@bloomstock/trading';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader } from '@/server/auth';
import { getContainer } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { backtestSchema } from '@/server/validation';

export async function POST(request: Request) {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(user.id, 10);
    const body = parseBody(backtestSchema, await request.json());
    const { market } = getContainer();
    const candles = await market.getCandles(body.symbol.toUpperCase(), 'NSE', '1d', 800);
    const filtered = candles.filter((candle) => {
      const ts = candle.timestamp.toISOString().slice(0, 10);
      return ts >= body.from && ts <= body.to;
    });
    const report = runBacktest({ symbol: body.symbol.toUpperCase(), candles: filtered });
    return jsonOk(report);
  } catch (error) {
    return jsonError(error);
  }
}
