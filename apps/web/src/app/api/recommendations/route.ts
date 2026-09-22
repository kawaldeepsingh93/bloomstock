import { nseSessionDate, parseBody, toIsoDate } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader, requireUser } from '@/server/auth';
import { getContainer, getOrchestrator } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { recommendationSchema } from '@/server/validation';

export async function POST(request: Request) {
  try {
    const { user } = await requireTrader();
    await enforceRateLimit(`ai:${user.id}`, 5);
    parseBody(recommendationSchema, await request.json().catch(() => ({})));
    const { scanService, users, market, prompts } = getContainer();
    const profile = await users.getProfile(user.id);
    const scan = await scanService.runScan({
      capital: profile.capital,
      riskPercent: profile.riskPercent,
      limit: 3,
    });
    const overview = await scanService.overview();
    const news = await market.recentNews(undefined, 30);
    const orchestrator = await getOrchestrator();
    const result = await orchestrator.todaysTrade({
      scan,
      overview,
      news,
      capital: profile.capital,
      riskPercent: profile.riskPercent,
      maxPicks: Number(process.env.OPENAI_MAX_RECOMMENDATIONS ?? 3),
    });
    for (const rec of result.recommendations) {
      await prompts.saveRecommendation({
        userId: user.id,
        slug: rec.promptSlug,
        version: rec.promptVersion,
        agentOutputs: rec.agents,
        reasoning: rec.reasoning,
        confidence: rec.confidence,
      });
    }
    await users.writeAudit(user.id, 'recommendations.create', 'ai_recommendations', {
      count: result.recommendations.length,
      noTrade: result.noTrade,
    });
    return jsonOk(result, 201);
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  try {
    await requireUser();
    const { scans } = getContainer();
    const scan = await scans.getByDate(toIsoDate(nseSessionDate()));
    return jsonOk(scan);
  } catch (error) {
    return jsonError(error);
  }
}
