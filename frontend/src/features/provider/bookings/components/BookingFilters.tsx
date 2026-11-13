import Button from "@/components/ui/Button";
import SelectInput from "@/components/ui/SelectInput";
import { statusLabels } from "@/components/ui/StatusBadge";
import { SERVICES } from "@/lib/services";
import type { BookingStatus, ProviderEmployee, ServiceType } from "@/types/api";

type Props = {
  status: BookingStatus | "";
  serviceType: ServiceType | "";
  employeeId: string;
  employees: ProviderEmployee[];
  onChange: (patch: {
    status?: BookingStatus | "";
    serviceType?: ServiceType | "";
    employeeId?: string;
  }) => void;
};

export default function BookingFilters({
  status,
  serviceType,
  employeeId,
  employees,
  onChange,
}: Props) {
  const hasFilters = Boolean(status || serviceType || employeeId);

  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
      <SelectInput
        label="Status"
        value={status}
        onChange={(event) => onChange({ status: event.target.value as BookingStatus | "" })}
      >
        <option value="">All statuses</option>
        {Object.entries(statusLabels).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </SelectInput>

      <SelectInput
        label="Service"
        value={serviceType}
        onChange={(event) => onChange({ serviceType: event.target.value as ServiceType | "" })}
      >
        <option value="">All services</option>
        {SERVICES.map((service) => (
          <option key={service.serviceType} value={service.serviceType}>
            {service.name}
          </option>
        ))}
      </SelectInput>

      <SelectInput
        label="Assigned employee"
        value={employeeId}
        onChange={(event) => onChange({ employeeId: event.target.value })}
      >
        <option value="">All employees</option>
        {employees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.first_name} {employee.last_name} (
            {employee.role === "driver" ? "Driver" : "Mover"})
          </option>
        ))}
      </SelectInput>

      <Button
        variant="secondary"
        disabled={!hasFilters}
        onClick={() => onChange({ status: "", serviceType: "", employeeId: "" })}
      >
        Clear filters
      </Button>
    </div>
  );
}
