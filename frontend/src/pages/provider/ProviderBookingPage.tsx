import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";

import ProviderPageHeader from "@/components/layout/provider/ProviderPageHeader";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import StatusBadge from "@/components/ui/StatusBadge";
import BookingDetailsPanel from "@/features/booking/components/BookingDetailsPanel";
import BookingTimeline from "@/features/booking/components/BookingTimeline";
import { fetchProviderBooking, providerBookingKeys } from "@/features/provider/bookings/api";
import AssignResourcesForm from "@/features/provider/bookings/components/AssignResourcesForm";
import BookingStatusActions from "@/features/provider/bookings/components/BookingStatusActions";
import HandoverEditor from "@/features/provider/bookings/components/HandoverEditor";
import { errorMessage, isNotFound } from "@/lib/errors";
import { formatMoney } from "@/lib/money";

export default function ProviderBookingPage() {
  const { bookingId } = useParams();

  const booking = useQuery({
    queryKey: providerBookingKeys.detail(bookingId ?? ""),
    queryFn: () => fetchProviderBooking(bookingId ?? ""),
    enabled: Boolean(bookingId),
    retry: false,
  });

  if (!bookingId) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Notice tone="warning" title="Booking not found">
          The address does not contain a booking identifier.
        </Notice>
      </div>
    );
  }

  const backLink = (
    <Link to="/provider/bookings" className="text-sm font-medium text-brand-700 hover:underline">
      ← All bookings
    </Link>
  );

  if (booking.isPending) {
    return (
      <div className="mx-auto w-full max-w-6xl space-y-4">
        {backLink}
        <LoadingState label="Loading booking" rows={3} />
      </div>
    );
  }

  if (booking.isError) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {backLink}
        {isNotFound(booking.error) ? (
          <Notice tone="warning" title="Booking not found">
            This booking does not exist or is not available to the provider account.
          </Notice>
        ) : (
          <ErrorState
            message={errorMessage(booking.error)}
            onRetry={() => {
              void booking.refetch();
            }}
          />
        )}
      </div>
    );
  }

  const data = booking.data;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {backLink}

      <ProviderPageHeader
        title={data.booking_number}
        description={`${data.customer_first_name} ${data.customer_last_name} · ${formatMoney(data.total_price)}`}
        actions={<StatusBadge status={data.status} />}
      />

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <BookingDetailsPanel booking={data} />
          <BookingTimeline events={data.events} audience="provider" />
        </div>

        <div className="space-y-6">
          <BookingStatusActions booking={data} />
          <AssignResourcesForm booking={data} />
          {data.service_type === "self_drive" ? <HandoverEditor booking={data} /> : null}
        </div>
      </div>
    </div>
  );
}
