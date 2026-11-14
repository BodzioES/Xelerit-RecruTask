import { Link } from "react-router-dom";

import Button, { buttonClassName } from "@/components/ui/Button";
import { SERVICES } from "@/lib/services";

const heroSecondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6";

export default function HomePage() {
  return (
    <>
      <section className="relative isolate flex min-h-[calc(100svh-4rem)] w-full items-center overflow-hidden">
        <img
          src="/main-background-1.webp"
          alt="JanuszTrans truck during a move"
          className="absolute inset-0 -z-20 size-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-r from-slate-950/90 via-slate-950/60 to-slate-950/20 sm:to-transparent"
        />

        <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="max-w-2xl">
            <p className="inline-block rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur-sm sm:text-sm">
              We operate in the Tri-City area and up to 30 km around it
            </p>

            <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Moving services in Gdańsk
              <span className="block text-brand-500">without the stress.</span>
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              We take care of packing, protection, transport and carrying in. We serve apartments,
              houses, offices and routes outside Gdańsk.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="px-5 py-3 sm:px-6">
                Free quote
                <span aria-hidden="true">→</span>
              </Button>
              <button type="button" className={heroSecondaryButton}>
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="size-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z"
                  />
                </svg>
                Call now
              </button>
            </div>

            <p className="mt-8 text-3xl font-bold tracking-tight text-brand-500 sm:text-5xl">
              123 456 789
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-14 sm:px-6 sm:pt-16">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-5xl">
            Van rental and moving services, without the paperwork.
          </h2>
          <p className="mt-5 text-lg leading-relaxed text-ink-500">
            Rent a van, book a driver, or hand the whole move to our crew. One local fleet, clear
            pricing, and no account needed.
          </p>
        </div>

        <div id="services" className="mt-14 scroll-mt-20">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-ink-900 sm:text-3xl">
            Choose your service
          </h2>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {SERVICES.map((service) => (
              <article
                key={service.slug}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200"
              >
                <h3 className="text-lg font-semibold text-ink-900">{service.name}</h3>
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
        </div>

        <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-ink-500">
          We operate in Gdańsk, Gdynia and Sopot, and up to 30 km around them. Every address is
          checked against the service area before you can book.
        </p>
      </section>
    </>
  );
}
