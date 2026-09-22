import { formatMorningBrief } from './format';
import type { AiRecommendation } from '@bloomstock/core';

describe('formatMorningBrief', () => {
  it('supports a no-trade morning', () => {
    expect(formatMorningBrief([])).toContain('No Trade Today');
  });

  it('includes entry stop target and confidence for the top 3', () => {
    const pick = {
      id: '1',
      promptSlug: 'todays_trade',
      promptVersion: 1,
      candidate: {
        symbol: 'TCS',
        exchange: 'NSE',
        name: 'TCS',
        setupType: 'flag',
        score: {
          trend: 80,
          momentum: 80,
          volume: 80,
          structure: 80,
          total: 80,
          reasons: [],
          rejects: [],
        },
        risk: {
          capital: 100000,
          riskPercent: 1,
          riskAmount: 1000,
          entry: 4000,
          stopLoss: 3920,
          target1: 4160,
          target2: 4240,
          positionSize: 12,
          positionValue: 48000,
          riskReward: 2,
          atr: 40,
          trailingStop: 3960,
        },
        confidence: 81,
        verdict: 'trade',
        rejectedReason: null,
      },
      agents: {
        market: { regime: 'bullish', rationale: '', confidence: 70 },
        technical: null,
        news: null,
        risk: null,
        portfolio: null,
      },
      reasoning: 'Flag continuation',
      confidence: 81,
      createdAt: new Date(),
    } satisfies AiRecommendation;
    const body = formatMorningBrief([pick]);
    expect(body).toContain('TCS');
    expect(body).toContain('81%');
    expect(body).toContain('Stop');
  });
});
