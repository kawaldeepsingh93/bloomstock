import { StockTerminal } from '@/components/stocks/stock-terminal';

export default async function StockPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params;
  return <StockTerminal symbol={symbol.toUpperCase()} />;
}
