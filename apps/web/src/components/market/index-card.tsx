import { Badge, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { formatPercent, formatPrice } from '@bloomstock/shared';

export function IndexCard({
  label,
  price,
  change,
  asOf,
}: {
  label: string;
  price: number | null;
  change: number | null;
  asOf?: string | Date | null;
}) {
  const up = (change ?? 0) >= 0;
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardBody>
        <p className="font-mono text-3xl number">{price === null ? '—' : formatPrice(price)}</p>
        {change === null ? (
          <Badge className="mt-3">{price === null ? 'No print yet' : 'Last close'}</Badge>
        ) : (
          <Badge tone={up ? 'up' : 'down'} className="mt-3">
            {formatPercent(change)}
          </Badge>
        )}
        {asOf ? (
          <p className="mt-2 text-[11px] uppercase tracking-[0.14em] text-zinc-500">
            As of {new Date(asOf).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
