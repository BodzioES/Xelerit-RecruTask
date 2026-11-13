import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import StatusBadge from "@/components/ui/StatusBadge";
import { bookingKeys, fetchBooking, recallBookingToken } from "@/features/booking/api";
import BookingDetailsPanel from "@/features/booking/components/BookingDetailsPanel";
import BookingTimeline from "@/features/booking/components/BookingTimeline";
import CancelBookingPanel from "@/features/booking/components/CancelBookingPanel";
import HandoverCard from "@/features/booking/components/HandoverCard";
import { errorMessage, isForbidden, isNotFound } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import type { BookingStatus } from "@/types/api";

const CANCELLABLE: ReadonlySet<BookingStatus> = new Set([
  "pending",
  "confirmed",
  "ready_for_pickup",
]);

function MissingToken() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
      <Notice tone="warning" title="This link is incomplete">
        A booking can only be opened with its private link, which contains an access token. Open
        the link from your confirmation page or check the address bar.
      </Notice>
      <Link
        to="/"
        className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
      >
        Back to home
      </Link>
    </div>
  );
}

export default function BookingStatusPage() {
  const { bookingId } = useParams();
  const [searchParams] = useSearchParams();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const queryToken = searchParams.get("token");
  const token = queryToken ?? (bookingId ? recallBookingToken(bookingId) : null);
  const canLoad = Boolean(bookingId && token);

  const booking = useQuery({
    queryKey: bookingKeys.detail(bookingId ?? "", token ?? ""),
    queryFn: () => fetchBooking(bookingId ?? "", token ?? ""),
    enabled: canLoad,
    retry: false,
  });

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  if (!bookingId || !token) return <MissingToken />;

  if (booking.isPending) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
        <LoadingState label="Loading your booking" rows={3} />
      </div>
    );
  }

  if (booking.isError) {
    const unavailable = isNotFound(booking.error) || isForbidden(booking.error);
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        {unavailable ? (
          <Notice tone="warning" title="Booking not available">
            This link is not valid any more, or the booking does not exist.
          </Notice>
        ) : (
          <ErrorState
            message={errorMessage(booking.error)}
            onRetry={() => {
              void booking.refetch();
            }}
          />
        )}
        <Link
          to="/"
          className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
        >
          Back to home
        </Link>
      </div>
    );
  }

  const data = booking.data;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">Booking</p>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            {data.booking_number}
          </h1>
          <StatusBadge status={data.status} />
        </div>
        <p className="text-xl font-semibold text-ink-900">{formatMoney(data.total_price)}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button variant="secondary" onClick={() => void copyLink()}>
          Copy booking link
        </Button>
        {copyState === "copied" ? (
          <p className="text-sm text-emerald-700">Link copied.</p>
        ) : copyState === "failed" ? (
          <p className="text-sm text-ink-500">Copy the address from the browser bar instead.</p>
        ) : null}
      </div>

      <p className="mt-3 max-w-2xl text-sm text-ink-500">
        Keep this link — it is the only way back to the booking. It works on any device and does
        not require an account.
      </p>

      {data.status === "pending" ? (
        <div className="mt-6">
          <Notice title="Waiting for confirmation">
            We received your booking. The Provider reviews it and confirms before the service
            starts.
          </Notice>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <BookingDetailsPanel booking={data} />
          <BookingTimeline events={data.events} />
        </div>

        <div className="space-y-6">
          {data.service_type === "self_drive" ? (
            <HandoverCard bookingId={data.id} token={token} />
          ) : null}
          {CANCELLABLE.has(data.status) ? (
            <CancelBookingPanel bookingId={data.id} token={token} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
