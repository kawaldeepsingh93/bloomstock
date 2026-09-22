'use client';

import { deskSessionCopy, formatIstDate } from '@bloomstock/shared';

export function DeskStatus({
  scanDate,
  stocksScanned,
  regime,
  tapeAsOf,
  message,
}: {
  scanDate?: string | null;
  stocksScanned?: number | null;
  regime?: string | null;
  tapeAsOf?: string | null;
  message?: string | null;
}) {
  const session = deskSessionCopy();
  const tape = tapeAsOf ? formatIstDate(new Date(tapeAsOf)) : null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
      <span>{session.label}</span>
      {scanDate ? <span>Scan {scanDate}</span> : <span>No stored scan</span>}
      {typeof stocksScanned === 'number' ? <span>{stocksScanned} names</span> : null}
      {regime ? <span>Regime {regime}</span> : null}
      {tape ? <span>Tape {tape}</span> : null}
      {message ? <span className="normal-case tracking-normal text-zinc-400">{message}</span> : null}
    </div>
  );
}
