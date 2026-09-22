import type { IndicatorSnapshot, RiskPlan, SwingRules } from '@bloomstock/core';
import { DEFAULT_SWING_RULES } from '@bloomstock/core';
import { AppError } from '@bloomstock/core';
import { roundTo } from '@bloomstock/shared';

export interface RiskInput {
  capital: number;
  riskPercent: number;
  snapshot: IndicatorSnapshot;
  entry?: number;
  stopLoss?: number;
  atrMultiple?: number;
  rules?: SwingRules;
}

export function buildRiskPlan(input: RiskInput): RiskPlan {
  const { capital, riskPercent, snapshot } = input;
  const atrMultiple = input.atrMultiple ?? 1.5;
  const rules = input.rules ?? DEFAULT_SWING_RULES;

  if (capital <= 0) {
    throw new AppError('INVALID_CAPITAL', 'Capital must be positive', 422);
  }
  if (riskPercent <= 0 || riskPercent > 5) {
    throw new AppError('INVALID_RISK', 'Risk percent must be between 0 and 5', 422);
  }
  if (snapshot.atr <= 0) {
    throw new AppError('INVALID_ATR', 'ATR must be positive to size a trade', 422);
  }

  const entry = input.entry ?? snapshot.close;
  const stopLoss = roundTo(input.stopLoss ?? entry - snapshot.atr * atrMultiple, 2);
  if (stopLoss <= 0 || stopLoss >= entry) {
    throw new AppError('INVALID_STOP', 'Computed stop loss is invalid for a long swing', 422);
  }

  const riskAmount = roundTo(capital * (riskPercent / 100), 2);
  const perShareRisk = roundTo(entry - stopLoss, 2);
  const positionSize = Math.max(0, Math.floor(riskAmount / perShareRisk));
  const target1 = roundTo(entry + perShareRisk * rules.minRiskReward, 2);
  const target2 = roundTo(entry + perShareRisk * rules.preferredRiskReward, 2);
  const trailingStop = roundTo(entry - snapshot.atr, 2);

  return {
    capital,
    riskPercent,
    riskAmount,
    entry,
    stopLoss,
    target1,
    target2,
    positionSize,
    positionValue: roundTo(positionSize * entry, 2),
    riskReward: rules.minRiskReward,
    atr: snapshot.atr,
    trailingStop,
    entryStyle: 'at_close',
    buyZoneLow: null,
    buyZoneHigh: null,
    breakoutTrigger: null,
  };
}

export function riskRewardFrom(entry: number, stop: number, target: number): number {
  const risk = entry - stop;
  if (risk <= 0) {
    return 0;
  }
  return roundTo((target - entry) / risk, 2);
}
