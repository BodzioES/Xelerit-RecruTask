import { Link } from "react-router-dom";

import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import type { ProviderEmployee } from "@/types/api";

import UnavailabilityPanel from "../../components/UnavailabilityPanel";
import {
  createEmployeeUnavailability,
  deleteEmployeeUnavailability,
  employeeKeys,
  fetchEmployeeUnavailability,
} from "../api";

type Props = {
  employees: ProviderEmployee[];
  openBlocksId: string | null;
  togglePendingId: string | undefined;
  onEdit: (employee: ProviderEmployee) => void;
  onToggleActive: (employee: ProviderEmployee) => void;
  onToggleBlocks: (employee: ProviderEmployee) => void;
};

function EmployeeCard({
  employee,
  blocksOpen,
  togglePending,
  onEdit,
  onToggleActive,
  onToggleBlocks,
}: {
  employee: ProviderEmployee;
  blocksOpen: boolean;
  togglePending: boolean;
  onEdit: () => void;
  onToggleActive: () => void;
  onToggleBlocks: () => void;
}) {
  return (
    <li className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-ink-900">
              {employee.first_name} {employee.last_name}
            </h3>
            <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {employee.role === "driver" ? "Driver" : "Mover"}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                employee.is_active
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-slate-200 bg-slate-100 text-slate-700"
              }`}
            >
              {employee.is_active ? "Active" : "Inactive"}
            </span>
          </div>
          <Link
            to={`/provider/bookings?employee=${employee.id}`}
            className="mt-2 inline-block text-sm font-medium text-brand-700 hover:underline"
          >
            View assigned bookings
          </Link>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button
            variant={employee.is_active ? "danger" : "secondary"}
            disabled={togglePending}
            isLoading={togglePending}
            onClick={onToggleActive}
          >
            {employee.is_active ? "Deactivate" : "Activate"}
          </Button>
          <Button variant="ghost" onClick={onToggleBlocks}>
            {blocksOpen ? "Hide blocks" : "Unavailability"}
          </Button>
        </div>
      </div>

      {blocksOpen ? (
        <div className="mt-4">
          <UnavailabilityPanel
            queryKey={employeeKeys.unavailability(employee.id)}
            fetchBlocks={() => fetchEmployeeUnavailability(employee.id)}
            createBlock={(input) => createEmployeeUnavailability(employee.id, input)}
            deleteBlock={(blockId) => deleteEmployeeUnavailability(employee.id, blockId)}
          />
        </div>
      ) : null}
    </li>
  );
}

export default function EmployeeList({
  employees,
  openBlocksId,
  togglePendingId,
  onEdit,
  onToggleActive,
  onToggleBlocks,
}: Props) {
  if (employees.length === 0) {
    return (
      <EmptyState
        title="No employees yet"
        description="Add a driver or mover to assign them to moving services."
      />
    );
  }

  return (
    <ul className="space-y-4">
      {employees.map((employee) => (
        <EmployeeCard
          key={employee.id}
          employee={employee}
          blocksOpen={openBlocksId === employee.id}
          togglePending={togglePendingId === employee.id}
          onEdit={() => onEdit(employee)}
          onToggleActive={() => onToggleActive(employee)}
          onToggleBlocks={() => onToggleBlocks(employee)}
        />
      ))}
    </ul>
  );
}
