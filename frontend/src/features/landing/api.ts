import { apiGet } from "@/services/apiClient";
import type { PricingRule } from "@/types/api";

export const landingKeys = {
  rates: ["pricing", "rules"] as const,
};

export function fetchPublishedRates(): Promise<PricingRule[]> {
  return apiGet("/pricing/rules");
}
