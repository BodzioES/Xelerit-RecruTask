import { apiPost } from "@/services/apiClient";
import type { ProviderLoginResponse, ProviderProfile } from "@/types/api";

import { providerGet } from "../apiClient";
import { storeProviderToken } from "./session";

export const providerAuthKeys = {
  me: ["provider", "me"] as const,
};

export async function loginProvider(
  email: string,
  password: string,
): Promise<ProviderProfile> {
  const response = await apiPost<ProviderLoginResponse>("/auth/login", { email, password });
  storeProviderToken(response.access_token);
  return response.user;
}

export function fetchProviderProfile(): Promise<ProviderProfile> {
  return providerGet<ProviderProfile>("/auth/me");
}
