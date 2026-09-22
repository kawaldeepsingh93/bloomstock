import { jsonError, jsonOk } from '@/server/http';
import { getContainer } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';

export async function GET(request: Request) {
  try {
    await enforceRateLimit(request.headers.get('x-forwarded-for') ?? 'anon');
    const { market } = getContainer();
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol') ?? undefined;
    const news = await market.recentNews(symbol ?? undefined, 50);
    return jsonOk(news);
  } catch (error) {
    return jsonError(error);
  }
}
