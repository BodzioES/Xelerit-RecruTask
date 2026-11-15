import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import ProviderPageHeader from "@/components/layout/provider/ProviderPageHeader";
import { buttonClassName } from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import { dashboardKeys, fetchProviderDashboard } from "@/features/provider/dashboard/api";
import AvailableVehicles from "@/features/provider/dashboard/components/AvailableVehicles";
import BookingSummaryList from "@/features/provider/dashboard/components/BookingSummaryList";
import { errorMessage } from "@/lib/errors";

export default function ProviderDashboardPage() {
  const dashboard = useQuery({
    queryKey: dashboardKeys.overview,
    queryFn: fetchProviderDashboard,
  });

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ProviderPageHeader
        title="Dashboard"
        description="What needs attention today across bookings and the fleet."
        actions={
          <Link to="/provider/bookings/new" className={buttonClassName("primary")}>
            New booking
          </Link>
        }
      />

      {dashboard.data && dashboard.data.overdue_bookings.length > 0 ? (
        <div className="space-y-3">
          <Notice tone="warning" title="Overdue bookings">
            These services should have started already. Start them, reschedule them or cancel
            them.
          </Notice>
          <BookingSummaryList
            title="Overdue"
            description="Confirmed bookings whose start time has passed."
            bookings={dashboard.data.overdue_bookings}
            emptyTitle="Nothing overdue"
            emptyDescription="Every confirmed booking is on time."
          />
        </div>
      ) : null}

      {dashboard.isPending ? <LoadingState label="Loading dashboard" rows={4} /> : null}

      {dashboard.isError ? (
        <ErrorState
          message={errorMessage(dashboard.error)}
          onRetry={() => {
            void dashboard.refetch();
          }}
        />
      ) : null}

      {dashboard.data ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <BookingSummaryList
            title="New requests"
            description="Pending bookings waiting for a decision."
            bookings={dashboard.data.new_bookings}
            emptyTitle="No new requests"
            emptyDescription="New guest bookings will appear here."
          />
          <BookingSummaryList
            title="Upcoming"
            description="Confirmed services starting soon."
            bookings={dashboard.data.upcoming_bookings}
            emptyTitle="Nothing scheduled"
            emptyDescription="Confirmed bookings with a future start date will show up here."
          />
          <BookingSummaryList
            title="In progress"
            description="Services that already started."
            bookings={dashboard.data.active_bookings}
            emptyTitle="No active service"
            emptyDescription="Bookings currently in progress will show up here."
          />
          <AvailableVehicles vehicles={dashboard.data.available_vehicles} />
        </div>
      ) : null}
    </div>
  );
}
