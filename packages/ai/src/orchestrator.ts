import type {
  AgentBundle,
  AiRecommendation,
  DailyScanSummary,
  IpoAnalysis,
  IpoBookReview,
  IpoIssue,
  MarketOverview,
  NewsItem,
  PortfolioAdvice,
  PortfolioAnalysis,
  PromptTemplate,
  ResearchBrief,
  SwingCandidate,
  TodaysTradeResponse,
} from '@bloomstock/core';
import { renderPrompt } from '@bloomstock/database';
import { combineConfidence, riskIntegrity } from './confidence';
import type { LlmClient } from './llm';
import { parseDeskNote, parseIpoAnalysis, parseIpoBook, parseMarketAgent, parseNewsAgent, parseTechnicalAgent } from './parse-agent';
import { portfolioReviewSchema, researchBriefSchema } from './schemas';

export interface OrchestratorDeps {
  llm: LlmClient;
  todaysTradePrompt: PromptTemplate;
}

export class AiOrchestrator {
  constructor(private readonly deps: OrchestratorDeps) {}

  async todaysTrade(input: {
    scan: DailyScanSummary;
    overview: MarketOverview;
    news: NewsItem[];
    capital: number;
    riskPercent: number;
    maxPicks?: number;
  }): Promise<TodaysTradeResponse> {
    const maxPicks = input.maxPicks ?? 3;
    const market = parseMarketAgent(
      await this.deps.llm.completeJson({
        system: this.deps.todaysTradePrompt.system,
        user: JSON.stringify({
          agent: 'market_analyst',
          outputSchema: {
            regime: 'bullish | neutral | bearish — copy backendRegime',
            rationale: 'string',
            confidence: 'number 0-100',
          },
          nifty: input.overview.nifty,
          vix: input.overview.vix,
          fii: input.overview.fiiDii,
          backendRegime: input.scan.regime,
        }),
      }),
      input.scan.regime,
    );

    if (input.scan.candidates.length === 0 || input.scan.noTradeReason) {
      return {
        scan: input.scan,
        recommendations: [],
        noTrade: true,
        message: input.scan.noTradeReason ?? 'No Trade Today',
      };
    }

    const recommendations: AiRecommendation[] = [];
    for (const candidate of input.scan.candidates.slice(0, maxPicks)) {
      const newsForSymbol = input.news.filter((item) => item.symbol === candidate.symbol);
      const technicalJson = await this.deps.llm.completeJson({
        system: this.deps.todaysTradePrompt.system,
        user: JSON.stringify({
          agent: 'technical_analyst',
          outputSchema: {
            symbol: 'string',
            technicalScore: 'number 0-100',
            setupQuality: 'string',
            rationale: 'string',
          },
          candidate,
          instruction:
            'Do not recompute indicators. Narrate the backend score only. If verdict is watch or entryStyle is buy_dip, say BUY ON DIP and never recommend buying the last close. Missing news is not a veto.',
        }),
      });
      const newsJson =
        newsForSymbol.length === 0
          ? null
          : await this.deps.llm.completeJson({
              system: this.deps.todaysTradePrompt.system,
              user: JSON.stringify({
                agent: 'news_analyst',
                outputSchema: {
                  symbol: 'string',
                  catalystScore: 'number 0-100',
                  headline: 'string or null',
                  rationale: 'string',
                },
                symbol: candidate.symbol,
                news: newsForSymbol,
                instruction:
                  'Missing headlines are not a veto. Never say No Trade Today. catalystScore 50 means no edge from news.',
              }),
            });
      const technical = parseTechnicalAgent(
        technicalJson,
        candidate.symbol,
        candidate.confidence,
      );
      const news = newsJson
        ? parseNewsAgent(newsJson, candidate.symbol)
        : {
            symbol: candidate.symbol,
            catalystScore: 50,
            headline: null,
            rationale: 'No filings in the tape. The swing case is technical, not news-driven.',
          };
      const agents: AgentBundle = {
        market,
        technical,
        news,
        risk: candidate.risk
          ? {
              symbol: candidate.symbol,
              positionSize: candidate.risk.positionSize,
              stopLoss: candidate.risk.stopLoss,
              target1: candidate.risk.target1,
              target2: candidate.risk.target2,
              rationale: 'Position size and stops come from the ATR risk engine, not the model.',
            }
          : null,
        portfolio: null,
      };
      const confidence = combineConfidence({
        technical: candidate.confidence,
        news: news.catalystScore,
        market: market.confidence,
        riskIntegrity: candidate.risk
          ? riskIntegrity(candidate.risk.positionSize, candidate.risk.positionSize)
          : 0,
      });
      recommendations.push({
        id: `${candidate.symbol}-${input.scan.scanDate}`,
        promptSlug: this.deps.todaysTradePrompt.slug,
        promptVersion: this.deps.todaysTradePrompt.version,
        candidate,
        agents,
        reasoning: `${technical.rationale} ${news.rationale}`,
        confidence,
        createdAt: new Date(),
      });
    }

    const desk = parseDeskNote(
      await this.deps.llm.completeJson({
        system: this.deps.todaysTradePrompt.system,
        user: renderPrompt(this.deps.todaysTradePrompt.user, {
          regime: input.scan.regime,
          scanDate: input.scan.scanDate,
          marketOverview: JSON.stringify(input.overview),
          candidates: JSON.stringify(input.scan.candidates),
          news: JSON.stringify(input.news),
          capital: String(input.capital),
          riskPercent: String(input.riskPercent),
        }),
      }),
      {
        noTrade: recommendations.length === 0,
        message:
          recommendations.length === 0
            ? (input.scan.noTradeReason ?? 'No Trade Today')
            : 'Desk note from backend scan facts.',
      },
    );

    return {
      scan: input.scan,
      recommendations,
      noTrade: recommendations.length === 0,
      message: recommendations.length === 0 ? desk.message : desk.message,
    };
  }

