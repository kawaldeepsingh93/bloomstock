import { combineConfidence, riskIntegrity } from './confidence';
import { AiOrchestrator } from './orchestrator';
import type { LlmClient } from './llm';
import type {
  DailyScanSummary,
  MarketOverview,
  PromptTemplate,
  SwingCandidate,
} from '@bloomstock/core';

const prompt: PromptTemplate = {
  slug: 'todays_trade',
  version: 1,
  isActive: true,
  system: 'JSON only.',
  user: 'Regime {{regime}}',
};

function candidate(): SwingCandidate {
  return {
    symbol: 'RELIANCE',
    exchange: 'NSE',
    name: 'Reliance',
    setupType: 'breakout',
    score: {
      trend: 90,
      momentum: 80,
      volume: 80,
      structure: 80,
      total: 84,
      reasons: ['Price is above EMA20'],
      rejects: [],
    },
    risk: {
      capital: 100000,
      riskPercent: 1,
      riskAmount: 1000,
      entry: 1400,
      stopLoss: 1360,
      target1: 1480,
      target2: 1520,
      positionSize: 25,
      positionValue: 35000,
      riskReward: 2,
      atr: 26,
      trailingStop: 1374,
    },
    confidence: 84,
    verdict: 'trade',
    rejectedReason: null,
  };
}

describe('confidence', () => {
  it('penalizes model size drift against the risk engine', () => {
    expect(riskIntegrity(25, 25)).toBe(100);
    expect(riskIntegrity(25, 40)).toBe(40);
    expect(
      combineConfidence({ technical: 80, news: 50, market: 70, riskIntegrity: 100 }),
    ).toBeGreaterThan(70);
  });
});

