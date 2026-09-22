'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { apiGet } from '@/lib/api';
import type { BookedTrade } from '@bloomstock/core';
import { formatPrice } from '@bloomstock/shared';
import Link from 'next/link';

export default function TradesPage() {
  const trades = useQuery({
    queryKey: ['trades'],
    queryFn: () => apiGet<BookedTrade[]>('/api/trades'),
  });
  const rows = trades.data ?? [];

  return (
    <div className="space-y-4">
      {trades.error ? (
        <Card>
          <CardBody className="text-sm text-zinc-400">
            Sign in as a trader to book and review blotter rows. Nothing here is simulated.
          </CardBody>
        </Card>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Open and booked swings</CardTitle>
        </CardHeader>
        <CardBody className="overflow-x-auto">
          {rows.length === 0 && !trades.error ? (
            <p className="text-sm text-zinc-500">
              Book a pick from Today’s Trade. Quantity and stops come from the ATR engine.
            </p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2">Symbol</th>
                  <th>Entry</th>
                  <th>Stop</th>
                  <th>T1</th>
                  <th>T2</th>
                  <th>Qty</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((trade) => (
                  <tr key={trade.id} className="border-t border-white/5">
                    <td className="py-2">
                      <Link className="text-[#e8c56b] hover:underline" href={`/stocks/${trade.symbol}`}>
                        {trade.symbol}
                      </Link>
                    </td>
                    <td className="font-mono number">{formatPrice(trade.entry)}</td>
                    <td className="font-mono number">{formatPrice(trade.stopLoss)}</td>
                    <td className="font-mono number">{formatPrice(trade.target1)}</td>
                    <td className="font-mono number">{formatPrice(trade.target2)}</td>
                    <td className="font-mono number">{trade.quantity}</td>
                    <td>{trade.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
