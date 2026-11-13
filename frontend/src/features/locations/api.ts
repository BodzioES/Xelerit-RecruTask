import { apiGet, apiPost, buildQuery } from "@/services/apiClient";
import type { LocationSuggestion, ServiceAreaStatus } from "@/types/api";

export const locationKeys = {
  search: (query: string) => ["locations", "search", query] as const,
};

export function searchLocations(query: string): Promise<LocationSuggestion[]> {
  return apiGet(`/locations/search${buildQuery({ q: query, limit: 5 })}`);
}

export function reverseLocation(
  latitude: number,
  longitude: number,
): Promise<LocationSuggestion> {
  return apiGet(`/locations/reverse${buildQuery({ lat: latitude, lng: longitude })}`);
}

export function validateLocation(
  latitude: number,
  longitude: number,
): Promise<ServiceAreaStatus> {
  return apiPost("/locations/validate", { latitude, longitude });
}
