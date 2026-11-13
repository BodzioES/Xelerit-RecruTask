import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { formatMoney, formatQuantity } from "@/lib/money";
import type { ProviderVehicle } from "@/types/api";

import UnavailabilityPanel from "../../components/UnavailabilityPanel";
import {
  createVehicleUnavailability,
  deleteVehicleUnavailability,
  fetchVehicleUnavailability,
  fleetKeys,
} from "../api";

type Props = {
  vehicles: ProviderVehicle[];
  openBlocksId: string | null;
  togglePendingId: string | undefined;
  onEdit: (vehicle: ProviderVehicle) => void;
  onToggleActive: (vehicle: ProviderVehicle) => void;
  onToggleBlocks: (vehicle: ProviderVehicle) => void;
};

function VehicleCard({
  vehicle,
  blocksOpen,
  togglePending,
  onEdit,
  onToggleActive,
  onToggleBlocks,
}: {
  vehicle: ProviderVehicle;
  blocksOpen: boolean;
  togglePending: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleBlocks: () => void;
}) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[180px_1fr_auto]">
        {vehicle.image_url ? (
          <img
            src={vehicle.image_url}
            alt={`${vehicle.brand} ${vehicle.model}`}
            className="h-28 w-full rounded-xl object-cover lg:h-full"
          />
        ) : (
          <div className="grid h-28 w-full place-items-center rounded-xl bg-slate-100 text-xs text-ink-500 lg:h-full">
            No image
          </div>
        )}

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink-900">
              {vehicle.brand} {vehicle.model}
            </h3>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                vehicle.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {vehicle.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-500">
            {vehicle.year} · {vehicle.category}
          </p>
          <p className="mt-2 text-sm text-ink-700">
            {formatQuantity(vehicle.cargo_volume)} m³ · {vehicle.payload} kg · {vehicle.seats} seats
          </p>
          <p className="mt-1 text-sm text-ink-700">
            {formatMoney(vehicle.hourly_price)} / h · {formatMoney(vehicle.daily_price)} / day
          </p>
          {vehicle.description ? (
            <p className="mt-2 text-sm text-ink-500">{vehicle.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-start gap-2 lg:flex-col">
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant={vehicle.is_active ? "danger" : "secondary"}
            disabled={togglePending}
            isLoading={togglePending}
            onClick={onToggleActive}
          >
            {vehicle.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="ghost" onClick={onToggleBlocks}>
            {blocksOpen ? "Hide blocks" : "Unavailability"}
          </Button>
        </div>
      </div>

      {blocksOpen ? (
        <div className="mt-4">
          <UnavailabilityPanel
            queryKey={fleetKeys.unavailability(vehicle.id)}
            fetchBlocks={() => fetchVehicleUnavailability(vehicle.id)}
            createBlock={(input) => createVehicleUnavailability(vehicle.id, input)}
            deleteBlock={(blockId) => deleteVehicleUnavailability(vehicle.id, blockId)}
          />
        </div>
      ) : null}
    </li>
  );
}

export default function VehicleList({
  vehicles,
  openBlocksId,
  togglePendingId,
  onEdit,
  onToggleActive,
  onToggleBlocks,
}: Props) {
  if (vehicles.length === 0) {
    return (
      <EmptyState
        title="No vehicles yet"
        description="Add the first van to start accepting bookings."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {vehicles.map((vehicle) => (
        <VehicleCard
          key={vehicle.id}
          vehicle={vehicle}
          blocksOpen={openBlocksId === vehicle.id}
          togglePending={togglePendingId === vehicle.id}
          onEdit={() => onEdit(vehicle)}
          onToggleActive={() => onToggleActive(vehicle)}
          onToggleBlocks={() => onToggleBlocks(vehicle)}
        />
      ))}
    </ul>
  );
}
