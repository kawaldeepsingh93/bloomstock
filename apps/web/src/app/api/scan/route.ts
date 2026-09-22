import { parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader, requireUser } from '@/server/auth';
import { getContainer } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { scanRequestSchema } from '@/server/validation';

export async function GET() {
  try {
    await requireUser();
    const { scanService } = getContainer();
    return jsonOk(await scanService.sessionScan());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: Request) {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(user.id, 10);
    const body = parseBody(scanRequestSchema, await request.json());
    const { scanService, users } = getContainer();
    const profile = await users.getProfile(user.id);
    const scan = await scanService.runScan({
      capital: body.capital ?? profile.capital,
      riskPercent: body.riskPercent ?? profile.riskPercent,
      filters: body.filters,
      limit: body.limit,
    });
    await users.writeAudit(user.id, 'scan.run', 'daily_scans', { stocks: scan.stocksScanned });
    return jsonOk(scan, 201);
  } catch (error) {
    return jsonError(error);
  }
}
