import { Link } from "react-router-dom";

import { buttonClassName } from "@/components/ui/Button";
import { SERVICES } from "@/lib/services";

export default function HomePage() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
        Tri-City + 30 km
      </p>
      <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-5xl">
        Van rental and moving services, without the paperwork.
      </h1>
      <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
        Rent a van, book a driver, or hand the whole move to our crew. One local fleet, clear
        pricing, and no account needed.
      </p>

      <div id="services" className="mt-10 grid gap-4 sm:grid-cols-3">
        {SERVICES.map((service) => (
          <article
            key={service.slug}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200"
          >
            <h2 className="text-lg font-semibold text-ink-900">{service.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-500">{service.summary}</p>
            <ul className="mt-4 space-y-2 text-sm text-ink-700">
              {service.points.map((point) => (
                <li key={point} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500"
                  />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              to={`/book/${service.slug}`}
              className={buttonClassName("primary", "mt-6 w-full")}
            >
              Start booking
            </Link>
          </article>
        ))}
      </div>

      <p className="mt-8 max-w-3xl text-sm text-ink-500">
        We operate in Gdańsk, Gdynia and Sopot, and up to 30 km around them. Every address is
        checked against the service area before you can book.
      </p>
    </section>
  );
}
