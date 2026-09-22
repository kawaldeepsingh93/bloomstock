import { parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader } from '@/server/auth';
import { getContainer, getOrchestrator } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { ipoAnalyzeSchema } from '@/server/validation';

export async function POST(request: Request) {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(`ai:${user.id}`, 5);
    const body = parseBody(ipoAnalyzeSchema, await request.json().catch(() => ({})));
    const { market, prompts, users } = getContainer();
    const template = await prompts.getActive('ipo_analysis');
    const orchestrator = await getOrchestrator();
    if (body.id) {
      const ipo = await market.getIpo(body.id);
      const analysis = await orchestrator.analyzeIpo(ipo, template);
      await users.writeAudit(user.id, 'ipo.analyze', ipo.id, { verdict: analysis.verdict });
      return jsonOk({ ipo, analysis });
    }
    const ipos = await market.listIpos();
    const book = await orchestrator.reviewIpoBook(ipos, template);
    await users.writeAudit(user.id, 'ipo.analyze_book', 'ipo_issues', {
      count: book.reviews.length,
      subscribe: book.subscribe,
    });
    return jsonOk(book);
  } catch (error) {
    return jsonError(error);
  }
}
