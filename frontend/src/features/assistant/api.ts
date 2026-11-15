import { apiGet, apiPost } from "@/services/apiClient";
import type { PropertyType } from "@/types/api";

export type AssistedService = "van_driver" | "full_moving";

export type MovePlan = {
  suggested_service: AssistedService | null;
  property_type: PropertyType | null;
  floor: number | null;
  has_elevator: boolean | null;
  boxes_count: number | null;
  helpers: number | null;
  items: { name: string; quantity: number }[];
  summary: string;
};

export const assistantKeys = {
  status: ["assistant", "status"] as const,
};

export function fetchAssistantStatus(): Promise<{ enabled: boolean }> {
  return apiGet("/assistant/status");
}

export function requestMovePlan(
  description: string,
  serviceType: AssistedService,
): Promise<MovePlan> {
  return apiPost("/assistant/move-plan", { description, service_type: serviceType });
}
