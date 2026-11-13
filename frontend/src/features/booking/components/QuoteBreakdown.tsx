import { formatMoney, formatQuantity } from "@/lib/money";
import type { Quote } from "@/types/api";

type Props = {
  quote: Quote;
};

export default function QuoteBreakdown({ quote }: Props) {
  return (
    <div className="space-y-4">
      <dl className="divide-y divide-slate-100">
        {quote.lines.map((line) => (
          <div key={line.code} className="flex items-baseline justify-between gap-4 py-2.5">
            <div>
              <dt className="text-sm text-ink-900">{line.description}</dt>
              <p className="text-xs text-ink-500">
                {formatQuantity(line.quantity)} × {formatMoney(line.unit_price)}
              </p>
            </div>
            <dd className="shrink-0 text-sm font-medium text-ink-900">
              {formatMoney(line.amount)}
            </dd>
          </div>
        ))}
      </dl>

      <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
        <p className="text-sm font-semibold text-ink-900">Total</p>
        <p className="text-xl font-semibold text-ink-900">{formatMoney(quote.total)}</p>
      </div>

      <p className="text-xs text-ink-500">
        {quote.billable_hours} billable {quote.billable_hours === 1 ? "hour" : "hours"}
        {Number(quote.distance_km) > 0 ? ` · ${formatQuantity(quote.distance_km)} km route` : ""}
        {" · "}The server calculates and confirms this price when the booking is created.
      </p>
    </div>
  );
}
