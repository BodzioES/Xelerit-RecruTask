import { ApiError, apiDelete, apiGet, apiPatch, apiPost } from "@/services/apiClient";

import { clearProviderToken, readProviderToken } from "./auth/session";

/** Fired when the API rejects the stored token, so the guard can ask for a login. */
export const PROVIDER_SESSION_EXPIRED_EVENT = "janusztrans:provider-session-expired";

function authHeaders(): Record<string, string> {
  const token = readProviderToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function authorized<T>(
  call: (headers: Record<string, string>) => Promise<T>,
): Promise<T> {
  try {
    return await call(authHeaders());
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearProviderToken();
      window.dispatchEvent(new Event(PROVIDER_SESSION_EXPIRED_EVENT));
    }
    throw error;
  }
}

export function providerGet<T>(path: string): Promise<T> {
  return authorized((headers) => apiGet<T>(path, { headers }));
}

export function providerPost<T>(path: string, body?: unknown): Promise<T> {
  return authorized((headers) => apiPost<T>(path, body, { headers }));
}

export function providerPatch<T>(path: string, body?: unknown): Promise<T> {
  return authorized((headers) => apiPatch<T>(path, body, { headers }));
}

export function providerDelete(path: string): Promise<void> {
  return authorized((headers) => apiDelete<void>(path, { headers }));
}
