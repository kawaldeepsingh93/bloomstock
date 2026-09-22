import { Badge, Card, CardBody, CardHeader, CardTitle } from '@bloomstock/ui';
import { formatPercent, formatPrice } from '@bloomstock/shared';

export function IndexCard({
  label,
  price,
  change,
}: {
  label: string;
  price: number | null;
  change: number | null;
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
          <Badge className="mt-3">Awaiting live feed</Badge>
        ) : (
          <Badge tone={up ? 'up' : 'down'} className="mt-3">
            {formatPercent(change)}
          </Badge>
        )}
      </CardBody>
    </Card>
  );
}
