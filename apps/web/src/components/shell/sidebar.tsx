'use client';

import Link from 'next/link';
import { usePathname, useSelectedLayoutSegment } from 'next/navigation';
import {
  Bell,
  Briefcase,
  CandlestickChart,
  LayoutDashboard,
  Newspaper,
  Radar,
  Settings,
  Sparkles,
  Star,
  Landmark,
  History,
  ScrollText,
} from 'lucide-react';
import { cn } from '@bloomstock/ui';
import { isNavActive, normalizePath } from '@/components/shell/nav-active';

export const NAV_LINKS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/market', label: 'Market', icon: CandlestickChart },
  { href: '/scanner', label: 'Scanner', icon: Radar },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/portfolio', label: 'Portfolio', icon: Briefcase },
  { href: '/recommendations', label: "Today's Trade", icon: Sparkles },
  { href: '/trades', label: 'Trades', icon: ScrollText },
  { href: '/backtest', label: 'Backtest', icon: History },
  { href: '/ipo', label: 'IPO Analyzer', icon: Landmark },
  { href: '/news', label: 'News', icon: Newspaper },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const segment = useSelectedLayoutSegment();
  const currentPath = pathname && pathname !== '/' ? pathname : segment ? `/${segment}` : pathname;
  return (
    <aside className="hidden border-r border-white/8 bg-[#0b0d12] lg:flex lg:flex-col">
      <div className="px-6 py-6">
        <p className="font-serif text-3xl tracking-tight text-white">
          Bloom<span className="text-[#d4a017]">Stock</span>
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-zinc-500">
          NSE research terminal
        </p>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {NAV_LINKS.map((link) => {
          const active = isNavActive(normalizePath(currentPath ?? ''), link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-xl border-l-2 px-3 py-2.5 text-sm transition',
                active
                  ? 'border-[#d4a017] bg-[#d4a017]/10 text-white'
                  : 'border-transparent text-zinc-400 hover:bg-white/5 hover:text-white',
              )}
            >
              <Icon size={16} className={active ? 'text-[#d4a017]' : undefined} />
              {link.label}
            </Link>
          );
        })}
      </nav>
      <div className="px-6 py-5 text-xs text-zinc-500">
        <div className="flex items-center gap-2">
          <Bell size={14} />
          Morning brief at 9:10 IST
        </div>
      </div>
    </aside>
  );
}
