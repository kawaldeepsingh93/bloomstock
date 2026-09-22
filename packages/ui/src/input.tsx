import type { InputHTMLAttributes } from 'react';
import { cn } from './cn';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-10 w-full rounded-lg border border-[color:var(--border)] bg-black/20 px-3 text-sm text-[color:var(--text)] outline-none placeholder:text-zinc-500 focus:border-[#d4a017]/70',
        className,
      )}
      {...props}
    />
  );
}
