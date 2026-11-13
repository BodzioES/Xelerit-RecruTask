import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import ProviderPageHeader from "@/components/layout/provider/ProviderPageHeader";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import { fetchProviderVehicles, fleetKeys, setVehicleActive } from "@/features/provider/fleet/api";
import VehicleForm from "@/features/provider/fleet/components/VehicleForm";
import VehicleList from "@/features/provider/fleet/components/VehicleList";
import { errorMessage } from "@/lib/errors";
import type { ProviderVehicle } from "@/types/api";

export default function ProviderVehiclesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderVehicle | null>(null);
  const [openBlocksId, setOpenBlocksId] = useState<string | null>(null);

  const vehicles = useQuery({
    queryKey: fleetKeys.list,
    queryFn: fetchProviderVehicles,
  });

  const toggleActive = useMutation({
    mutationFn: (vehicle: ProviderVehicle) => setVehicleActive(vehicle.id, !vehicle.is_active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["provider"] });
    },
  });

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(vehicle: ProviderVehicle): void {
    setEditing(vehicle);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ProviderPageHeader
        title="Fleet"
        description="Vehicles, prices and unavailability blocks."
        actions={<Button onClick={openCreate}>Add vehicle</Button>}
      />

      {formOpen ? (
        <VehicleForm
          key={editing?.id ?? "new"}
          vehicle={editing}
          onSaved={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      ) : null}

      {toggleActive.isError ? (
        <Notice tone="error">{errorMessage(toggleActive.error)}</Notice>
      ) : null}

      {vehicles.isPending ? <LoadingState label="Loading vehicles" rows={3} /> : null}

      {vehicles.isError ? (
        <ErrorState
          message={errorMessage(vehicles.error)}
          onRetry={() => {
            void vehicles.refetch();
          }}
        />
      ) : null}

      {vehicles.data ? (
        <VehicleList
          vehicles={vehicles.data}
          openBlocksId={openBlocksId}
          togglePendingId={toggleActive.isPending ? toggleActive.variables?.id : undefined}
          onEdit={openEdit}
          onToggleActive={(vehicle) => toggleActive.mutate(vehicle)}
          onToggleBlocks={(vehicle) =>
            setOpenBlocksId((current) => (current === vehicle.id ? null : vehicle.id))
          }
        />
      ) : null}
    </div>
  );
}
