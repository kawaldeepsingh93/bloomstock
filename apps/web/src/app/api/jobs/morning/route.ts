import { jsonError, jsonOk } from '@/server/http';
import { requireTrader } from '@/server/auth';
import { enforceRateLimit } from '@/server/rate-limit';
import { getMorningJobStatus, startMorningJob } from '@/server/morning-job';

export async function GET() {
  try {
    await requireTrader();
    return jsonOk(await getMorningJobStatus());
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST() {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(`morning:${user.id}`, 4, 60 * 60_000);
    return jsonOk(await startMorningJob(), 202);
  } catch (error) {
    return jsonError(error);
  }
}
