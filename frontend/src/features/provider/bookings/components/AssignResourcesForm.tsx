import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import SelectInput from "@/components/ui/SelectInput";
import { errorMessage } from "@/lib/errors";
import type {
  AvailableEmployee,
  Booking,
  BookingAssignment,
  EmployeeRole,
} from "@/types/api";

import {
  assignBookingResources,
  fetchAvailableEmployees,
  fetchAvailableVehicles,
  providerBookingKeys,
  type AssignResourcesPayload,
} from "../api";

type Option = {
  id: string;
  label: string;
};

const TERMINAL: ReadonlySet<Booking["status"]> = new Set(["completed", "rejected", "cancelled"]);

function employeeOptions(
  available: AvailableEmployee[] | undefined,
  current: BookingAssignment[],
  role: EmployeeRole,
): Option[] {
  const options = (available ?? []).map((employee) => ({
    id: employee.id,
    label: `${employee.first_name} ${employee.last_name}`,
  }));
  for (const assignment of current) {
    if (assignment.employee.role !== role) continue;
    if (options.some((option) => option.id === assignment.employee_id)) continue;
    options.push({
      id: assignment.employee_id,
      label: `${assignment.employee.first_name} ${assignment.employee.last_name} (current)`,
    });
  }
  return options;
}

type Props = {
  booking: Booking;
};

export default function AssignResourcesForm({ booking }: Props) {
  const queryClient = useQueryClient();
  const current = booking.assignments.filter((assignment) => !assignment.is_released);
  const currentDriver = current.find((assignment) => assignment.employee.role === "driver");

  const [vehicleId, setVehicleId] = useState(booking.vehicle?.id ?? "");
  const [driverId, setDriverId] = useState(currentDriver?.employee_id ?? "");
  const [moverIds, setMoverIds] = useState<string[]>(
    current
      .filter((assignment) => assignment.employee.role === "mover")
      .map((assignment) => assignment.employee_id),
  );

  const requiresStaff = booking.service_type !== "self_drive";
  const isMoving = booking.service_type === "full_moving";
  const requiredMovers = booking.helpers_requested;
  const moversComplete = !isMoving || moverIds.length === requiredMovers;
  const start = booking.start_datetime;
  const end = booking.end_datetime;

  const vehicles = useQuery({
    queryKey: providerBookingKeys.availableVehicles(start, end),
    queryFn: () => fetchAvailableVehicles(start, end),
    retry: false,
    enabled: !TERMINAL.has(booking.status),
  });
  const drivers = useQuery({
    queryKey: providerBookingKeys.availableEmployees(start, end, "driver"),
    queryFn: () => fetchAvailableEmployees(start, end, "driver"),
    retry: false,
    enabled: requiresStaff && !TERMINAL.has(booking.status),
  });
  const movers = useQuery({
    queryKey: providerBookingKeys.availableEmployees(start, end, "mover"),
    queryFn: () => fetchAvailableEmployees(start, end, "mover"),
    retry: false,
    enabled: isMoving && !TERMINAL.has(booking.status),
  });

  const vehicleOptions: Option[] = (vehicles.data ?? []).map((vehicle) => ({
    id: vehicle.id,
    label: `${vehicle.brand} ${vehicle.model}`,
  }));
  if (booking.vehicle && !vehicleOptions.some((option) => option.id === booking.vehicle?.id)) {
    vehicleOptions.unshift({
      id: booking.vehicle.id,
      label: `${booking.vehicle.brand} ${booking.vehicle.model} (current)`,
    });
  }

  const driverOptions = employeeOptions(drivers.data, current, "driver");
  const moverOptions = employeeOptions(movers.data, current, "mover");

  const mutation = useMutation({
    mutationFn: (payload: AssignResourcesPayload) => assignBookingResources(booking.id, payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(providerBookingKeys.detail(booking.id), updated);
      void queryClient.invalidateQueries({ queryKey: ["provider"] });
    },
  });

  function save(): void {
    const employeeIds = isMoving ? [driverId, ...moverIds].filter(Boolean) : [driverId];
    const payload: AssignResourcesPayload = requiresStaff
      ? { vehicle_id: vehicleId, employee_ids: employeeIds }
      : { vehicle_id: vehicleId };
    mutation.mutate(payload);
  }

  function toggleMover(employeeId: string): void {
    setMoverIds((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId],
    );
  }

  if (TERMINAL.has(booking.status)) {
    return (
      <Panel title="Resources">
        <Notice>Resources cannot be changed for a closed booking.</Notice>
      </Panel>
    );
  }

  const canSave = Boolean(vehicleId) && (!requiresStaff || Boolean(driverId)) && moversComplete;
  const staffHint =
    booking.service_type === "self_drive"
      ? "Self Drive uses a vehicle only."
      : isMoving
        ? `Full Moving needs exactly one driver and ${requiredMovers} ${requiredMovers === 1 ? "mover" : "movers"} requested by the customer.`
        : "Van + Driver needs exactly one driver and no movers.";

  return (
    <Panel
      title="Resources"
      description="Availability is checked by the server for the booking window."
    >
      <div className="space-y-4">
        <SelectInput
          label="Vehicle"
          value={vehicleId}
          onChange={(event) => setVehicleId(event.target.value)}
        >
          <option value="">Select a vehicle</option>
          {vehicleOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </SelectInput>

        {requiresStaff ? (
          <>
            <SelectInput
              label="Driver"
              value={driverId}
              onChange={(event) => setDriverId(event.target.value)}
            >
              <option value="">Select a driver</option>
              {driverOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </SelectInput>

            {isMoving ? (
              <fieldset>
                <legend className="text-sm font-medium text-ink-700">
                  Movers ({moverIds.length}/{requiredMovers} selected)
                </legend>
                {moverOptions.length === 0 ? (
                  <p className="mt-1 text-sm text-ink-500">
                    No movers are free for this window, or none are active.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {moverOptions.map((option) => (
                      <label
                        key={option.id}
                        className="flex items-center gap-2 text-sm text-ink-700"
                      >
                        <input
                          type="checkbox"
                          className="size-4 rounded border-slate-300 text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
                          checked={moverIds.includes(option.id)}
                          onChange={() => toggleMover(option.id)}
                        />
                        {option.label}
                      </label>
                    ))}
                  </div>
                )}
                {!moversComplete ? (
                  <p className="mt-2 text-sm text-amber-700">
                    Select exactly {requiredMovers} {requiredMovers === 1 ? "mover" : "movers"} to
                    match the customer's request.
                  </p>
                ) : null}
              </fieldset>
            ) : null}
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={save} disabled={!canSave} isLoading={mutation.isPending}>
            Save assignment
          </Button>
          <span className="text-xs text-ink-500">{staffHint}</span>
        </div>

        {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}
      </div>
    </Panel>
  );
}
