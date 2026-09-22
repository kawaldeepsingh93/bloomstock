'use client';

import { Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';

export function Heatmap({ cells }: { cells: { label: string; change: number }[] }) {
  if (cells.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Sector heatmap</CardTitle>
        </CardHeader>
        <CardBody className="text-sm text-zinc-400">
          Heatmap fills after the morning universe ingest completes.
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle>Sector heatmap</CardTitle>
      </CardHeader>
      <CardBody className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {cells.map((cell) => (
          <div
            key={cell.label}
            className="rounded-xl px-3 py-4 text-sm"
            style={{
              background:
                cell.change >= 0
                  ? `rgba(62, 224, 162, ${Math.min(0.45, Math.abs(cell.change) / 8)})`
                  : `rgba(255, 107, 138, ${Math.min(0.45, Math.abs(cell.change) / 8)})`,
            }}
          >
            <p className="text-zinc-200">{cell.label}</p>
            <p className="font-mono number">{cell.change.toFixed(2)}%</p>
          </div>
        ))}
      </CardBody>
    </Card>
  );
}
