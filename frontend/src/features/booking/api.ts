import { apiGet, apiPatch, apiPost, buildQuery } from "@/services/apiClient";
import type {
  AvailableEmployee,
  AvailableVehicle,
  Booking,
  BookingCreated,
  EmployeeRole,
  HandoverDetails,
  Quote,
} from "@/types/api";

import type { CreateBookingRequest, QuoteRequest } from "./types";

export const bookingKeys = {
  vehicles: (startDatetime: string, endDatetime: string) =>
    ["availability", "vehicles", startDatetime, endDatetime] as const,
  employees: (startDatetime: string, endDatetime: string, role: EmployeeRole) =>
    ["availability", "employees", startDatetime, endDatetime, role] as const,
  quote: (request: QuoteRequest) => ["pricing", "quote", request] as const,
  detail: (bookingId: string, token: string) => ["bookings", bookingId, token] as const,
  handover: (bookingId: string, token: string) =>
    ["bookings", bookingId, "handover", token] as const,
};

export function fetchAvailableVehicles(
  startDatetime: string,
  endDatetime: string,
): Promise<AvailableVehicle[]> {
  return apiGet(
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
  return apiGet(
    `/availability/employees${buildQuery({
      start_datetime: startDatetime,
      end_datetime: endDatetime,
      role,
    })}`,
  );
}

export function fetchQuote(request: QuoteRequest): Promise<Quote> {
  return apiPost("/pricing/quote", request);
}

export function createBooking(request: CreateBookingRequest): Promise<BookingCreated> {
  return apiPost("/bookings", request);
}

export function fetchBooking(bookingId: string, token: string): Promise<Booking> {
  return apiGet(`/bookings/${bookingId}`, {
    headers: { "X-Booking-Token": token },
  });
}

export function cancelBooking(
  bookingId: string,
  token: string,
  reason: string | null,
): Promise<Booking> {
  return apiPatch(
    `/bookings/${bookingId}/cancel`,
    reason ? { reason } : {},
    { headers: { "X-Booking-Token": token } },
  );
}

export function fetchHandover(bookingId: string, token: string): Promise<HandoverDetails> {
  return apiGet(`/bookings/${bookingId}/handover`, {
    headers: { "X-Booking-Token": token },
  });
}

export function bookingTokenStorageKey(bookingId: string): string {
  return `moveit.booking.${bookingId}.token`;
}

export function rememberBookingToken(bookingId: string, token: string): void {
  try {
    window.sessionStorage.setItem(bookingTokenStorageKey(bookingId), token);
  } catch {
    // Storage can be unavailable in private mode; the URL still carries the token.
  }
}

export function recallBookingToken(bookingId: string): string | null {
  try {
    return window.sessionStorage.getItem(bookingTokenStorageKey(bookingId));
  } catch {
    return null;
  }
}
