import { Link, useNavigate, useParams } from "react-router-dom";

import Notice from "@/components/ui/Notice";
import { createBooking, rememberBookingToken } from "@/features/booking/api";
import BookingWizard from "@/features/booking/components/BookingWizard";
import { serviceBySlug } from "@/lib/services";
import type { BookingCreated } from "@/types/api";

function UnknownService() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 sm:px-6">
      <Notice tone="warning" title="Unknown service">
        This booking link does not match any of our services.
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

export default function BookingWizardPage() {
  const navigate = useNavigate();
  const { serviceSlug } = useParams();
  const service = serviceBySlug(serviceSlug);

  if (!service) return <UnknownService />;

  function openBooking(booking: BookingCreated): void {
    rememberBookingToken(booking.id, booking.access_token);
    navigate(`/booking/${booking.id}?token=${encodeURIComponent(booking.access_token)}`, {
      replace: true,
    });
  }

  return (
    <BookingWizard
      service={service}
      title={`Book your ${service.name.toLowerCase()}`}
      submitBooking={createBooking}
      onCreated={openBooking}
      servicePath={(slug) => `/book/${slug}`}
      exitPath="/"
      exitLabel="Cancel and return home"
    />
  );
}
