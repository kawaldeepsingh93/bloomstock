'use client';

import { useEffect, useRef } from 'react';

export function TradingViewChart({ symbol }: { symbol: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: `NSE:${symbol}`,
      interval: 'D',
      timezone: 'Asia/Kolkata',
      theme: 'dark',
      style: '1',
      locale: 'en',
      hide_top_toolbar: false,
      allow_symbol_change: true,
      studies: [
        'MAExp@tv-basicstudies',
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies',
        'Volume@tv-basicstudies',
        'BB@tv-basicstudies',
      ],
      support_host: 'https://www.tradingview.com',
    });
    ref.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="h-[520px] w-full overflow-hidden rounded-2xl border border-white/8 bg-black">
      <div className="tradingview-widget-container h-full" ref={ref} />
    </div>
  );
}
