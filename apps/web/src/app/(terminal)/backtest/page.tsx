'use client';

import { useMutation } from '@tanstack/react-query';
import { Button, Card, CardBody, CardHeader, CardTitle, Input } from '@bloomstock/ui';
import { apiPost } from '@/lib/api';
import { useState } from 'react';
import type { BacktestReport } from '@bloomstock/trading';

export default function BacktestPage() {
  const [symbol, setSymbol] = useState('INFY');
  const [from, setFrom] = useState('2022-01-01');
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const run = useMutation({
    mutationFn: () => apiPost<BacktestReport>('/api/backtest', { symbol, from, to }),
  });
  const report = run.data;

  return (
    <div className="space-y-6">
      <Card>
        <CardBody className="grid gap-3 md:grid-cols-4">
          <Input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} />
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <Button variant="gold" onClick={() => run.mutate()} disabled={run.isPending}>
            {run.isPending ? 'Running…' : 'Run backtest'}
          </Button>
        </CardBody>
      </Card>
      {run.error ? <p className="text-sm text-rose-300">{(run.error as Error).message}</p> : null}
      {report ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Win rate" value={`${report.winRate.toFixed(1)}%`} />
          <Stat label="Profit factor" value={report.profitFactor.toFixed(2)} />
          <Stat label="Max drawdown" value={`${(report.maxDrawdown * 100).toFixed(1)}%`} />
          <Stat label="Sharpe" value={report.sharpeRatio.toFixed(2)} />
        </div>
      ) : (
        <Card>
          <CardBody className="text-sm text-zinc-400">
            Backtests replay stored daily candles through the same swing rules. They will be empty
            until the morning job has ingested history for the symbol.
          </CardBody>
        </Card>
      )}
      {report?.trades.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Trades</CardTitle>
          </CardHeader>
          <CardBody className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="py-2">Entry</th>
                  <th>Exit</th>
                  <th>P&L</th>
                </tr>
              </thead>
              <tbody>
                {report.trades.map((trade, index) => (
                  <tr key={`${trade.entryDate}-${index}`} className="border-t border-white/5">
                    <td className="py-2 font-mono number">{trade.entry}</td>
                    <td className="font-mono number">{trade.exit}</td>
                    <td className="font-mono number">{trade.pnlPercent}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="font-mono text-2xl number">{value}</p>
      </CardBody>
    </Card>
  );
}
