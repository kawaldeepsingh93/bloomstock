import { clamp, roundTo } from '@bloomstock/shared';

export function combineConfidence(parts: {
  technical: number;
  news: number;
  market: number;
  riskIntegrity: number;
}): number {
  const blended =
    parts.technical * 0.45 + parts.news * 0.2 + parts.market * 0.2 + parts.riskIntegrity * 0.15;
  return clamp(roundTo(blended, 0), 0, 100);
}

export function riskIntegrity(expectedSize: number, modelSize: number): number {
  if (expectedSize === 0) return 0;
  const drift = Math.abs(expectedSize - modelSize) / expectedSize;
  if (drift > 0.05) {
    return 40;
  }
  return 100;
}
