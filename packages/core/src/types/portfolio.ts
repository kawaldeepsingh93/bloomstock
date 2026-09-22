export type HoldingAction = 'hold' | 'sell' | 'trail';

export interface Holding {
  id: string;
  symbol: string;
  exchange: 'NSE' | 'BSE';
  quantity: number;
  avgPrice: number;
  lastPrice: number | null;
  investedAt: Date | null;
}

export interface Portfolio {
  id: string;
  name: string;
  capital: number;
  holdings: Holding[];
}

export interface AllocationSlice {
  symbol: string;
  weight: number;
  marketValue: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
}

export interface PortfolioAdvice {
  symbol: string;
  action: HoldingAction;
  trailingStop: number | null;
  rationale: string;
}

export interface PortfolioAnalysis {
  portfolioId: string;
  totalValue: number;
  invested: number;
  unrealizedPnl: number;
  allocation: AllocationSlice[];
  riskNotes: string[];
  advice: PortfolioAdvice[];
}

export interface IpoIssue {
  id: string;
  name: string;
  symbol: string | null;
  openDate: Date;
  closeDate: Date;
  priceBandLow: number | null;
  priceBandHigh: number | null;
  lotSize: number | null;
  status: 'upcoming' | 'open' | 'closed' | 'listed';
}
