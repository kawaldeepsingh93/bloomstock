'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardBody } from '@bloomstock/ui';
import { apiGet } from '@/lib/api';
import { NewsCard } from '@/components/news/news-card';
import type { NewsItem } from '@bloomstock/core';

export default function NewsPage() {
  const news = useQuery({
    queryKey: ['news'],
    queryFn: () => apiGet<NewsItem[]>('/api/news'),
  });
  const rows = news.data ?? [];
  return (
    <div className="space-y-3">
      {news.isError ? (
        <p className="text-sm text-rose-300">{(news.error as Error).message}</p>
      ) : null}
      {rows.length === 0 ? (
        <Card>
          <CardBody className="text-sm text-zinc-400">
            No ingested headlines yet. The worker stores NSE/corporate news raw before the news
            agent scores it.
          </CardBody>
        </Card>
      ) : (
        rows.map((item) => <NewsCard key={item.id} item={item} />)
      )}
    </div>
  );
}
