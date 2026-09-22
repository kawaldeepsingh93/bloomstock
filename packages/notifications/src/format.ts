import type { AiRecommendation, Profile } from '@bloomstock/core';
import { formatInr, formatPrice } from '@bloomstock/shared';

export function formatMorningBrief(picks: AiRecommendation[]): string {
  if (picks.length === 0) {
    return 'BloomStock — No Trade Today. The scanner rejected the universe against swing rules.';
  }
  const lines = picks.slice(0, 3).map((pick, index) => {
    const risk = pick.candidate?.risk;
    return [
      `${index + 1}. ${pick.candidate?.symbol} (${pick.confidence}% confidence)`,
      risk
        ? `Entry ${formatPrice(risk.entry)} | Stop ${formatPrice(risk.stopLoss)} | T1 ${formatPrice(risk.target1)} | Size ${risk.positionSize} | Risk ${formatInr(risk.riskAmount)}`
        : 'Risk plan unavailable',
    ].join('\n');
  });
  return ['BloomStock — Top swing ideas', ...lines].join('\n\n');
}

export function shouldNotify(profile: Profile): boolean {
  return profile.notifyEmail || profile.notifyTelegram || profile.notifyWhatsapp;
}
