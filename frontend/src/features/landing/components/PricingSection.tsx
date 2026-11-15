import { useQuery } from "@tanstack/react-query";

import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import type { PricingRule, ServiceType } from "@/types/api";

import { fetchPublishedRates, landingKeys } from "../api";

type PricingCard = {
  title: string;
  lines: string[];
  example: string;
};

function selfDriveCard(rule: PricingRule): PricingCard {
  return {
    title: "Self Drive — hours or days",
    lines: [
      "Under 24 hours you pay the hourly rate of the van you choose (see the fleet above).",
      "From 24 hours you pay full days at the van's daily rate, plus the leftover hours at its hourly rate.",
      "If the leftover hours would cost a full day or more, you pay for one more day instead.",
      `Minimum rental: ${rule.min_duration_hours} h. No charge per kilometre.`,
    ],
    example: "28 hours = 1 day + 4 hours, or 2 days if those 4 hours cost as much as a day.",
  };
}

function vanDriverCard(rule: PricingRule): PricingCard {
  return {
    title: "Van + Driver — time and distance",
    lines: [
      `Base fee: ${formatMoney(rule.base_price)} per job.`,
      `Van with our driver: ${formatMoney(rule.hourly_rate)} per hour, at least ${rule.min_duration_hours} h.`,
      `Distance: 1 km = ${formatMoney(rule.price_per_km)}, measured along the driving route from loading to unloading.`,
    ],
    example: "Base fee + 4 h + 18 km of route.",
  };
}

function fullMovingCard(rule: PricingRule): PricingCard {
  return {
    title: "Full Moving — crew and access",
    lines: [
      `Base fee: ${formatMoney(rule.base_price)} per job.`,
      `Van, driver and crew: ${formatMoney(rule.hourly_rate)} per hour, at least ${rule.min_duration_hours} h.`,
      `Distance: 1 km = ${formatMoney(rule.price_per_km)} along the driving route.`,
      `Each mover: ${formatMoney(rule.helper_rate)} per job.`,
      `Floors: ${formatMoney(rule.floor_surcharge)} per floor, so the 3rd floor counts three times.`,
      `No elevator above the ground floor: ${formatMoney(rule.no_elevator_surcharge)} once.`,
    ],
    example: "Base fee + 6 h + 12 km + 2 movers + 3rd floor without an elevator.",
  };
}

const CARD_BUILDERS: Record<ServiceType, (rule: PricingRule) => PricingCard> = {
  self_drive: selfDriveCard,
  van_driver: vanDriverCard,
  full_moving: fullMovingCard,
};

const CARD_ORDER: readonly ServiceType[] = ["self_drive", "van_driver", "full_moving"];

function buildCards(rules: PricingRule[]): PricingCard[] {
  return CARD_ORDER.flatMap((serviceType) => {
    const rule = rules.find((item) => item.service_type === serviceType);
    return rule ? [CARD_BUILDERS[serviceType](rule)] : [];
  });
}

function PricingCardView({ card }: { card: PricingCard }) {
  return (
    <article className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50 p-6">
      <h3 className="text-base font-semibold text-ink-900">{card.title}</h3>
      <ul className="mt-3 mb-4 space-y-2 text-sm leading-relaxed text-ink-700">
        {card.lines.map((line) => (
          <li key={line} className="flex items-start gap-2">
            <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-500" />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-auto rounded-lg bg-white px-3 py-2 text-sm text-ink-500">
        Example: {card.example}
      </p>
    </article>
  );
}

export default function PricingSection() {
  const rates = useQuery({ queryKey: landingKeys.rates, queryFn: fetchPublishedRates });

  return (
    <section
      id="pricing"
      aria-labelledby="pricing-heading"
      className="scroll-mt-28 border-t border-slate-200 bg-white md:scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="pricing-heading"
            className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl"
          >
            How the price is calculated
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-500">
            Time is counted in started hours. The quote lists every line before you confirm,
            and the price saved with your booking does not change afterwards.
          </p>
        </div>

        <div className="mt-8">
          {rates.isPending ? <LoadingState label="Loading the current rates…" /> : null}
          {rates.isError ? (
            <ErrorState message={errorMessage(rates.error)} onRetry={() => void rates.refetch()} />
          ) : null}
          {rates.data ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {buildCards(rates.data).map((card) => (
                <PricingCardView key={card.title} card={card} />
              ))}
            </div>
          ) : null}
        </div>

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm text-ink-500">
          All prices are in PLN and show our current rates. The quote in the booking form always
          uses the same rates.
        </p>
      </div>
    </section>
  );
}
