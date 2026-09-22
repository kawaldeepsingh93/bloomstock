import { parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireUser } from '@/server/auth';
import { getContainer } from '@/server/container';
import { watchlistItemSchema } from '@/server/validation';

export async function GET() {
  try {
    const user = await requireUser();
    const { users } = getContainer();
    const watchlist = await users.getDefaultWatchlist(user.id);
    return jsonOk(watchlist);
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = parseBody(watchlistItemSchema, await request.json());
    const { users } = getContainer();
    const watchlist = await users.getDefaultWatchlist(user.id);
    await users.addWatchlistSymbol(watchlist.id, body.symbol.toUpperCase(), body.exchange ?? 'NSE');
    await users.writeAudit(user.id, 'watchlist.add', body.symbol, { exchange: body.exchange });
    return jsonOk(await users.getDefaultWatchlist(user.id), 201);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const body = parseBody(watchlistItemSchema, await request.json());
    const { users } = getContainer();
    const watchlist = await users.getDefaultWatchlist(user.id);
    await users.removeWatchlistSymbol(watchlist.id, body.symbol.toUpperCase());
    return jsonOk({ removed: body.symbol });
  } catch (error) {
    return jsonError(error);
  }
}
