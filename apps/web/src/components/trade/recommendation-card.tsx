'use client';

import { Badge, Button, Card, CardBody, CardHeader, Meter } from '@bloomstock/ui';
import { formatPrice } from '@bloomstock/shared';
import type { AiRecommendation } from '@bloomstock/core';
import { apiPost } from '@/lib/api';
import { useState } from 'react';

export function RecommendationCard({ item }: { item: AiRecommendation }) {
  const risk = item.candidate?.risk;
  const [status, setStatus] = useState<'idle' | 'saving' | 'booked' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function book() {
    if (!item.candidate?.risk) return;
    setStatus('saving');
    try {
      await apiPost('/api/trades', {
        symbol: item.candidate.symbol,
        exchange: item.candidate.exchange,
        entry: item.candidate.risk.entry,
        stopLoss: item.candidate.risk.stopLoss,
        target1: item.candidate.risk.target1,
        target2: item.candidate.risk.target2,
        quantity: item.candidate.risk.positionSize,
      });
      setStatus('booked');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Could not book');
    }
  }

  return (
    <Card>
      <CardHeader className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-2xl text-white">{item.candidate?.symbol}</p>
          <p className="text-sm text-zinc-400">{item.candidate?.setupType?.replace('_', ' ')}</p>
        </div>
        <Badge tone="gold">{item.confidence}% confidence</Badge>
      </CardHeader>
      <CardBody className="space-y-4">
        <Meter value={item.confidence} />
        {risk ? (
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {risk.entryStyle === 'buy_dip' && risk.buyZoneLow && risk.buyZoneHigh ? (
              <>
                <Row label="Buy zone" value={`${formatPrice(risk.buyZoneLow)}–${formatPrice(risk.buyZoneHigh)}`} />
                <Row
                  label="Breakout"
                  value={risk.breakoutTrigger ? formatPrice(risk.breakoutTrigger) : '—'}
                />
              </>
            ) : (
              <Row label="Entry" value={formatPrice(risk.entry)} />
            )}
            <Row label="Stop" value={formatPrice(risk.stopLoss)} />
            <Row label="Target 1" value={formatPrice(risk.target1)} />
            <Row label="Target 2" value={formatPrice(risk.target2)} />
            <Row label="Size" value={`${risk.positionSize} sh`} />
            <Row label="Trail" value={formatPrice(risk.trailingStop)} />
          </dl>
        ) : null}
        {item.candidate?.verdict === 'watch' ? (
          <p className="text-sm text-[#e8c56b]">Do not chase the last close. Wait for the dip zone or a stop-buy through the breakout.</p>
        ) : null}
        <p className="text-sm leading-6 text-zinc-300">{item.reasoning}</p>
        {risk ? (
          <Button variant="gold" onClick={book} disabled={status === 'saving' || status === 'booked'}>
            {status === 'booked'
              ? 'Booked'
              : status === 'saving'
                ? 'Booking…'
                : item.candidate?.verdict === 'watch'
                  ? 'Book dip plan'
                  : 'Book trade'}
          </Button>
        ) : null}
        {status === 'error' ? <p className="text-sm text-rose-300">{message}</p> : null}
      </CardBody>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className="font-mono number text-white">{value}</dd>
    </div>
  );
}
