import { providerDelete, providerGet, providerPatch, providerPost } from "../apiClient";
import type { ProviderVehicle, VehicleUnavailabilityBlock } from "@/types/api";

export type VehicleInput = {
  brand: string;
  model: string;
  year: number;
  category: string;
  cargo_volume: string;
  payload: number;
  seats: number;
  description: string | null;
  image_url: string | null;
  hourly_price: string;
  daily_price: string;
  is_active: boolean;
};

export type UnavailabilityInput = {
  start_datetime: string;
  end_datetime: string;
  reason: string | null;
};

export const fleetKeys = {
  list: ["provider", "vehicles", "list"] as const,
  unavailability: (vehicleId: string) =>
    ["provider", "vehicles", vehicleId, "unavailability"] as const,
};

export function fetchProviderVehicles(): Promise<ProviderVehicle[]> {
  return providerGet("/provider/vehicles");
}

export function createProviderVehicle(input: VehicleInput): Promise<ProviderVehicle> {
  return providerPost("/provider/vehicles", input);
}

export function updateProviderVehicle(
  vehicleId: string,
  input: VehicleInput,
): Promise<ProviderVehicle> {
  return providerPatch(`/provider/vehicles/${vehicleId}`, input);
}

export function deactivateProviderVehicle(vehicleId: string): Promise<void> {
  return providerDelete(`/provider/vehicles/${vehicleId}`);
}

export function setVehicleActive(
  vehicleId: string,
  isActive: boolean,
): Promise<ProviderVehicle> {
  return providerPatch(`/provider/vehicles/${vehicleId}`, { is_active: isActive });
}

export function fetchVehicleUnavailability(
  vehicleId: string,
): Promise<VehicleUnavailabilityBlock[]> {
  return providerGet(`/provider/vehicles/${vehicleId}/unavailability`);
}

export function createVehicleUnavailability(
  vehicleId: string,
  input: UnavailabilityInput,
): Promise<VehicleUnavailabilityBlock> {
  return providerPost(`/provider/vehicles/${vehicleId}/unavailability`, input);
}

export function deleteVehicleUnavailability(
  vehicleId: string,
  blockId: string,
): Promise<void> {
  return providerDelete(`/provider/vehicles/${vehicleId}/unavailability/${blockId}`);
}
