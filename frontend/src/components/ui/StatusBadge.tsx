import type { BookingStatus } from "@/types/api";

const statusStyles: Record<BookingStatus, string> = {
  pending: "border-amber-200 bg-amber-50 text-amber-900",
  confirmed: "border-brand-200 bg-brand-50 text-brand-700",
  ready_for_pickup: "border-indigo-200 bg-indigo-50 text-indigo-800",
  in_progress: "border-sky-200 bg-sky-50 text-sky-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  rejected: "border-rose-200 bg-rose-50 text-rose-800",
  cancelled: "border-slate-200 bg-slate-100 text-slate-700",
};

export const statusLabels: Record<BookingStatus, string> = {
  pending: "Pending review",
  confirmed: "Confirmed",
  ready_for_pickup: "Ready for pickup",
  in_progress: "In progress",
  completed: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

type Props = {
  status: BookingStatus;
};

export default function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      {statusLabels[status]}
    </span>
  );
}
