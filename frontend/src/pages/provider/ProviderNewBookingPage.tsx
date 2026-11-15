import { useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";

import ProviderPageHeader from "@/components/layout/provider/ProviderPageHeader";
import { buttonClassName } from "@/components/ui/Button";
import BookingWizard from "@/features/booking/components/BookingWizard";
import { createProviderBooking } from "@/features/provider/bookings/api";
import { dashboardKeys } from "@/features/provider/dashboard/api";
import { SERVICES, serviceBySlug } from "@/lib/services";
import type { BookingCreated } from "@/types/api";

function ServicePicker() {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <ProviderPageHeader
        title="New booking"
        description="Enter a booking taken by phone. It is created as confirmed, with the same availability and pricing checks as an online booking."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        {SERVICES.map((service) => (
          <article
            key={service.slug}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5"
          >
            <h2 className="text-base font-semibold text-ink-900">{service.name}</h2>
            <p className="mt-2 mb-4 text-sm text-ink-500">{service.summary}</p>
            <Link
              to={`/provider/bookings/new/${service.slug}`}
              className={buttonClassName("secondary", "mt-auto w-full")}
            >
              Book {service.name}
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}

export default function ProviderNewBookingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { serviceSlug } = useParams();
  const service = serviceBySlug(serviceSlug);

  if (!service) return <ServicePicker />;

  function openBooking(booking: BookingCreated): void {
    void queryClient.invalidateQueries({ queryKey: ["provider", "bookings", "list"] });
    void queryClient.invalidateQueries({ queryKey: dashboardKeys.overview });
    const guestLink = `${window.location.origin}/booking/${booking.id}?token=${encodeURIComponent(booking.access_token)}`;
    navigate(`/provider/bookings/${booking.id}`, { replace: true, state: { guestLink } });
  }

  return (
    <BookingWizard
      service={service}
      title={`New ${service.name} booking`}
      submitBooking={createProviderBooking}
      onCreated={openBooking}
      servicePath={(slug) => `/provider/bookings/new/${slug}`}
      exitPath="/provider/bookings/new"
      exitLabel="Cancel and choose another service"
    />
  );
}
