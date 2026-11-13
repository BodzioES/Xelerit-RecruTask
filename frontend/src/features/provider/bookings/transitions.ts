import type { Booking, BookingStatus } from "@/types/api";

type Action = {
  status: BookingStatus;
  label: string;
  variant: "primary" | "secondary" | "danger";
};

const LABELS: Partial<Record<BookingStatus, string>> = {
  confirmed: "Confirm booking",
  ready_for_pickup: "Mark ready for pickup",
  in_progress: "Start service",
  completed: "Complete service",
  rejected: "Reject booking",
  cancelled: "Cancel booking",
};

const TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["confirmed", "rejected", "cancelled"],
  confirmed: ["ready_for_pickup", "in_progress", "cancelled"],
  ready_for_pickup: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  rejected: [],
  cancelled: [],
};

function variantFor(status: BookingStatus): Action["variant"] {
  if (status === "rejected" || status === "cancelled") return "danger";
  if (status === "confirmed" || status === "completed") return "primary";
  return "secondary";
}

/** Mirrors the server transitions so the panel only offers actions that can succeed. */
export function statusActions(booking: Booking): Action[] {
  return TRANSITIONS[booking.status]
    .filter((status) => {
      if (status === "ready_for_pickup") return booking.service_type === "self_drive";
      // Self-drive bookings must pass through ready_for_pickup before starting.
      if (
        status === "in_progress" &&
        booking.service_type === "self_drive" &&
        booking.status === "confirmed"
      ) {
        return false;
      }
      return true;
    })
    .map((status) => ({
      status,
      label: LABELS[status] ?? status,
      variant: variantFor(status),
    }));
}
