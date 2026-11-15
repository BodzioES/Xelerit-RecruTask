import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import ProviderPageHeader from "@/components/layout/provider/ProviderPageHeader";
import Button, { buttonClassName } from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { statusLabels } from "@/components/ui/StatusBadge";
import {
  fetchProviderBookings,
  providerBookingKeys,
  type BookingFilters as Filters,
} from "@/features/provider/bookings/api";
import BookingFilters from "@/features/provider/bookings/components/BookingFilters";
import BookingsTable from "@/features/provider/bookings/components/BookingsTable";
import { fetchProviderEmployees, employeeKeys } from "@/features/provider/employees/api";
import { errorMessage } from "@/lib/errors";
import { SERVICES } from "@/lib/services";
import type { BookingStatus, ServiceType } from "@/types/api";

const PAGE_SIZE = 20;

function readStatus(value: string | null): BookingStatus | "" {
  return value && value in statusLabels ? (value as BookingStatus) : "";
}

function readServiceType(value: string | null): ServiceType | "" {
  return SERVICES.some((service) => service.serviceType === value)
    ? (value as ServiceType)
    : "";
}

export default function ProviderBookingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [limit, setLimit] = useState(PAGE_SIZE);

  const status = readStatus(searchParams.get("status"));
  const serviceType = readServiceType(searchParams.get("service_type"));
  const employeeId = searchParams.get("employee") ?? "";
  const hasFilters = Boolean(status || serviceType || employeeId);

  const filters: Filters = { status, serviceType, employeeId, limit };

  const bookings = useQuery({
    queryKey: providerBookingKeys.list(filters),
    queryFn: () => fetchProviderBookings(filters),
    placeholderData: keepPreviousData,
  });

  const employees = useQuery({
    queryKey: employeeKeys.list,
    queryFn: fetchProviderEmployees,
  });

  function applyFilters(patch: {
    status?: BookingStatus | "";
    serviceType?: ServiceType | "";
    employeeId?: string;
  }): void {
    const next = new URLSearchParams(searchParams);
    const nextStatus = patch.status ?? status;
    const nextService = patch.serviceType ?? serviceType;
    const nextEmployee = patch.employeeId ?? employeeId;

    if (nextStatus) next.set("status", nextStatus);
    else next.delete("status");
    if (nextService) next.set("service_type", nextService);
    else next.delete("service_type");
    if (nextEmployee) next.set("employee", nextEmployee);
    else next.delete("employee");

    setLimit(PAGE_SIZE);
    setSearchParams(next, { replace: true });
  }

  const rows = bookings.data ?? [];
  const canLoadMore = rows.length === limit;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ProviderPageHeader
        title="Bookings"
        description="Review requests, keep statuses up to date and assign resources."
        actions={
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to="/provider/employees"
              className="text-sm font-medium text-brand-700 hover:underline"
            >
              Manage team
            </Link>
            <Link to="/provider/bookings/new" className={buttonClassName("primary")}>
              New booking
            </Link>
          </div>
        }
      />

      <BookingFilters
        status={status}
        serviceType={serviceType}
        employeeId={employeeId}
        employees={employees.data ?? []}
        onChange={applyFilters}
      />

      {bookings.isPending ? <LoadingState label="Loading bookings" rows={4} /> : null}

      {bookings.isError ? (
        <ErrorState
          message={errorMessage(bookings.error)}
          onRetry={() => {
            void bookings.refetch();
          }}
        />
      ) : null}

      {bookings.data ? (
        rows.length === 0 ? (
          <EmptyState
            title="No bookings match these filters"
            description="Clear the filters or wait for new guest requests."
            action={
              hasFilters ? (
                <Button
                  variant="secondary"
                  onClick={() => applyFilters({ status: "", serviceType: "", employeeId: "" })}
                >
                  Clear filters
                </Button>
              ) : null
            }
          />
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-ink-500">
              Showing {rows.length} {rows.length === 1 ? "booking" : "bookings"}
              {canLoadMore ? " (more available)" : ""}.
            </p>
            <BookingsTable bookings={rows} />
            {canLoadMore ? (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => setLimit((value) => value + PAGE_SIZE)}>
                  Load more
                </Button>
              </div>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
