export function sanitizeInstrumentLots(lotSize: number, tickSize: number): {
  lotSize: number;
  tickSize: number;
} {
  return {
    lotSize: Number.isFinite(lotSize) && lotSize > 0 ? Math.trunc(lotSize) : 1,
    tickSize: Number.isFinite(tickSize) && tickSize > 0 ? tickSize : 0.05,
  };
}
