import { providerDelete, providerGet, providerPatch, providerPost } from "../apiClient";
import type { EmployeeRole, EmployeeUnavailabilityBlock, ProviderEmployee } from "@/types/api";

export type EmployeeInput = {
  first_name: string;
  last_name: string;
  role: EmployeeRole;
  is_active: boolean;
};

export type UnavailabilityInput = {
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
};

export const employeeKeys = {
  list: ["provider", "employees", "list"] as const,
  unavailability: (employeeId: string) =>
    ["provider", "employees", employeeId, "unavailability"] as const,
};

export function fetchProviderEmployees(): Promise<ProviderEmployee[]> {
  return providerGet("/provider/employees");
}

export function createProviderEmployee(input: EmployeeInput): Promise<ProviderEmployee> {
  return providerPost("/provider/employees", input);
}

export function updateProviderEmployee(
  employeeId: string,
  input: EmployeeInput,
): Promise<ProviderEmployee> {
  return providerPatch(`/provider/employees/${employeeId}`, input);
}

export function deactivateProviderEmployee(employeeId: string): Promise<void> {
  return providerDelete(`/provider/employees/${employeeId}`);
}

export function setEmployeeActive(
  employeeId: string,
  isActive: boolean,
): Promise<ProviderEmployee> {
  return providerPatch(`/provider/employees/${employeeId}`, { is_active: isActive });
}

export function fetchEmployeeUnavailability(
  employeeId: string,
): Promise<EmployeeUnavailabilityBlock[]> {
  return providerGet(`/provider/employees/${employeeId}/unavailability`);
}

export function createEmployeeUnavailability(
  employeeId: string,
  input: UnavailabilityInput,
): Promise<EmployeeUnavailabilityBlock> {
  return providerPost(`/provider/employees/${employeeId}/unavailability`, input);
}

export function deleteEmployeeUnavailability(
  employeeId: string,
  blockId: string,
): Promise<void> {
  return providerDelete(`/provider/employees/${employeeId}/unavailability/${blockId}`);
}
