import type { Exchange, MarketRegime } from './market';

export type SetupType = 'breakout' | 'cup_handle' | 'flag' | 'ascending_triangle';
export type TradeSide = 'long';
export type TradeStatus = 'open' | 'closed' | 'stopped' | 'target_hit';
export type ScanVerdict = 'trade' | 'watch' | 'no_trade';
export type EntryStyle = 'at_close' | 'buy_dip';

export interface SwingRules {
  minRsi: number;
  maxRsi: number;
  minVolumeRatio: number;
  minRiskReward: number;
  preferredRiskReward: number;
  requireAboveEma20: boolean;
  requireAboveEma50: boolean;
  requireMacdBullish: boolean;
}

export const DEFAULT_SWING_RULES: SwingRules = {
  minRsi: 55,
  maxRsi: 70,
  minVolumeRatio: 1.5,
  minRiskReward: 2,
  preferredRiskReward: 3,
  requireAboveEma20: true,
  requireAboveEma50: true,
  requireMacdBullish: true,
};

export interface PatternMatch {
  type: SetupType;
  quality: number;
  notes: string[];
}

export interface RiskPlan {
  capital: number;
  riskPercent: number;
  riskAmount: number;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  positionSize: number;
  positionValue: number;
  riskReward: number;
  atr: number;
  trailingStop: number;
  entryStyle?: EntryStyle;
  buyZoneLow?: number | null;
  buyZoneHigh?: number | null;
  breakoutTrigger?: number | null;
}

export interface TechnicalScore {
  trend: number;
  momentum: number;
  volume: number;
  structure: number;
  total: number;
  reasons: string[];
  rejects: string[];
}

export interface SwingCandidate {
  symbol: string;
  exchange: Exchange;
  name: string;
  setupType: SetupType | null;
  score: TechnicalScore;
  risk: RiskPlan | null;
  confidence: number;
  verdict: ScanVerdict;
  rejectedReason: string | null;
}

export interface DailyScanSummary {
  scanDate: string;
  regime: MarketRegime;
  stocksScanned: number;
  candidates: SwingCandidate[];
  noTradeReason: string | null;
}

export interface PriceLevels {
  support: number;
  resistance: number;
  pivot: number;
}

export interface BookedTrade {
  id: string;
  symbol: string;
  exchange: Exchange;
  entry: number;
  stopLoss: number;
  target1: number;
  target2: number;
  quantity: number;
  status: TradeStatus;
  openedAt: Date;
}
