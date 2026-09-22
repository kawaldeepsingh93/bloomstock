import { nseSessionDate } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { getContainer } from '@/server/container';

export async function GET() {
  try {
    const { market } = getContainer();
    const all = await market.listIpos();
    const cutoff = new Date(nseSessionDate());
    cutoff.setUTCDate(cutoff.getUTCDate() - 21);
    const issues = all.filter(
      (ipo) => ipo.status === 'open' || ipo.status === 'upcoming' || ipo.closeDate >= cutoff,
    );
    return jsonOk(issues);
  } catch (error) {
    return jsonError(error);
  }
}
