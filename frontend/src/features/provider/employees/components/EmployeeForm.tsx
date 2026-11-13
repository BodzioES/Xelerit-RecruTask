import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Panel from "@/components/ui/Panel";
import SelectInput from "@/components/ui/SelectInput";
import TextInput from "@/components/ui/TextInput";
import { errorMessage } from "@/lib/errors";
import { ApiError } from "@/services/apiClient";
import type { ProviderEmployee } from "@/types/api";

import { createProviderEmployee, updateProviderEmployee, type EmployeeInput } from "../api";

const employeeSchema = z.object({
  first_name: z.string().trim().min(1, "Enter the first name.").max(100, "Use at most 100 characters."),
  last_name: z.string().trim().min(1, "Enter the last name.").max(100, "Use at most 100 characters."),
  role: z.enum(["driver", "mover"]),
  is_active: z.boolean(),
});

type EmployeeValues = z.infer<typeof employeeSchema>;

function initialValues(employee: ProviderEmployee | null): EmployeeValues {
  if (!employee) {
    return { first_name: "", last_name: "", role: "driver", is_active: true };
  }
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    role: employee.role,
    is_active: employee.is_active,
  };
}

type Props = {
  employee: ProviderEmployee | null;
  onSaved: () => void;
  onCancel: () => void;
};

export default function EmployeeForm({ employee, onSaved, onCancel }: Props) {
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<EmployeeValues>({
    resolver: zodResolver(employeeSchema),
    defaultValues: initialValues(employee),
  });

  const mutation = useMutation({
    mutationFn: (values: EmployeeValues) => {
      const input: EmployeeInput = {
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        role: values.role,
        is_active: values.is_active,
      };
      return employee
        ? updateProviderEmployee(employee.id, input)
        : createProviderEmployee(input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["provider"] });
      reset(initialValues(employee));
      onSaved();
    },
    onError: (error) => {
      if (!(error instanceof ApiError)) return;
      for (const [field, message] of Object.entries(error.fieldErrors)) {
        if (field in employeeSchema.shape) {
          setError(field as keyof EmployeeValues, { message });
        }
      }
    },
  });

  return (
    <Panel
      title={employee ? "Edit employee" : "New employee"}
      description="Drivers and movers can be assigned to bookings. Inactive records stay in history."
      actions={
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      }
    >
      <form
        noValidate
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
        className="space-y-4"
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextInput
            label="First name"
            required
            error={errors.first_name?.message}
            {...register("first_name")}
          />
          <TextInput
            label="Last name"
            required
            error={errors.last_name?.message}
            {...register("last_name")}
          />
          <SelectInput label="Role" required error={errors.role?.message} {...register("role")}>
            <option value="driver">Driver</option>
            <option value="mover">Mover</option>
          </SelectInput>
        </div>

        <label className="flex items-center gap-2 text-sm text-ink-700">
          <input
            type="checkbox"
            className="size-4 rounded border-slate-300 text-brand-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600"
            {...register("is_active")}
          />
          Active and assignable to new bookings
        </label>

        {mutation.isError ? <Notice tone="error">{errorMessage(mutation.error)}</Notice> : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" isLoading={mutation.isPending}>
            {employee ? "Save changes" : "Create employee"}
          </Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Panel>
  );
}
