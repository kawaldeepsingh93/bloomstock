import { z } from 'zod';

export const marketAgentSchema = z.object({
  regime: z.enum(['bullish', 'neutral', 'bearish']),
  rationale: z.string(),
  confidence: z.number().min(0).max(100),
});

export const technicalAgentSchema = z.object({
  symbol: z.string(),
  technicalScore: z.number().min(0).max(100),
  setupQuality: z.string(),
  rationale: z.string(),
});

export const newsAgentSchema = z.object({
  symbol: z.string(),
  catalystScore: z.number().min(0).max(100),
  headline: z.string().nullable(),
  rationale: z.string(),
});

export const riskAgentSchema = z.object({
  symbol: z.string(),
  positionSize: z.number(),
  stopLoss: z.number(),
  target1: z.number(),
  target2: z.number(),
  rationale: z.string(),
});

export const deskNoteSchema = z.object({
  noTrade: z.boolean(),
  message: z.string(),
  picks: z.array(
    z.object({
      symbol: z.string(),
      reasoning: z.string(),
      confidence: z.number().min(0).max(100),
    }),
  ),
});

export const portfolioAgentSchema = z.object({
  symbol: z.string(),
  action: z.enum(['hold', 'sell', 'trail']),
  rationale: z.string(),
});

export const portfolioReviewSchema = z.object({
  advice: z.array(portfolioAgentSchema),
});

export const researchBriefSchema = z.object({
  symbol: z.string(),
  thesis: z.string(),
  risks: z.array(z.string()),
  invalidation: z.string(),
  briefing: z.string(),
});

export const ipoAnalysisSchema = z.object({
  name: z.string(),
  verdict: z.enum(['subscribe', 'avoid', 'wait']),
  rationale: z.string(),
  risks: z.array(z.string()),
});
