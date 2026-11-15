import { formatMoney } from "@/lib/money";
import type { AvailableVehicle } from "@/types/api";

type Props = {
  vehicle: AvailableVehicle;
  selected: boolean;
  available: boolean;
  onSelect: () => void;
  /** When set, clicking the already selected van clears the choice. */
  onClear?: () => void;
};

export default function VehicleCard({ vehicle, selected, available, onSelect, onClear }: Props) {
  return (
    <label
      className={[
        "flex flex-col overflow-hidden rounded-2xl border bg-white transition",
        available ? "cursor-pointer" : "cursor-not-allowed",
        "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600",
        selected
          ? "border-brand-500 ring-1 ring-brand-500"
          : "border-slate-200",
        available && !selected ? "hover:border-brand-200" : "",
        available ? "" : "opacity-70",
      ].join(" ")}
    >
      <input
        type="radio"
        name="vehicle"
        className="sr-only"
        checked={selected}
        disabled={!available}
        onChange={onSelect}
        // A checked radio fires no change event, so a second click is handled here.
        onClick={selected ? onClear : undefined}
      />
      <div className="flex h-36 items-center justify-center bg-slate-50">
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
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold text-ink-900">
              {vehicle.brand} {vehicle.model}
            </p>
            <p className="text-xs text-ink-500">
              {vehicle.category} · {vehicle.year}
            </p>
          </div>
          <span
            className={[
              "whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
              available
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-slate-200 bg-slate-100 text-slate-600",
            ].join(" ")}
          >
            {available ? "Available" : "Booked"}
          </span>
        </div>

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

        {vehicle.cargo_length_cm && vehicle.cargo_width_cm && vehicle.cargo_height_cm ? (
          <p className="text-xs text-ink-500">
            Cargo area {vehicle.cargo_length_cm} × {vehicle.cargo_width_cm} ×{" "}
            {vehicle.cargo_height_cm} cm (L × W × H)
          </p>
        ) : null}

        <p className="mt-auto text-sm text-ink-700">
          {formatMoney(vehicle.hourly_price)}/h
          <span aria-hidden="true" className="text-slate-300">
            {" · "}
          </span>
          {formatMoney(vehicle.daily_price)}/day
        </p>
      </div>
    </label>
  );
}
