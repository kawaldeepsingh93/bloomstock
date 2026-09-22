import type { HTMLAttributes } from 'react';
import { cn } from './cn';

export function Badge({
  className,
  tone = 'neutral',
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: 'neutral' | 'up' | 'down' | 'gold' }) {
  const tones = {
    neutral: 'bg-white/8 text-zinc-300',
    up: 'bg-emerald-500/15 text-emerald-300',
    down: 'bg-rose-500/15 text-rose-300',
    gold: 'bg-[#d4a017]/15 text-[#e8c56b]',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
