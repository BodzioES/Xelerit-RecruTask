import { useQuery } from "@tanstack/react-query";

import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import { bookingKeys, fetchFleetVehicles } from "@/features/booking/api";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/money";
import type { Vehicle } from "@/types/api";

/** Smallest van first, so the list reads as a size ladder. */
function bySize(vehicles: Vehicle[]): Vehicle[] {
  return [...vehicles].sort((a, b) => Number(a.cargo_volume) - Number(b.cargo_volume));
}

function FleetCard({ vehicle }: { vehicle: Vehicle }) {
  const hasDimensions =
    vehicle.cargo_length_cm !== null &&
    vehicle.cargo_width_cm !== null &&
    vehicle.cargo_height_cm !== null;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex h-44 items-center justify-center bg-slate-50">
        {vehicle.image_url ? (
          <img
            src={vehicle.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            loading="lazy"
            className="h-full w-full object-contain p-4"
          />
        ) : (
          <span className="text-sm text-ink-500">No photo</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        <div>
          <h3 className="text-base font-semibold text-ink-900">
            {vehicle.brand} {vehicle.model}
          </h3>
          <p className="text-xs text-ink-500">
            {vehicle.category} · {vehicle.year}
          </p>
        </div>

        {vehicle.description ? (
          <p className="text-sm leading-relaxed text-ink-700">{vehicle.description}</p>
        ) : null}

        <dl className="grid grid-cols-3 gap-2 text-center text-xs text-ink-500">
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt>Space</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink-900">
              {Number(vehicle.cargo_volume)} m³
            </dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt>Payload</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink-900">{vehicle.payload} kg</dd>
          </div>
          <div className="rounded-lg bg-slate-50 px-2 py-1.5">
            <dt>Seats</dt>
            <dd className="mt-0.5 text-sm font-medium text-ink-900">{vehicle.seats}</dd>
          </div>
        </dl>

        {hasDimensions ? (
          <div className="text-xs text-ink-500">
            <p>Cargo area (L × W × H)</p>
            <p className="mt-0.5 font-medium text-ink-700">
              {vehicle.cargo_length_cm} × {vehicle.cargo_width_cm} × {vehicle.cargo_height_cm} cm
            </p>
          </div>
        ) : null}

        <div className="mt-auto border-t border-slate-200 pt-3">
          <p className="text-xs text-ink-500">Self Drive rates</p>
          <p className="mt-0.5 whitespace-nowrap text-sm text-ink-700">
            {formatMoney(vehicle.hourly_price)}/h
            <span aria-hidden="true" className="text-slate-300">
              {" · "}
            </span>
            {formatMoney(vehicle.daily_price)}/day
          </p>
        </div>
      </div>
    </article>
  );
}

export default function FleetSection() {
  const fleet = useQuery({ queryKey: bookingKeys.fleet(), queryFn: fetchFleetVehicles });

  return (
    <section
      id="fleet"
      aria-labelledby="fleet-heading"
      className="scroll-mt-28 bg-slate-50 md:scroll-mt-20"
    >
      <div className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id="fleet-heading"
            className="text-3xl font-semibold tracking-tight text-ink-900 sm:text-4xl"
          >
            Our fleet
          </h2>
          <p className="mt-4 text-base leading-relaxed text-ink-500">
            From a city van to a mega trailer. You choose the vehicle for Self Drive; for Van +
            Driver and Full Moving we assign one that is free on your date.
          </p>
        </div>

        <div className="mt-10">
          {fleet.isPending ? <LoadingState label="Loading the fleet…" /> : null}
          {fleet.isError ? (
            <ErrorState message={errorMessage(fleet.error)} onRetry={() => void fleet.refetch()} />
          ) : null}
          {fleet.data ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {bySize(fleet.data).map((vehicle) => (
                <FleetCard key={vehicle.id} vehicle={vehicle} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
