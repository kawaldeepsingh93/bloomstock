import { deskSessionCopy, parseBody } from '@bloomstock/shared';
import { jsonError, jsonOk } from '@/server/http';
import { requireTrader, requireUser } from '@/server/auth';
import { getContainer, getOrchestrator } from '@/server/container';
import { enforceRateLimit } from '@/server/rate-limit';
import { recommendationSchema } from '@/server/validation';
import { hydrateDeskTrade } from '@/lib/desk-trade';

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
    let overview;
    try {
      overview = await scanService.overview();
    } catch {
      const notes = await prompts.listLatestDeskNotes(user.id);
      return jsonOk(hydrateDeskTrade(scan, notes));
    }
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
    const session = deskSessionCopy();
    return jsonOk(
      {
        ...result,
        sessionDate: session.sessionDate,
        marketOpen: session.marketOpen,
        tapeAsOf: overview.asOf ? new Date(overview.asOf).toISOString() : null,
      },
      201,
    );
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    const { scanService, prompts } = getContainer();
    const scan = await scanService.sessionScan();
    const notes = await prompts.listLatestDeskNotes(user.id);
    let tapeAsOf: string | null = null;
    try {
      tapeAsOf = new Date((await scanService.overview()).asOf).toISOString();
    } catch {
      tapeAsOf = null;
    }
    return jsonOk(hydrateDeskTrade(scan, notes, tapeAsOf));
  } catch (error) {
    return jsonError(error);
  }
}
