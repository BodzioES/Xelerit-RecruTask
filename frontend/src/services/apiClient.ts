const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  readonly status: number;
  readonly fieldErrors: FieldErrors;

  constructor(status: number, message: string, fieldErrors: FieldErrors = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type ValidationDetail = {
  loc?: unknown;
  msg?: unknown;
};

function parseError(status: number, body: unknown): ApiError {
  if (typeof body === "object" && body !== null && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") {
      return new ApiError(status, detail);
    }
    if (Array.isArray(detail)) {
      const fieldErrors: FieldErrors = {};
      const messages: string[] = [];
      for (const entry of detail as ValidationDetail[]) {
        if (typeof entry !== "object" || entry === null) continue;
        const message = String(entry.msg ?? "").replace(/^Value error, /, "");
        if (!message) continue;
        messages.push(message);
        const field = Array.isArray(entry.loc)
          ? [...entry.loc].reverse().find((part) => typeof part === "string")
          : undefined;
        if (typeof field === "string" && !fieldErrors[field]) {
          fieldErrors[field] = message;
        }
      }
      return new ApiError(
        status,
        messages[0] ?? "The request could not be completed.",
        fieldErrors,
      );
    }
  }
  return new ApiError(status, `The request failed with status ${status}.`);
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = undefined;
    }
    throw parseError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function buildQuery(
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function apiGet<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, method: "GET" });
}

export function apiPost<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiPatch<T>(path: string, body?: unknown, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    ...init,
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

export function apiDelete<T = void>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, { ...init, method: "DELETE" });
}
