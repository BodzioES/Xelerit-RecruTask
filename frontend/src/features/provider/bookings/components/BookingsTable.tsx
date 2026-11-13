import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import StatusBadge from "@/components/ui/StatusBadge";
import { formatDateTime } from "@/lib/datetime";
import { formatMoney } from "@/lib/money";
import { serviceByType } from "@/lib/services";
import type { Booking, BookingSummary } from "@/types/api";

type Props = {
  bookings: Booking[];
};

type Row = Omit<BookingSummary, "vehicle"> & { vehicleName: string };

function toRow(booking: Booking): Row {
  return {
    id: booking.id,
    booking_number: booking.booking_number,
    service_type: booking.service_type,
    status: booking.status,
    customer_first_name: booking.customer_first_name,
    customer_last_name: booking.customer_last_name,
    start_datetime: booking.start_datetime,
    end_datetime: booking.end_datetime,
    total_price: booking.total_price,
    vehicleName: booking.vehicle
      ? `${booking.vehicle.brand} ${booking.vehicle.model}`
      : "Unassigned",
  };
}

function RowLink({ row, children }: { row: Row; children: ReactNode }) {
  return (
    <Link
      to={`/provider/bookings/${row.id}`}
      className="rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
    >
      {children}
    </Link>
  );
}

export default function BookingsTable({ bookings }: Props) {
  const rows = bookings.map(toRow);

  return (
    <>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 bg-white md:block">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-ink-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Booking</th>
              <th className="px-4 py-3 font-semibold">Customer</th>
              <th className="px-4 py-3 font-semibold">Service</th>
              <th className="px-4 py-3 font-semibold">Start</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id} className="transition hover:bg-brand-50/40">
                <td className="px-4 py-3">
                  <RowLink row={row}>
                    <span className="font-semibold text-brand-700">{row.booking_number}</span>
                    <span className="mt-0.5 block text-xs text-ink-500">{row.vehicleName}</span>
                  </RowLink>
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {row.customer_first_name} {row.customer_last_name}
                </td>
                <td className="px-4 py-3 text-ink-700">
                  {serviceByType(row.service_type).name}
                </td>
                <td className="px-4 py-3 text-ink-700">{formatDateTime(row.start_datetime)}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
                <td className="px-4 py-3 text-right font-medium text-ink-900">
                  {formatMoney(row.total_price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              to={`/provider/bookings/${row.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 transition hover:border-brand-200"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-brand-700">{row.booking_number}</span>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-2 text-sm text-ink-700">
                {row.customer_first_name} {row.customer_last_name} ·{" "}
                {serviceByType(row.service_type).name}
              </p>
              <p className="mt-1 text-xs text-ink-500">{formatDateTime(row.start_datetime)}</p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-ink-500">{row.vehicleName}</span>
                <span className="font-semibold text-ink-900">{formatMoney(row.total_price)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
