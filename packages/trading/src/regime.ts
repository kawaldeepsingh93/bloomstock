import type { FiiDiiFlow, IndexSnapshot, MarketRegime } from '@bloomstock/core';

export interface RegimeInput {
  nifty: IndexSnapshot;
  vix: IndexSnapshot;
  fiiDii: FiiDiiFlow | null;
}

export function classifyRegime(input: RegimeInput): MarketRegime {
  const niftyUp = input.nifty.changePercent >= 0;
  const vixCalm = input.vix.lastPrice < 18 || input.vix.changePercent < 0;
  const fiiSupport = !input.fiiDii || input.fiiDii.fiiNet >= 0;

  if (niftyUp && vixCalm && fiiSupport) {
    return 'bullish';
  }
  if (!niftyUp && input.vix.lastPrice >= 20 && input.fiiDii && input.fiiDii.fiiNet < 0) {
    return 'bearish';
  }
  return 'neutral';
}
