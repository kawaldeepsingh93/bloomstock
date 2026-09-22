import { jsonError, jsonOk } from '@/server/http';
import { requireTrader } from '@/server/auth';
import { getContainer } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { NseIpoProvider } from '@bloomstock/market-data';

export async function POST() {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(`ipo:${user.id}`, 6);
    const { market, users } = getContainer();
    const issues = await new NseIpoProvider().current();
    await market.upsertIpos(issues);
    await users.writeAudit(user.id, 'ipo.sync', 'ipo_issues', { count: issues.length });
    return jsonOk({ count: issues.length, issues });
  } catch (error) {
    return jsonError(error);
  }
}
