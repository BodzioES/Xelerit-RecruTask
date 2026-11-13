import { ApiError } from "@/services/apiClient";

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return "The server could not be reached. Check your connection and try again.";
}

export function isUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
}

export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404;
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
