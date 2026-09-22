'use client';

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import type { SwingCandidate } from '@bloomstock/core';
import { Badge } from '@bloomstock/ui';
import Link from 'next/link';

const helper = createColumnHelper<SwingCandidate>();

const columns = [
  helper.accessor('symbol', {
    header: 'Symbol',
    cell: (info) => (
      <Link className="text-[#e8c56b] hover:underline" href={`/stocks/${info.getValue()}`}>
        {info.getValue()}
      </Link>
    ),
  }),
  helper.accessor('setupType', { header: 'Setup' }),
  helper.accessor('confidence', {
    header: 'Score',
    cell: (info) => <span className="font-mono number">{info.getValue()}</span>,
  }),
  helper.accessor('risk.entry', {
    header: 'Entry',
    cell: (info) => {
      const risk = info.row.original.risk;
      if (!risk) return <span className="font-mono number">—</span>;
      if (risk.entryStyle === 'buy_dip' && risk.buyZoneLow && risk.buyZoneHigh) {
        return (
          <span className="font-mono number">
            {risk.buyZoneLow}–{risk.buyZoneHigh} dip
          </span>
        );
      }
      return <span className="font-mono number">{risk.entry}</span>;
    },
  }),
  helper.accessor('risk.stopLoss', {
    header: 'Stop',
    cell: (info) => <span className="font-mono number">{info.getValue() ?? '—'}</span>,
  }),
  helper.accessor('verdict', {
    header: 'Verdict',
    cell: (info) => {
      const verdict = info.getValue();
      const tone = verdict === 'trade' ? 'up' : verdict === 'watch' ? 'gold' : 'neutral';
      return <Badge tone={tone}>{verdict === 'watch' ? 'buy on dip' : verdict}</Badge>;
    },
  }),
];

export function ScannerTable({ rows }: { rows: SwingCandidate[] }) {
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  return (
    <div className="overflow-x-auto rounded-2xl border border-white/8">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/5 text-xs uppercase tracking-wide text-zinc-500">
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id}>
              {group.headers.map((header) => (
                <th key={header.id} className="px-4 py-3">
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr key={row.id} className="border-t border-white/5">
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className="px-4 py-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-zinc-500">
          No names passed the swing filter.
        </p>
      ) : null}
    </div>
  );
}
