import { cn } from './cn';

export function Meter({ value, className }: { value: number; className?: string }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className={cn('h-1.5 w-full overflow-hidden rounded-full bg-white/8', className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#d4a017] to-emerald-400"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
