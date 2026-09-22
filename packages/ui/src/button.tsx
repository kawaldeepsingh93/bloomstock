import type { ButtonHTMLAttributes } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'ghost' | 'danger' | 'gold';

const styles: Record<Variant, string> = {
  primary: 'bg-white/10 text-white hover:bg-white/16 border border-white/10',
  ghost: 'bg-transparent text-zinc-300 hover:bg-white/8 border border-transparent',
  danger: 'bg-rose-500/15 text-rose-200 hover:bg-rose-500/25 border border-rose-500/20',
  gold: 'bg-[#d4a017] text-[#1a1403] hover:bg-[#e0b13a] border border-[#d4a017]',
};

export function Button({
  className,
  variant = 'primary',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center rounded-md px-3.5 py-2 text-sm font-medium transition disabled:opacity-50',
        styles[variant],
        className,
      )}
      {...props}
    />
  );
}
