'use client';

import { Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import Link from 'next/link';

export function TapeList({
  title,
  rows,
}: {
  title: string;
  rows: { symbol: string; changePercent: number }[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardBody>
        {rows.length === 0 ? (
          <p className="text-sm text-zinc-400">Fills from the morning close-to-close tape.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((row) => (
              <li key={row.symbol} className="flex items-center justify-between">
                <Link className="text-[#e8c56b] hover:underline" href={`/stocks/${row.symbol}`}>
                  {row.symbol}
                </Link>
                <span
                  className={`font-mono number ${row.changePercent >= 0 ? 'text-[#3ee0a2]' : 'text-[#ff6b8a]'}`}
                >
                  {row.changePercent.toFixed(2)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
