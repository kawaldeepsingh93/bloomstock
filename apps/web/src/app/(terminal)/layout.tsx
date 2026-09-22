import { Sidebar } from '@/components/shell/sidebar';
import { StockMarquee } from '@/components/shell/stock-marquee';
import { Topbar } from '@/components/shell/topbar';

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30">
        <StockMarquee />
      </div>
      <div className="lg:grid lg:grid-cols-[260px_1fr]">
        <Sidebar />
        <div className="flex min-h-[calc(100vh-2.25rem)] flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
