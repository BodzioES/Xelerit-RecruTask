const TOKEN_KEY = "janusztrans.provider.token";

/** sessionStorage keeps the provider token out of the shared customer client. */
export function readProviderToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeProviderToken(token: string): void {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage can be blocked; the session then lasts until the page reloads.
  }
}

export function clearProviderToken(): void {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nothing to clean up when storage is unavailable.
  }
}