  async research(
    candidate: SwingCandidate,
    news: NewsItem[],
    template: PromptTemplate,
  ): Promise<ResearchBrief> {
    return researchBriefSchema.parse(
      JSON.parse(
        await this.deps.llm.completeJson({
          system: template.system,
          user: renderPrompt(template.user, {
            instrument: JSON.stringify({ symbol: candidate.symbol, name: candidate.name }),
            snapshot: JSON.stringify(candidate.score),
            news: JSON.stringify(news),
          }),
        }),
      ),
    );
  }

  async reviewPortfolio(
    analysis: PortfolioAnalysis,
    template: PromptTemplate,
  ): Promise<PortfolioAdvice[]> {
    const parsed = portfolioReviewSchema.parse(
      JSON.parse(
        await this.deps.llm.completeJson({
          system: template.system,
          user: renderPrompt(template.user, {
            analysis: JSON.stringify(analysis),
            snapshots: JSON.stringify(analysis.allocation),
            advice: JSON.stringify(analysis.advice),
          }),
        }),
      ),
    );
    return analysis.advice.map((item) => {
      const model = parsed.advice.find((row) => row.symbol === item.symbol);
      if (!model) return item;
      return {
        ...item,
        action: model.action,
        rationale: `${item.rationale} ${model.rationale}`,
      };
    });
  }

  async analyzeIpo(ipo: IpoIssue, template: PromptTemplate): Promise<IpoAnalysis> {
    return parseIpoAnalysis(
      await this.deps.llm.completeJson({
        system: template.system,
        user: `${renderPrompt(template.user, {
          ipo: JSON.stringify(ipo),
          peers: '[]',
          facts: JSON.stringify(ipo),
        })}\nReturn a JSON object with keys name, verdict (subscribe|avoid|wait), rationale, and risks.`,
      }),
      ipo.name,
    );
  }

  async reviewIpoBook(ipos: IpoIssue[], template: PromptTemplate): Promise<IpoBookReview> {
    if (ipos.length === 0) {
      return { headline: 'No live IPO issues in the calendar.', subscribe: 0, wait: 0, avoid: 0, reviews: [] };
    }
    return parseIpoBook(
      await this.deps.llm.completeJson({
        system: template.system,
        user: `IPO calendar facts from the backend:\n${JSON.stringify(
          ipos.map((ipo) => ({
            name: ipo.name,
            symbol: ipo.symbol,
            status: ipo.status,
            openDate: ipo.openDate,
            closeDate: ipo.closeDate,
            priceBandLow: ipo.priceBandLow,
            priceBandHigh: ipo.priceBandHigh,
            lotSize: ipo.lotSize,
          })),
        )}\nReturn a JSON object with headline and reviews[]. Each review needs name, verdict (subscribe|avoid|wait), rationale, and risks. Cover every issue. Do not invent prices.`,
      }),
      ipos,
    );
  }
}
