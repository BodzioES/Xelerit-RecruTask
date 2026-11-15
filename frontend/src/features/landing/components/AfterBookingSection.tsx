import { Link } from "react-router-dom";

import StatusBadge from "@/components/ui/StatusBadge";
import type { BookingStatus } from "@/types/api";

const afterBooking = [
  {
    status: "pending",
    body: "We review the request and confirm the van and the crew.",
  },
  {
    status: "confirmed",
    body: "Your date is blocked in the fleet calendar and the job is scheduled.",
  },
  {
    status: "ready_for_pickup",
    body: "Self Drive only. The lockbox code and pickup instructions appear on your page.",
  },
  {
    status: "in_progress",
    body: "The van is with you or the crew is already on the job.",
  },
  {
    status: "completed",
    body: "The job is closed and the vehicle is back in the fleet.",
  },
] satisfies readonly { status: BookingStatus; body: string }[];

const pageFeatures = [
  "Price breakdown, addresses and job details",
  "Status timeline with every recorded change",
  "Cancellation while the service has not started",
  "Lockbox code and handover instructions for Self Drive",
];

export default function AfterBookingSection() {
  return (
    <section
      id="after-booking"
      aria-labelledby="after-booking-heading"
      className="border-t border-slate-200 bg-white"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
            After you book
          </p>
          <h2
            id="after-booking-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl"
          >
            One private page for the whole job
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-500">
            The confirmation link is also the status page. Keep it — it is the only way back to your
            booking. The company updates the status, and every change is listed in the timeline.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] lg:gap-12">
          <ol className="space-y-3">
            {afterBooking.map((step) => (
              <li
                key={step.status}
                className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-start sm:gap-4"
              >
                <span className="shrink-0">
                  <StatusBadge status={step.status} />
                </span>
                <p className="text-sm leading-relaxed text-ink-700">{step.body}</p>
              </li>
            ))}
          </ol>

          <aside className="flex flex-col rounded-2xl bg-ink-900 p-6 text-white sm:p-8">
            <h3 className="text-lg font-semibold">On your booking page</h3>
            <ul className="mt-4 space-y-3 text-sm text-slate-200">
              {pageFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="mt-0.5 size-4 shrink-0 text-brand-200"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <div className="mt-6 border-t border-white/15 pt-5">
              <p className="text-sm leading-relaxed text-slate-300">
                The access link is shown once after booking and kept in this browser. We cannot
                recover a lost link, so save it or bookmark the page.
              </p>
              <Link
                to="/provider/login"
                className="mt-4 inline-flex text-sm font-medium text-brand-200 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Running the company? Provider sign-in
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
