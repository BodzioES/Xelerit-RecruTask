import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { apiGet } from "@/services/apiClient";

type HealthResponse = {
  status: string;
  database: string;
};

const services = [
  {
    key: "self-drive",
    name: "Self Drive",
    description: "Take the van and drive it yourself. Pick up the keys from a lockbox in the vehicle.",
    points: ["Hourly or daily rental", "Pickup and return locations", "No account required"],
  },
  {
    key: "van-driver",
    name: "Van + Driver",
    description: "Transport for furniture, appliances, boxes or a single large item.",
    points: ["Loading and unloading", "Experienced driver", "Clear distance-based quote"],
  },
  {
    key: "full-moving",
    name: "Full Moving",
    description: "A van, a driver and a crew of movers for apartments, houses and offices.",
    points: ["Choose the number of helpers", "Floors and elevator handled", "One price breakdown"],
  },
] as const;

export default function HomePage() {
  const health = useQuery({
    queryKey: ["health"],
    queryFn: () => apiGet<HealthResponse>("/health/db"),
    refetchInterval: 60_000,
  });

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-sm font-bold text-white">
              M
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink-900">MoveIt</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-ink-500">
            <a className="transition hover:text-ink-900" href="#services">
              Services
            </a>
            <a className="transition hover:text-ink-900" href="#contact">
              Contact
            </a>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-14 pt-16 sm:px-6 sm:pt-20">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-brand-600">
            Trójmiasto + 30 km
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-ink-900 sm:text-5xl">
            Van rental and moving services, without the paperwork.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-500">
            Rent a van, book a driver, or hand the whole move to our crew. One local fleet, clear
            pricing, and no account needed.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-3" id="services">
            {services.map((service) => (
              <article
                key={service.key}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-brand-200"
              >
                <h2 className="text-lg font-semibold text-ink-900">{service.name}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink-500">{service.description}</p>
                <ul className="mt-4 space-y-2 text-sm text-ink-700">
                  {service.points.map((point) => (
                    <li key={point} className="flex items-start gap-2">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-brand-500" />
                      {point}
                    </li>
                  ))}
                </ul>
                <Link
                  to={`/order/${service.key}`}
                  className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-700"
                >
                  Start booking
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer id="contact" className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-8 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="font-medium text-ink-900">MoveIt</p>
            <p className="mt-1">Gdańsk · Gdynia · Sopot and up to 30 km around</p>
            <p className="mt-1">
              <a className="transition hover:text-ink-900" href="mailto:hello@moveit.pl">
                hello@moveit.pl
              </a>
              {" · "}
              <a className="transition hover:text-ink-900" href="tel:+48580000000">
                +48 58 000 00 00
              </a>
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-ink-500">
            <span
              className={`size-2 rounded-full ${health.isSuccess ? "bg-emerald-500" : "bg-slate-300"}`}
            />
            {health.isSuccess ? "API and database online" : "Checking API…"}
          </div>
        </div>
      </footer>
    </div>
  );
}
