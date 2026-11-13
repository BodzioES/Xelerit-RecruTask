import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import ProviderPageHeader from "@/components/layout/provider/ProviderPageHeader";
import Button from "@/components/ui/Button";
import ErrorState from "@/components/ui/ErrorState";
import LoadingState from "@/components/ui/LoadingState";
import Notice from "@/components/ui/Notice";
import {
  employeeKeys,
  fetchProviderEmployees,
  setEmployeeActive,
} from "@/features/provider/employees/api";
import EmployeeForm from "@/features/provider/employees/components/EmployeeForm";
import EmployeeList from "@/features/provider/employees/components/EmployeeList";
import { errorMessage } from "@/lib/errors";
import type { ProviderEmployee } from "@/types/api";

export default function ProviderEmployeesPage() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProviderEmployee | null>(null);
  const [openBlocksId, setOpenBlocksId] = useState<string | null>(null);

  const employees = useQuery({
    queryKey: employeeKeys.list,
    queryFn: fetchProviderEmployees,
  });

  const toggleActive = useMutation({
    mutationFn: (employee: ProviderEmployee) => setEmployeeActive(employee.id, !employee.is_active),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["provider"] });
    },
  });

  function openCreate(): void {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(employee: ProviderEmployee): void {
    setEditing(employee);
    setFormOpen(true);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <ProviderPageHeader
        title="Employees"
        description="Drivers, movers and their availability blocks."
        actions={<Button onClick={openCreate}>Add employee</Button>}
      />

      {formOpen ? (
        <EmployeeForm
          key={editing?.id ?? "new"}
          employee={editing}
          onSaved={() => setFormOpen(false)}
          onCancel={() => setFormOpen(false)}
        />
      ) : null}

      {toggleActive.isError ? (
        <Notice tone="error">{errorMessage(toggleActive.error)}</Notice>
      ) : null}

      {employees.isPending ? <LoadingState label="Loading employees" rows={3} /> : null}

      {employees.isError ? (
        <ErrorState
          message={errorMessage(employees.error)}
          onRetry={() => {
            void employees.refetch();
          }}
        />
      ) : null}

      {employees.data ? (
        <EmployeeList
          employees={employees.data}
          openBlocksId={openBlocksId}
          togglePendingId={toggleActive.isPending ? toggleActive.variables?.id : undefined}
          onEdit={openEdit}
          onToggleActive={(employee) => toggleActive.mutate(employee)}
          onToggleBlocks={(employee) =>
            setOpenBlocksId((current) => (current === employee.id ? null : employee.id))
          }
        />
      ) : null}
    </div>
  );
}
