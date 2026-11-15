import { Link } from "react-router-dom";

import { buttonClassName } from "@/components/ui/Button";
import HowItWorksSection from "@/features/landing/components/HowItWorksSection";
import { SERVICES } from "@/lib/services";

const heroCallButton =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-white/40 bg-white/5 px-5 py-3 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6";

const pricingCards = [
  {
    title: "Self Drive — hours or days",
    body: "Under 24 hours you pay the hourly rate. From 24 hours we charge full 24-hour days plus the remaining hours at the hourly rate. Leftover hours never cost more than another day.",
    example: "A 28-hour rental = 1 day + 4 hours. If those 4 hours cost more than a day, we charge 2 days instead.",
  },
  {
    title: "Van + Driver — time and distance",
    body: "A base fee, the service hours and the route kilometres. The distance is the real driving route between loading and unloading, not a straight line.",
    example: null,
  },
  {
    title: "Full Moving — crew and access",
    body: "A base fee, the service hours, the distance and the number of movers you choose. Floor and no-elevator surcharges are added only when the property needs them.",
    example: null,
  },
];

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
              Moving and van rental in the Tri-City
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
              A van you drive yourself, transport with our driver, or a full move with a crew.
              Packing, protection, loading, transport and carrying in — for apartments, houses,
              offices and routes outside the Tri-City area.
            </p>

            <div className="mt-8">
              <a href="tel:+48123456789" className={heroCallButton}>
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
                Unusual job or a question? Give us a call
              </a>
            </div>

            <p className="mt-6 text-sm text-slate-300">
              Or book online — the price is calculated before you confirm.
            </p>
          </div>
        </div>
      </section>

      <HowItWorksSection />

      <section id="services" className="scroll-mt-28 border-y border-slate-200 bg-white md:scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              Three ways to move with us
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-500">
              One local fleet for moving, transport and van rental. You pick the service and the
              dates, the quote appears before you confirm, and we confirm the booking before the
              service starts.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {SERVICES.map((service) => (
              <article
                key={service.slug}
                className="flex h-full flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6"
              >
                <div className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold text-ink-900">{service.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-700">{service.summary}</p>
                  </div>
                  <img
                    src={service.image}
                    alt=""
                    aria-hidden="true"
                    loading="lazy"
                    className="size-32 shrink-0 object-contain lg:size-36"
                  />
                </div>

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

                <p className="mt-auto border-t border-slate-200 pt-4 text-sm leading-relaxed text-ink-500">
                  {service.pricing}
                </p>

                <Link
                  to={`/book/${service.slug}`}
                  className={buttonClassName("secondary", "mt-5 w-full")}
                >
                  Book {service.name}
                </Link>
              </article>
            ))}
          </div>

          <p className="mx-auto mt-10 max-w-3xl text-center text-sm text-ink-500">
            We operate in Gdańsk, Gdynia and Sopot, and up to 30 km around them. Every address is
            checked against the service area before you can book.
          </p>
        </div>
      </section>

      <section id="pricing" className="scroll-mt-28 bg-slate-50 md:scroll-mt-20">
        <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl">
              How the price is calculated
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-500">
              Every quote is calculated on our side before you confirm. It is recalculated when the
              booking is created, so the price you accept is the price you pay.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {pricingCards.map((card) => (
              <article
                key={card.title}
                className="rounded-2xl border border-slate-200 bg-white p-6"
              >
                <h3 className="text-base font-semibold text-ink-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-700">{card.body}</p>
                {card.example ? (
                  <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-ink-500">
                    {card.example}
                  </p>
                ) : null}
              </article>
            ))}
          </div>

          <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-ink-500">
            Prices are in PLN. The quote step lists every line before you place the booking.
          </p>
        </div>
      </section>
    </>
  );
}
