import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";

import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import { bookingKeys, fetchAvailableEmployees, fetchAvailableVehicles } from "@/features/booking/api";
import { errorMessage } from "@/lib/errors";

import { draftEndIso, draftStartIso, isSelfDrive } from "../draft";
import type { WizardStepProps } from "../steps";
import VehicleCard from "./VehicleCard";
import WizardFooter from "./WizardFooter";

export default function StepVehicle({ draft, onChange, onNext, onBack }: WizardStepProps) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const startIso = draftStartIso(draft);
  const endIso = draftEndIso(draft);
  const selfDrive = isSelfDrive(draft);
  const start = startIso ?? "";
  const end = endIso ?? "";
  const windowReady = Boolean(startIso && endIso);

  const vehicles = useQuery({
    queryKey: bookingKeys.vehicles(start, end),
    queryFn: () => fetchAvailableVehicles(start, end),
    enabled: windowReady,
    retry: false,
  });

  const drivers = useQuery({
    queryKey: bookingKeys.employees(start, end, "driver"),
    queryFn: () => fetchAvailableEmployees(start, end, "driver"),
    enabled: windowReady && !selfDrive,
    retry: false,
  });

  const noVehicles = vehicles.isSuccess && vehicles.data.length === 0;
  const noDriver = !selfDrive && drivers.isSuccess && drivers.data.length === 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (selfDrive && !draft.vehicleId) {
      setSubmitError("Choose a van for your rental.");
      return;
    }
    if (noVehicles) {
      setSubmitError("No van is available for this window. Go back and choose another date.");
      return;
    }
    if (noDriver) {
      setSubmitError("No driver is available for this window. Go back and choose another date.");
      return;
    }
    setSubmitError(null);
    onNext();
  }

  if (!windowReady) {
    return (
      <div className="space-y-4">
        <Notice tone="error">Choose the date and locations before picking a van.</Notice>
        <WizardFooter onBack={onBack} submitLabel="Continue" disabled />
      </div>
    );
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-6">
      <Panel
        title="Choose your van"
        description={
          selfDrive
            ? "These vans are free for your pickup and return window."
            : "Pick a specific van or let us assign the best available one for your job."
        }
      >
        {!selfDrive ? (
          <label
            className={[
              "mb-4 flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition",
              "focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-brand-600",
              draft.vehicleId === null
                ? "border-brand-500 bg-brand-50 ring-1 ring-brand-500"
                : "border-slate-200 bg-white hover:border-brand-200",
            ].join(" ")}
          >
            <input
              type="radio"
              name="vehicle"
              className="mt-1 size-4 accent-brand-600"
              checked={draft.vehicleId === null}
              onChange={() => onChange({ vehicleId: null, vehicleLabel: null })}
            />
            <span>
              <span className="block font-semibold text-ink-900">Any available van</span>
              <span className="mt-0.5 block text-sm text-ink-500">
                We assign the best fit when the booking is created.
              </span>
            </span>
          </label>
        ) : null}

        {vehicles.isPending ? <LoadingState label="Loading available vans" rows={2} /> : null}

        {vehicles.isError ? (
          <ErrorState
            message={errorMessage(vehicles.error)}
            onRetry={() => {
              void vehicles.refetch();
            }}
          />
        ) : null}

        {noVehicles ? (
          <Notice tone="warning" title="No vans available">
            Nothing is free in this window. Go back and change the date or service.
          </Notice>
        ) : null}

        {vehicles.isSuccess && vehicles.data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.data.map((vehicle) => (
              <VehicleCard
                key={vehicle.id}
                vehicle={vehicle}
                selected={draft.vehicleId === vehicle.id}
                onSelect={() =>
                  onChange({
                    vehicleId: vehicle.id,
                    vehicleLabel: `${vehicle.brand} ${vehicle.model}`,
                  })
                }
              />
            ))}
          </div>
        ) : null}
      </Panel>

      {selfDrive ? (
        <Notice>
          You collect the keys from a lockbox in the van. The code appears on your booking page
          once we prepare the vehicle.
        </Notice>
      ) : null}

      {!selfDrive && drivers.isFetching ? (
        <p className="text-xs text-ink-500">Checking driver availability…</p>
      ) : null}

      {!selfDrive && drivers.isError ? (
        <Notice tone="warning">
          We could not check driver availability. You can continue — the server confirms the
          driver when the booking is created.
        </Notice>
      ) : null}

      {noDriver ? (
        <Notice tone="error" title="No driver available">
          All our drivers are booked for this window. Go back and choose another date.
        </Notice>
      ) : null}

      {submitError ? <Notice tone="error">{submitError}</Notice> : null}

      <WizardFooter
        onBack={onBack}
        submitLabel="Continue"
        disabled={noVehicles || noDriver || vehicles.isPending}
      />
    </form>
  );
}
