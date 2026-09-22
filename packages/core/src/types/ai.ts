import type { MarketRegime } from './market';
import type { DailyScanSummary, SwingCandidate } from './trading';
import type { PortfolioAdvice, IpoIssue } from './portfolio';

export type PromptSlug =
  'todays_trade' | 'portfolio_review' | 'ipo_analysis' | 'stock_deep_research';

export interface PromptTemplate {
  slug: PromptSlug;
  version: number;
  system: string;
  user: string;
  isActive: boolean;
}

export interface MarketAnalystOutput {
  regime: MarketRegime;
  rationale: string;
  confidence: number;
}

export interface TechnicalAnalystOutput {
  symbol: string;
  technicalScore: number;
  setupQuality: string;
  rationale: string;
}

export interface NewsAnalystOutput {
  symbol: string;
  catalystScore: number;
  headline: string | null;
  rationale: string;
}

export interface RiskManagerOutput {
  symbol: string;
  positionSize: number;
  stopLoss: number;
  target1: number;
  target2: number;
  rationale: string;
}

export interface PortfolioManagerOutput {
  symbol: string;
  action: 'hold' | 'sell' | 'trail';
  rationale: string;
}

export interface AgentBundle {
  market: MarketAnalystOutput;
  technical: TechnicalAnalystOutput | null;
  news: NewsAnalystOutput | null;
  risk: RiskManagerOutput | null;
  portfolio: PortfolioManagerOutput | null;
}

export interface AiRecommendation {
  id: string;
  promptSlug: PromptSlug;
  promptVersion: number;
  candidate: SwingCandidate | null;
  agents: AgentBundle;
  reasoning: string;
  confidence: number;
  createdAt: Date;
}

export interface TodaysTradeResponse {
  scan: DailyScanSummary;
  recommendations: AiRecommendation[];
  noTrade: boolean;
  message: string;
  sessionDate?: string;
  marketOpen?: boolean;
  tapeAsOf?: string | null;
}

export interface PortfolioReviewResponse {
  advice: PortfolioAdvice[];
  recommendations: AiRecommendation[];
}

export interface ResearchBrief {
  symbol: string;
  thesis: string;
  risks: string[];
  invalidation: string;
  briefing: string;
}

export interface IpoAnalysis {
  name: string;
  verdict: 'subscribe' | 'avoid' | 'wait';
  rationale: string;
  risks: string[];
}

export interface IpoReviewedIssue {
  ipo: IpoIssue;
  analysis: IpoAnalysis;
}

export interface IpoBookReview {
  headline: string;
  subscribe: number;
  wait: number;
  avoid: number;
  reviews: IpoReviewedIssue[];
}
