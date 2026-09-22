'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { AskBar } from '@/components/shell/ask-bar';
import { NAV_LINKS } from '@/components/shell/sidebar';
import { isNavActive, normalizePath } from '@/components/shell/nav-active';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { cn } from '@bloomstock/ui';
import { deskSessionCopy } from '@bloomstock/shared';

const titles: Record<string, string> = {
  '/dashboard': 'Desk overview',
  '/market': 'Market overview',
  '/scanner': 'Universe scanner',
  '/watchlist': 'Watchlist',
  '/portfolio': 'Portfolio risk',
  '/recommendations': "Today's best trade",
  '/trades': 'Trade blotter',
  '/backtest': 'Swing backtest',
  '/ipo': 'IPO analyzer',
  '/news': 'News & catalysts',
  '/settings': 'Settings',
};

export function Topbar() {
  const pathname = usePathname();
  const currentPath = normalizePath(pathname ?? '');
  const title = titles[currentPath] ?? 'BloomStock';
  const session = deskSessionCopy();
  return (
    <header className="sticky top-9 z-20 flex flex-col gap-4 border-b border-white/8 bg-[#07080b]/80 px-4 py-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="min-w-48">
          <p className="font-serif text-2xl lg:hidden">
            Bloom<span className="text-[#d4a017]">Stock</span>
          </p>
          <p className="text-[11px] uppercase tracking-[0.18em] text-zinc-500">{session.label}</p>
          <h1 className="font-serif text-2xl text-white">{title}</h1>
        </div>
        <div className="flex-1">
          <AskBar />
        </div>
        <ThemeToggle />
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs',
              isNavActive(currentPath, link.href)
                ? 'border-[#d4a017]/40 bg-[#d4a017]/10 text-white'
                : 'border-white/10 text-zinc-400',
            )}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
