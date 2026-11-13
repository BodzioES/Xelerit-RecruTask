import { Link } from "react-router-dom";

import EmptyState from "@/components/ui/EmptyState";
import Panel from "@/components/ui/Panel";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { serviceByType } from "@/lib/services";
import type { BookingSummary } from "@/types/api";

type Props = {
  title: string;
  description: string;
  bookings: BookingSummary[];
  emptyTitle: string;
  emptyDescription: string;
};

function BookingSummaryRow({ booking }: { booking: BookingSummary }) {
  return (
    <li>
      <Link
        to={`/provider/bookings/${booking.id}`}
        className="block rounded-xl border border-slate-200 bg-white p-3 transition hover:border-brand-200 hover:bg-brand-50/30 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-semibold text-ink-900">{booking.booking_number}</span>
          <StatusBadge status={booking.status} />
        </div>
        <p className="mt-1 text-sm text-ink-700">
          {booking.customer_first_name} {booking.customer_last_name} ·{" "}
          {serviceByType(booking.service_type).name}
        </p>
        <p className="mt-1 text-xs text-ink-500">
          {formatDateTime(booking.start_datetime)} → {formatDateTime(booking.end_datetime)}
        </p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-sm">
          <span className="text-ink-500">
            {booking.vehicle
              ? `${booking.vehicle.brand} ${booking.vehicle.model}`
              : "No vehicle assigned"}
          </span>
          <span className="font-semibold text-ink-900">{formatMoney(booking.total_price)}</span>
        </div>
      </Link>
    </li>
  );
}

export default function BookingSummaryList({
  title,
  description,
  bookings,
  emptyTitle,
  emptyDescription,
}: Props) {
  return (
    <Panel title={title} description={description}>
      {bookings.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} />
      ) : (
        <ul className="space-y-3">
          {bookings.map((booking) => (
            <BookingSummaryRow key={booking.id} booking={booking} />
          ))}
        </ul>
      )}
    </Panel>
  );
}
