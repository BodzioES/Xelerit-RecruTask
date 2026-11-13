import { Link } from "react-router-dom";

import EmptyState from "@/components/ui/EmptyState";
import Panel from "@/components/ui/Panel";
import { formatQuantity } from "@/lib/money";
import type { BookingVehicle } from "@/types/api";

type Props = {
  vehicles: BookingVehicle[];
};

export default function AvailableVehicles({ vehicles }: Props) {
  return (
    <Panel
      title="Available vehicles"
      description="Ready to rent in the next hour."
      actions={
        <Link
          to="/provider/vehicles"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          Manage fleet
        </Link>
      }
    >
      {vehicles.length === 0 ? (
        <EmptyState
          title="No vehicle is free right now"
          description="Check unavailability blocks or reassign an active booking."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {vehicles.map((vehicle) => (
            <li
              key={vehicle.id}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3"
            >
              {vehicle.image_url ? (
                <img
                  src={vehicle.image_url}
                  alt={`${vehicle.brand} ${vehicle.model}`}
                  className="h-16 w-20 shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="grid h-16 w-20 shrink-0 place-items-center rounded-lg bg-slate-100 text-xs text-ink-500">
                  No image
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink-900">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="text-xs text-ink-500">
                  {vehicle.category} · {vehicle.seats} seats
                </p>
                <p className="mt-1 text-xs text-ink-700">
                  {formatQuantity(vehicle.cargo_volume)} m³ · {vehicle.payload} kg payload
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
