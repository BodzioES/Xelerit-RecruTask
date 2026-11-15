import { buildQuery } from "@/services/apiClient";
import { isNotFound } from "@/lib/errors";
import type {
  AvailableEmployee,
  AvailableVehicle,
  Booking,
  BookingStatus,
  EmployeeRole,
  HandoverDetails,
  ServiceType,
} from "@/types/api";

import { providerGet, providerPatch, providerPost } from "../apiClient";

export type BookingFilters = {
  status: BookingStatus | "";
  serviceType: ServiceType | "";
  employeeId: string;
  limit: number;
};

export type AssignResourcesPayload = {
  vehicle_id: string;
  employee_ids?: string[];
};

type HandoverPayload = {
  generate_code: boolean;
  pickup_instructions: string | null;
  return_instructions: string | null;
};

export const providerBookingKeys = {
  list: (filters: BookingFilters) => ["provider", "bookings", "list", filters] as const,
  detail: (bookingId: string) => ["provider", "bookings", "detail", bookingId] as const,
  handover: (bookingId: string) => ["provider", "bookings", bookingId, "handover"] as const,
  availableVehicles: (start: string, end: string) =>
    ["provider", "availability", "vehicles", start, end] as const,
  availableEmployees: (start: string, end: string, role: EmployeeRole) =>
    ["provider", "availability", "employees", start, end, role] as const,
};

export function fetchProviderBookings(filters: BookingFilters): Promise<Booking[]> {
  return providerGet(
    `/provider/bookings${buildQuery({
      status: filters.status,
      service_type: filters.serviceType,
      employee_id: filters.employeeId,
      limit: filters.limit,
      offset: 0,
    })}`,
  );
}

export function fetchProviderBooking(bookingId: string): Promise<Booking> {
  return providerGet(`/bookings/${bookingId}`);
}

export function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  note: string | null,
): Promise<Booking> {
  return providerPatch(`/provider/bookings/${bookingId}/status`, { status, note });
}

export function assignBookingResources(
  bookingId: string,
  payload: AssignResourcesPayload,
): Promise<Booking> {
  return providerPost(`/provider/bookings/${bookingId}/assign-resources`, payload);
}

export function fetchAvailableVehicles(
  startDatetime: string,
  endDatetime: string,
): Promise<AvailableVehicle[]> {
  return providerGet(
    `/availability/vehicles${buildQuery({
      start_datetime: startDatetime,
      end_datetime: endDatetime,
    })}`,
  );
}

export function fetchAvailableEmployees(
  startDatetime: string,
  endDatetime: string,
  role: EmployeeRole,
): Promise<AvailableEmployee[]> {
  return providerGet(
    `/provider/employees/availability${buildQuery({
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      role,
    })}`,
  );
}

function fetchProviderHandover(bookingId: string): Promise<HandoverDetails> {
  return providerGet(`/bookings/${bookingId}/handover`);
}

/** A missing handover record is an expected state, not an error. */
export async function fetchProviderHandoverOrNull(
  bookingId: string,
): Promise<HandoverDetails | null> {
  try {
    return await fetchProviderHandover(bookingId);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw error;
  }
}

export function saveProviderHandover(
  bookingId: string,
  payload: HandoverPayload,
): Promise<HandoverDetails> {
  return providerPost(`/bookings/${bookingId}/handover`, payload);
}
