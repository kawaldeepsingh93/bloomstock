import { jsonError, jsonOk } from '@/server/http';
import { enforceRateLimit } from '@/server/rate-limit';
import { getContainer } from '@/server/container';

export async function GET(request: Request) {
  try {
    await enforceRateLimit(request.headers.get('x-forwarded-for') ?? 'anon');
    const { scanService, cache, market } = getContainer();
    try {
      const overview = await scanService.overview();
      return jsonOk(overview);
    } catch {
      const fiiDii = await market.latestFiiDii();
      const cached = await cache.get('market:overview');
      return jsonOk(
        cached ?? {
          nifty: null,
          bankNifty: null,
          vix: null,
          fiiDii,
          regime: null,
          asOf: null,
          message: 'Connect Kite Connect and run the morning worker to load live NSE indexes.',
        },
      );
    }
  } catch (error) {
    return jsonError(error);
  }
}
