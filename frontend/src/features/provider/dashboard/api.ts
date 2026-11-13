import type { ProviderDashboard } from "@/types/api";

import { providerGet } from "../apiClient";

export const dashboardKeys = {
  overview: ["provider", "dashboard"] as const,
};

export function fetchProviderDashboard(): Promise<ProviderDashboard> {
  return providerGet<ProviderDashboard>("/provider/dashboard");
}
