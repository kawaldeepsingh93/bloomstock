import { parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader } from '@/server/auth';
import { getContainer } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { bookTradeSchema } from '@/server/validation';

export async function GET() {
  try {
    const { user } = await requireTrader();
    const { trades } = getContainer();
    return jsonOk(await trades.list(user.id));
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(`trades:${user.id}`, 20);
    const body = parseBody(bookTradeSchema, await request.json());
    const { trades, users } = getContainer();
    const booked = await trades.open(user.id, {
      symbol: body.symbol.toUpperCase(),
      exchange: body.exchange ?? 'NSE',
      entry: body.entry,
      stopLoss: body.stopLoss,
      target1: body.target1,
      target2: body.target2,
      quantity: body.quantity,
    });
    await users.writeAudit(user.id, 'trade.open', booked.symbol, { id: booked.id });
    return jsonOk(booked, 201);
  } catch (error) {
    return jsonError(error);
  }
}