describe('AiOrchestrator', () => {
  it('returns No Trade Today without calling a pick loop when the scan is empty', async () => {
    const llm: LlmClient = {
      completeJson: jest.fn(async () =>
        JSON.stringify({ regime: 'bearish', rationale: 'Risk-off', confidence: 80 }),
      ),
    };
    const orchestrator = new AiOrchestrator({ llm, todaysTradePrompt: prompt });
    const scan: DailyScanSummary = {
      scanDate: '2026-09-18',
      regime: 'bearish',
      stocksScanned: 2000,
      candidates: [],
      noTradeReason: 'Market regime is bearish. No swing longs today.',
    };
    const overview: MarketOverview = {
      nifty: { symbol: 'NIFTY 50', lastPrice: 24000, changePercent: -1, asOf: new Date() },
      bankNifty: { symbol: 'NIFTY BANK', lastPrice: 51000, changePercent: -1, asOf: new Date() },
      vix: { symbol: 'INDIA VIX', lastPrice: 22, changePercent: 8, asOf: new Date() },
      fiiDii: null,
      regime: 'bearish',
      asOf: new Date(),
      gainers: [],
      losers: [],
      sectors: [],
    };
    const result = await orchestrator.todaysTrade({
      scan,
      overview,
      news: [],
      capital: 100000,
      riskPercent: 1,
    });
    expect(result.noTrade).toBe(true);
    expect(result.recommendations).toHaveLength(0);
    expect(llm.completeJson).toHaveBeenCalledTimes(1);
  });

  it('still returns No Trade Today when the market agent omits schema keys', async () => {
    const llm: LlmClient = {
      completeJson: jest.fn(async () => JSON.stringify({ agent: 'market_analyst', ok: true })),
    };
    const orchestrator = new AiOrchestrator({ llm, todaysTradePrompt: prompt });
    const result = await orchestrator.todaysTrade({
      scan: {
        scanDate: '2026-09-18',
        regime: 'neutral',
        stocksScanned: 2000,
        candidates: [],
        noTradeReason: 'No Trade Today. No stock cleared trend, momentum, volume, and structure filters.',
      },
      overview: {
        nifty: { symbol: 'NIFTY 50', lastPrice: 25000, changePercent: 0.2, asOf: new Date() },
        bankNifty: { symbol: 'NIFTY BANK', lastPrice: 52000, changePercent: 0.1, asOf: new Date() },
        vix: { symbol: 'INDIA VIX', lastPrice: 13, changePercent: -1, asOf: new Date() },
        fiiDii: null,
        regime: 'neutral',
        asOf: new Date(),
        gainers: [],
        losers: [],
        sectors: [],
      },
      news: [],
      capital: 100000,
      riskPercent: 1,
    });
    expect(result.noTrade).toBe(true);
    expect(result.message).toContain('No Trade Today');
  });

  it('keeps backend risk numbers and does not let the model resize the trade', async () => {
    const llm: LlmClient = {
      completeJson: jest.fn(async (input) => {
        if (String(input.user).includes('technical_analyst')) {
          return JSON.stringify({
            symbol: 'RELIANCE',
            technicalScore: 84,
            setupQuality: 'breakout',
            rationale: 'Backend trend stack is aligned.',
          });
        }
        if (String(input.user).includes('news_analyst')) {
          return JSON.stringify({
            symbol: 'RELIANCE',
            catalystScore: 55,
            headline: null,
            rationale: 'No material catalyst.',
          });
        }
        if (
          String(input.user).includes('market_analyst') ||
          input.user.includes('"agent":"market_analyst"')
        ) {
          return JSON.stringify({
            regime: 'bullish',
            rationale: 'Nifty up, VIX calm',
            confidence: 72,
          });
        }
        return JSON.stringify({
          noTrade: false,
          message: 'One high-quality breakout.',
          picks: [{ symbol: 'RELIANCE', reasoning: 'Breakout', confidence: 80 }],
        });
      }),
    };
    const orchestrator = new AiOrchestrator({ llm, todaysTradePrompt: prompt });
    const pick = candidate();
    const result = await orchestrator.todaysTrade({
      scan: {
        scanDate: '2026-09-18',
        regime: 'bullish',
        stocksScanned: 2000,
        candidates: [pick],
        noTradeReason: null,
      },
      overview: {
        nifty: { symbol: 'NIFTY 50', lastPrice: 25000, changePercent: 0.7, asOf: new Date() },
        bankNifty: { symbol: 'NIFTY BANK', lastPrice: 52000, changePercent: 0.5, asOf: new Date() },
        vix: { symbol: 'INDIA VIX', lastPrice: 12, changePercent: -3, asOf: new Date() },
        fiiDii: null,
        regime: 'bullish',
        asOf: new Date(),
        gainers: [],
        losers: [],
        sectors: [],
      },
      news: [],
      capital: 100000,
      riskPercent: 1,
    });
    expect(result.recommendations[0]?.candidate?.risk?.positionSize).toBe(25);
    expect(result.recommendations[0]?.agents.risk?.stopLoss).toBe(1360);
    expect(result.noTrade).toBe(false);
    expect(result.recommendations[0]?.reasoning).not.toMatch(/No Trade Today/i);
    expect(
      (llm.completeJson as jest.Mock).mock.calls.every(
        (call) => !String(call[0]?.user).includes('news_analyst'),
      ),
    ).toBe(true);
  });

  it('keeps engine trailing stops when the portfolio agent narrates', async () => {
    const llm: LlmClient = {
      completeJson: jest.fn(async () =>
        JSON.stringify({
          advice: [{ symbol: 'HDFCBANK', action: 'trail', rationale: 'Let winners run.' }],
        }),
      ),
    };
    const orchestrator = new AiOrchestrator({ llm, todaysTradePrompt: prompt });
    const advice = await orchestrator.reviewPortfolio(
      {
        portfolioId: 'p1',
        totalValue: 15000,
        invested: 14000,
        unrealizedPnl: 1000,
        allocation: [
          {
            symbol: 'HDFCBANK',
            weight: 100,
            marketValue: 15000,
            unrealizedPnl: 1000,
            unrealizedPnlPercent: 7.1,
          },
        ],
        riskNotes: [],
        advice: [
          {
            symbol: 'HDFCBANK',
            action: 'hold',
            trailingStop: 1420,
            rationale: 'ATR trail from the engine.',
          },
        ],
      },
      { ...prompt, slug: 'portfolio_review' },
    );
    expect(advice[0]?.trailingStop).toBe(1420);
    expect(advice[0]?.action).toBe('trail');
    expect(advice[0]?.rationale).toContain('ATR trail from the engine.');
  });

  it('returns a subscribe/avoid/wait IPO view from facts only', async () => {
    const llm: LlmClient = {
      completeJson: jest.fn(async () =>
        JSON.stringify({
          name: 'Example IPO',
          verdict: 'wait',
          rationale: 'Subscription data is incomplete.',
          risks: ['Grey market is not a listing guarantee'],
        }),
      ),
    };
    const orchestrator = new AiOrchestrator({ llm, todaysTradePrompt: prompt });
    const analysis = await orchestrator.analyzeIpo(
      {
        id: 'ipo-1',
        name: 'Example IPO',
        symbol: 'EXAM',
        openDate: new Date('2026-09-20'),
        closeDate: new Date('2026-09-24'),
        priceBandLow: 90,
        priceBandHigh: 96,
        lotSize: 150,
        status: 'upcoming',
      },
      { ...prompt, slug: 'ipo_analysis' },
    );
    expect(analysis.verdict).toBe('wait');
    expect(analysis.risks).toHaveLength(1);
  });

  it('reviews the full IPO calendar in one desk pass', async () => {
    const llm: LlmClient = {
      completeJson: jest.fn(async () =>
        JSON.stringify({
          headline: 'Wait on incomplete books.',
          reviews: [
            {
              name: 'Example IPO',
              verdict: 'wait',
              rationale: 'Subscription data is incomplete.',
              risks: ['Grey market is not a listing guarantee'],
            },
          ],
        }),
      ),
    };
    const orchestrator = new AiOrchestrator({ llm, todaysTradePrompt: prompt });
    const book = await orchestrator.reviewIpoBook(
      [
        {
          id: 'ipo-1',
          name: 'Example IPO',
          symbol: 'EXAM',
          openDate: new Date('2026-09-20'),
          closeDate: new Date('2026-09-24'),
          priceBandLow: 90,
          priceBandHigh: 96,
          lotSize: 150,
          status: 'upcoming',
        },
      ],
      { ...prompt, slug: 'ipo_analysis' },
    );
    expect(llm.completeJson).toHaveBeenCalledTimes(1);
    expect(book.wait).toBe(1);
    expect(book.reviews[0]?.analysis.verdict).toBe('wait');
  });
});
