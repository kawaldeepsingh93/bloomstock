import { ExternalLink } from 'lucide-react';
import { Card, CardBody } from '@bloomstock/ui';
import type { NewsItem } from '@bloomstock/core';
import { resolveNewsUrl } from '@/lib/news-url';

export function NewsCard({ item }: { item: NewsItem }) {
  const href = resolveNewsUrl(item.url, item.symbol);
  const published = formatPublished(item.publishedAt);
  const body = (
    <CardBody className="space-y-2">
      <p className="text-xs uppercase tracking-wide text-zinc-500">
        {item.symbol ?? 'Market'} · {item.source}
        {published ? ` · ${published}` : ''}
      </p>
      <p className="font-serif text-xl text-white">{item.headline}</p>
      {item.summary ? <p className="text-sm text-zinc-400">{item.summary}</p> : null}
      {href ? (
        <p className="inline-flex items-center gap-1 text-xs text-[#e8c56b]">
          Open filing <ExternalLink size={12} />
        </p>
      ) : (
        <p className="text-xs text-zinc-600">No filing link on this headline.</p>
      )}
    </CardBody>
  );

  if (!href) {
    return <Card>{body}</Card>;
  }

  return (
    <Card className="transition hover:border-[#d4a017]/40">
      <a href={href} target="_blank" rel="noreferrer" className="block">
        {body}
      </a>
    </Card>
  );
}

function formatPublished(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}
