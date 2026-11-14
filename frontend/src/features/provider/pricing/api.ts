import type { PricingRule, ServiceType } from "@/types/api";

import { providerGet, providerPatch } from "../apiClient";

export type PricingRuleUpdate = {
  base_price: string;
  hourly_rate: string;
  daily_rate: string;
  price_per_km: string;
  helper_rate: string;
  floor_surcharge: string;
  no_elevator_surcharge: string;
  additional_service_price: string;
  min_duration_hours: number;
};

export const pricingRuleKeys = {
  list: ["provider", "pricing-rules"] as const,
};

export function fetchPricingRules(): Promise<PricingRule[]> {
  return providerGet("/provider/pricing-rules");
}

export function updatePricingRule(
  serviceType: ServiceType,
  input: PricingRuleUpdate,
): Promise<PricingRule> {
  return providerPatch(`/provider/pricing-rules/${serviceType}`, input);
}
